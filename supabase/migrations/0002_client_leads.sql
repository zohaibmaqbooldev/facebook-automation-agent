create table if not exists public.client_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  source text not null default 'Manual',
  source_url text not null,
  opportunity_description text not null default '',
  opportunity_type text not null default 'client' check (opportunity_type in ('job','freelance','agency','client')),
  location text,
  work_mode text not null default 'unknown' check (work_mode in ('remote','onsite','hybrid','unknown')),
  budget text,
  date_found timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','reviewed','contacted','replied','won','lost')),
  next_action text,
  proposal_draft text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_url)
);
create index if not exists client_leads_user_status_idx on public.client_leads(user_id,status,date_found desc);
alter table public.client_leads enable row level security;
drop policy if exists client_leads_owner_all on public.client_leads;
create policy client_leads_owner_all on public.client_leads for all to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());
