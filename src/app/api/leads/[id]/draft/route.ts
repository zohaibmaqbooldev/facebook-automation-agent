import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateLeadOutreach } from "@/lib/ai";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const { id } = await params;
  const { data: lead, error } = await db.from("client_leads").select("client_name,source,opportunity_description,opportunity_type").eq("id", id).maybeSingle();
  if (error || !lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  try {
    const draft = await generateLeadOutreach(lead);
    const { error: updateError } = await db.from("client_leads").update({ proposal_draft: draft, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) throw updateError;
    return NextResponse.json({ draft, sent: false, requiresManualApproval: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proposal draft failed." }, { status: 502 });
  }
}
