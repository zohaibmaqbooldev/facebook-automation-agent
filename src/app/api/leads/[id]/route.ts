import { z } from "zod";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ status: z.enum(["new", "reviewed", "contacted", "replied", "won", "lost"]), next_action: z.string().trim().max(500).nullable().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Lead update is invalid." }, { status: 400 });
  const { data, error } = await db.from("client_leads").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id).select("id,status,next_action").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update lead." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ lead: data });
}
