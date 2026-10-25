import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptSecret, validSignature } from "@/lib/security";
import { listManagedPages, MetaApiError, readGrantedPermissions } from "@/lib/meta";
import { matchesOAuthState, parseOAuthState } from "@/lib/meta-oauth.mjs";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const STATE_COOKIE = "meta_oauth_nonce";

type CallbackResult = "connected" | "no_pages" | "permissions_missing" | "oauth_denied" | "invalid_state" | "not_configured" | "graph_error" | "save_failed";

function dashboardRedirect(request: Request, result: CallbackResult, diagnosticId?: string) {
  const target = new URL("/dashboard", request.url);
  target.searchParams.set("meta", result);
  if (diagnosticId) target.searchParams.set("diagnostic", diagnosticId);
  return NextResponse.redirect(target);
}

function projectRef() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function logDiagnostic(event: string, diagnosticId: string, details: Record<string, string | number | null> = {}) {
  // Deliberately log no user IDs, Page names/IDs, OAuth codes, tokens, URLs, or error messages.
  console.info("[meta-oauth]", { event, diagnosticId, projectRef: projectRef(), ...details });
}

export async function GET(request: Request) {
  const diagnosticId = randomUUID();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = parseOAuthState(url.searchParams.get("state"));
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieNonce = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim()).find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.slice(`${STATE_COOKIE}=`.length);

  let result: NextResponse;
  if (url.searchParams.has("error")) {
    logDiagnostic("authorization_denied", diagnosticId);
    result = dashboardRedirect(request, "oauth_denied", diagnosticId);
  } else if (!code || !user || !matchesOAuthState(state, user.id, cookieNonce) || !process.env.META_APP_SECRET || !validSignature(`${state!.userId}.${state!.nonce}`, state!.signature)) {
    logDiagnostic("callback_state_rejected", diagnosticId, { hasCode: Number(Boolean(code)), hasSession: Number(Boolean(user)) });
    result = dashboardRedirect(request, "invalid_state", diagnosticId);
  } else if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.META_REDIRECT_URI || !process.env.APP_ENCRYPTION_KEY) {
    logDiagnostic("server_configuration_missing", diagnosticId);
    result = dashboardRedirect(request, "not_configured", diagnosticId);
  } else {
    let stage: "token_exchange" | "pages_lookup" | "permission_check" | "database_save" | "save_verification" = "token_exchange";
    try {
      const graphVersion = process.env.META_GRAPH_API_VERSION || "v26.0";
      const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
      tokenUrl.searchParams.set("client_id", process.env.META_APP_ID);
      tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET);
      tokenUrl.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI);
      tokenUrl.searchParams.set("code", code);

      const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        logDiagnostic("token_exchange_failed", diagnosticId, { httpStatus: tokenResponse.status, metaCode: tokenData.error?.code ?? null });
        result = dashboardRedirect(request, "graph_error", diagnosticId);
      } else {
        logDiagnostic("token_exchange_succeeded", diagnosticId, { graphVersion });

        stage = "pages_lookup";
        const pages = await listManagedPages(tokenData.access_token);
        if (!Array.isArray(pages.data)) {
          logDiagnostic("pages_response_invalid", diagnosticId);
          result = dashboardRedirect(request, "graph_error", diagnosticId);
        } else if (pages.data.length === 0) {
          logDiagnostic("pages_lookup_complete", diagnosticId, { pageCount: 0 });
          stage = "permission_check";
          const permissions = await readGrantedPermissions(tokenData.access_token);
          const pagesShowListStatus = permissions.data?.find((item) => item.permission === "pages_show_list")?.status || "missing";
          logDiagnostic("pages_permission_checked", diagnosticId, { pagesShowListStatus });
          result = dashboardRedirect(request, pagesShowListStatus === "granted" ? "no_pages" : "permissions_missing", diagnosticId);
        } else if (pages.data.some((page) => !page.id || !page.name || !page.access_token)) {
          logDiagnostic("pages_response_missing_required_fields", diagnosticId, { pageCount: pages.data.length });
          result = dashboardRedirect(request, "graph_error", diagnosticId);
        } else {
          logDiagnostic("pages_lookup_complete", diagnosticId, { pageCount: pages.data.length });
          const rows = pages.data.map((page) => ({
            user_id: user.id,
            page_id: page.id,
            page_name: page.name,
            encrypted_access_token: encryptSecret(page.access_token),
            granted_tasks: page.tasks || [],
            connection_status: "connected" as const,
            disconnected_at: null,
          }));
          const pageIds = rows.map((page) => page.page_id);

          stage = "database_save";
          const { error } = await supabase.from("connected_facebook_pages").upsert(rows, { onConflict: "user_id,page_id" });
          if (error) {
            logDiagnostic("database_save_failed", diagnosticId, { databaseCode: error.code || null, pageCount: rows.length });
            result = dashboardRedirect(request, "save_failed", diagnosticId);
          } else {
            stage = "save_verification";
            const { data: savedPages, error: verifyError } = await supabase
              .from("connected_facebook_pages")
              .select("page_id")
              .eq("user_id", user.id)
              .in("page_id", pageIds);
            if (verifyError || (savedPages?.length ?? 0) !== pageIds.length) {
              logDiagnostic("database_save_verification_failed", diagnosticId, {
                databaseCode: verifyError?.code || null,
                expectedCount: pageIds.length,
                savedCount: savedPages?.length ?? 0,
              });
              result = dashboardRedirect(request, "save_failed", diagnosticId);
            } else {
              logDiagnostic("database_save_verified", diagnosticId, { savedCount: savedPages.length });
              result = dashboardRedirect(request, "connected", diagnosticId);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof MetaApiError) {
        logDiagnostic("graph_api_failed", diagnosticId, { stage, httpStatus: error.status, metaCode: error.code ?? null });
        result = dashboardRedirect(request, "graph_error", diagnosticId);
      } else {
        logDiagnostic("connection_stage_failed", diagnosticId, {
          stage,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        result = dashboardRedirect(request, stage === "database_save" || stage === "save_verification" ? "save_failed" : "graph_error", diagnosticId);
      }
    }
  }

  result.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", path: "/api/meta/callback", maxAge: 0 });
  return result;
}
