import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AIConfigurationError, AIProviderError, generateDailyIdeas } from "@/lib/ai";
import { NextResponse } from "next/server";

const schema = z.object({ topic: z.string().trim().min(2).max(120), language: z.string().trim().min(1).max(40).optional() });

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid topic and language." }, { status: 400 });

  let ideas;
  try { ideas = await generateDailyIdeas(parsed.data.topic, parsed.data.language); }
  catch (error) {
    if (error instanceof AIConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("[content-generate] Gemini request failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: error instanceof AIProviderError ? error.message : "Gemini generation failed. Check the server configuration and try again." }, { status: 502 });
  }

  const rows = ideas.map((idea) => ({ user_id: user.id, caption: idea.caption, hashtags: idea.hashtags, topic: idea.topic, image_brief: idea.imageBrief, status: "draft" as const }));
  const { data: saved, error: saveError } = await supabase.from("generated_posts").insert(rows).select("id,caption,hashtags,topic,image_brief,status,created_at");
  if (saveError) {
    console.error("[content-generate] Supabase insert failed", { databaseCode: saveError.code || "unknown" });
    return NextResponse.json({ error: "Gemini generated drafts, but Supabase could not save them. Confirm migration 0001 and the authenticated user's owner policy." }, { status: 503 });
  }

  const ids = (saved || []).map((draft) => draft.id);
  const { data: verified, error: verifyError } = await supabase.from("generated_posts").select("id").eq("user_id", user.id).in("id", ids);
  if (verifyError || ids.length !== rows.length || (verified || []).length !== rows.length) {
    console.error("[content-generate] Supabase verification failed", { databaseCode: verifyError?.code || null, expectedCount: rows.length, savedCount: verified?.length || 0 });
    return NextResponse.json({ error: "Drafts were not verified in Supabase, so the app cannot confirm they will appear after refresh. Check migration 0001 and the owner policy." }, { status: 503 });
  }
  return NextResponse.json({ ideas, drafts: saved });
}
