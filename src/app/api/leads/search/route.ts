import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({ q: z.string().trim().max(80).default("software developer") });
type RemotiveJob = { id: number; title: string; company_name: string; url: string; description?: string; category?: string; job_type?: string; candidate_required_location?: string; salary?: string; publication_date?: string };

export async function GET(request: Request) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const parsed = querySchema.safeParse({ q: new URL(request.url).searchParams.get("q") || "software developer" });
  if (!parsed.success) return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  const { data: allowed, error: limitError } = await db.rpc("claim_job_search");
  if (limitError) return NextResponse.json({ error: "Could not verify the public-search limit. Apply the latest Supabase migration." }, { status: 503 });
  if (!allowed) return NextResponse.json({ error: "Public search is limited to one request every six hours to respect the source API guidance (maximum four per day)." }, { status: 429 });
  try {
    const url = new URL("https://remotive.com/api/remote-jobs");
    url.searchParams.set("search", parsed.data.q || "software developer");
    url.searchParams.set("limit", "20");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000), headers: { "user-agent": "FacebookAutomationAgent/1.0 (job search; Remotive attribution enabled)" } });
    if (!response.ok) throw new Error(`Remotive returned HTTP ${response.status}`);
    const body = await response.json() as { jobs?: RemotiveJob[] };
    const jobs = (body.jobs || []).filter((job) => job.url && job.company_name && job.title).map((job) => ({
      id: String(job.id), client_name: job.company_name, source: "Remotive", source_url: job.url,
      opportunity_description: `${job.title}${job.category ? ` · ${job.category}` : ""}${job.description ? `\n${job.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 2500)}` : ""}`,
      opportunity_type: "job" as const, location: job.candidate_required_location || "Remote; check employer eligibility", work_mode: "remote" as const, budget: job.salary || "Not listed", date_found: job.publication_date || new Date().toISOString(),
    }));
    return NextResponse.json({ jobs, source: "Remotive", verifiedLive: true, attribution: "Listings from Remotive; review original listing for current status and location eligibility." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `Live search unavailable: ${error.message}` : "Live search unavailable." }, { status: 502 });
  }
}
