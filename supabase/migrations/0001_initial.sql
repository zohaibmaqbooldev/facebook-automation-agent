create extension if not exists pgcrypto;
create table if not exists public.connected_facebook_pages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 page_id text not null, page_name text not null, encrypted_access_token text not null, granted_tasks text[] not null default '{}', connection_status text not null default 'connected' check(connection_status in ('connected','disconnected')), disconnected_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,page_id)
);
alter table public.connected_facebook_pages add column if not exists connection_status text not null default 'connected' check(connection_status in ('connected','disconnected'));
alter table public.connected_facebook_pages add column if not exists disconnected_at timestamptz;
create table if not exists public.user_settings (
 user_id uuid primary key references auth.users(id) on delete cascade, reactions_enabled boolean not null default false,
 auto_comment_replies boolean not null default false, publishing_paused boolean not null default false, engagement_paused boolean not null default true,
 selected_topics text[] not null default '{}', approved_sources text[] not null default '{}', daily_activity_limit int not null default 5 check(daily_activity_limit between 0 and 30), min_action_interval_seconds int not null default 300 check(min_action_interval_seconds between 60 and 86400), updated_at timestamptz not null default now()
);
create table if not exists public.generated_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 caption text not null, hashtags text[] not null default '{}', topic text, image_brief text, channel text not null default 'page' check(channel in ('page','personal_queue')), manual_post_url text, status text not null default 'draft' check(status in ('draft','queued','scheduled','published','failed','manual_published')),
 scheduled_at timestamptz, published_at timestamptz, page_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.generated_images (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid references public.generated_posts(id) on delete set null, storage_path text not null, mime_type text not null, created_at timestamptz not null default now()
);
create table if not exists public.scheduled_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, post_id uuid not null references public.generated_posts(id) on delete cascade,
 page_id text not null, run_at timestamptz not null, status text not null default 'pending' check(status in ('pending','processing','published','failed','cancelled')),
 external_id text, error_message text, created_at timestamptz not null default now(), unique(post_id)
);
create table if not exists public.engagement_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 external_comment_id text, action text not null check(action in ('read','reply','reaction','suggestion')), status text not null check(status in ('pending','success','failed','skipped')),
 details jsonb not null default '{}', external_result_id text, error_message text, created_at timestamptz not null default now()
);
create unique index if not exists engagement_one_reply_per_comment on public.engagement_events(user_id,external_comment_id,action) where action='reply' and status in ('pending','success');
create index if not exists scheduled_due_idx on public.scheduled_jobs(status,run_at) where status='pending';
create table if not exists public.publishing_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, page_id text,
 action text not null, status text not null check(status in ('success','failed')), external_id text, error_message text, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.connected_facebook_pages enable row level security;
alter table public.user_settings enable row level security;
alter table public.generated_posts enable row level security;
alter table public.generated_images enable row level security;
alter table public.scheduled_jobs enable row level security;
alter table public.engagement_events enable row level security;
alter table public.publishing_logs enable row level security;
alter table public.audit_logs enable row level security;
do $$ declare t text; begin foreach t in array array['connected_facebook_pages','user_settings','generated_posts','generated_images','scheduled_jobs','engagement_events','publishing_logs','audit_logs'] loop
 execute format('drop policy if exists owner_all on public.%I',t);
 execute format('create policy owner_all on public.%I for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid())',t);
end loop; end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('post-images','post-images',false,10485760,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
drop policy if exists post_images_owner on storage.objects;
create policy post_images_owner on storage.objects for all to authenticated using (bucket_id='post-images' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='post-images' and (storage.foldername(name))[1]=auth.uid()::text);
