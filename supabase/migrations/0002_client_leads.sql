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

-- Remotive recommends no more than four public API searches per day.
-- This atomic six-hour claim also prevents concurrent clicks from bypassing the cooldown.
create table if not exists public.job_search_limiter (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_search_at timestamptz not null
);
alter table public.job_search_limiter enable row level security;
revoke all on public.job_search_limiter from anon, authenticated;
create or replace function public.claim_job_search() returns boolean
language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.job_search_limiter(user_id,last_search_at)
    values(auth.uid(),now())
    on conflict(user_id) do update set last_search_at=excluded.last_search_at
      where public.job_search_limiter.last_search_at <= now() - interval '6 hours';
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.claim_job_search() from public, anon;
grant execute on function public.claim_job_search() to authenticated;
