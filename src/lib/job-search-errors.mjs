export function jobSearchLimitMessage(code) {
  if (code === "PGRST202" || code === "42883") return "Job-search setup is missing. Run supabase/migrations/0002_client_leads.sql in the intended Supabase project, then retry.";
  if (code === "42501") return "Supabase denied access to the public-search limit function. Check migration 0002 grants and authenticated-user access.";
  return "Supabase could not verify the public-search limit. Check the database connection and retry; no job search was sent.";
}
