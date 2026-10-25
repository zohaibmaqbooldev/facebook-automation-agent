import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { signState } from "@/lib/security";

const STATE_COOKIE = "meta_oauth_nonce";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.META_REDIRECT_URI || !process.env.APP_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Meta OAuth is not fully configured. Check the server environment variables." }, { status: 503 });
  }

  const nonce = randomBytes(24).toString("hex");
  const state = `${user.id}.${nonce}`;
  const graphVersion = process.env.META_GRAPH_API_VERSION || "v26.0";
  const oauthUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  oauthUrl.searchParams.set("client_id", process.env.META_APP_ID);
  oauthUrl.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI);
  oauthUrl.searchParams.set("state", `${state}.${signState(state)}`);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_engagement");

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/meta/callback",
    maxAge: 600,
  });
  return response;
}
