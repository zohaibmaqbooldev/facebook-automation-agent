import { z } from "zod";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({
  client_name: z.string().trim().min(1).max(160),
  source: z.string().trim().min(1).max(80).default("Manual"),
  source_url: z.string().url().max(2000),
  opportunity_description: z.string().trim().max(5000).default(""),
  opportunity_type: z.enum(["job", "freelance", "agency", "client"]).default("client"),
  location: z.string().trim().max(160).optional(),
  work_mode: z.enum(["remote", "onsite", "hybrid", "unknown"]).default("unknown"),
  budget: z.string().trim().max(120).optional(),
});

export async function GET() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const { data, error } = await db.from("client_leads").select("*").order("date_found", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load saved leads. Apply the latest Supabase migration." }, { status: 503 });
  return NextResponse.json({ leads: data });
}

export async function POST(request: Request) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Lead details are invalid." }, { status: 400 });
  const url = new URL(parsed.data.source_url);
  if (url.protocol !== "https:" && url.protocol !== "http:") return NextResponse.json({ error: "Lead URL must use HTTP or HTTPS." }, { status: 400 });
  const { data, error } = await db.from("client_leads").upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id,source_url", ignoreDuplicates: true }).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save lead. Apply the latest Supabase migration." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "This source URL is already saved." }, { status: 409 });
  return NextResponse.json({ lead: data }, { status: 201 });
}
