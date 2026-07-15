-- Alfredo: ownership por UUID, gravação recuperável e integrações genéricas.
alter table public.meetings add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.transcription_jobs add column if not exists owner_id uuid references auth.users(id) on delete cascade;

update public.meetings m set owner_id = u.id from auth.users u
where m.owner_id is null and lower(m.created_by) = lower(u.email);
update public.transcription_jobs j set owner_id = u.id from auth.users u
where j.owner_id is null and lower(j.created_by) = lower(u.email);

drop policy if exists "meetings_select_own" on public.meetings;
drop policy if exists "meetings_insert_own" on public.meetings;
drop policy if exists "meetings_update_own" on public.meetings;
drop policy if exists "meetings_delete_own" on public.meetings;
create policy "meetings_select_owner" on public.meetings for select to authenticated using (owner_id = auth.uid() or public.is_app_admin());
create policy "meetings_insert_owner" on public.meetings for insert to authenticated with check (owner_id = auth.uid());
create policy "meetings_update_owner" on public.meetings for update to authenticated using (owner_id = auth.uid() or public.is_app_admin()) with check (owner_id = auth.uid() or public.is_app_admin());
create policy "meetings_delete_owner" on public.meetings for delete to authenticated using (owner_id = auth.uid() or public.is_app_admin());

drop policy if exists "transcription_jobs_select_own" on public.transcription_jobs;
drop policy if exists "transcription_jobs_insert_own" on public.transcription_jobs;
drop policy if exists "transcription_jobs_update_own" on public.transcription_jobs;
drop policy if exists "transcription_jobs_delete_own" on public.transcription_jobs;
create policy "transcription_jobs_select_owner" on public.transcription_jobs for select to authenticated using (owner_id = auth.uid() or public.is_app_admin());

create table if not exists public.recording_sessions (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  status text not null default 'recording' check (status in ('recording','uploading','uploaded','queued','processing','completed','interrupted','failed','cancelled')),
  mime_type text,
  duration_seconds integer not null default 0,
  total_chunks integer not null default 0,
  confirmed_chunks integer not null default 0,
  total_bytes bigint not null default 0,
  final_storage_path text,
  last_heartbeat_at timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recording_chunks (
  id text primary key,
  session_id text not null references public.recording_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence integer not null,
  size_bytes bigint not null,
  checksum text,
  storage_path text,
  upload_status text not null default 'local' check (upload_status in ('local','uploading','uploaded','failed')),
  attempts integer not null default 0,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(session_id, sequence)
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'webhook' check (kind in ('webhook','rest','api_key')),
  endpoint_url text,
  encrypted_secret text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default array['meetings:read'],
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  if to_regclass('public.suiter_config') is not null and to_regclass('public.integration_config') is null then
    alter table public.suiter_config rename to integration_config;
  end if;
  if to_regclass('public.suiter_logs') is not null and to_regclass('public.integration_logs') is null then
    alter table public.suiter_logs rename to integration_logs;
  end if;
end $$;

alter table public.recording_sessions enable row level security;
alter table public.recording_chunks enable row level security;
alter table public.integrations enable row level security;
alter table public.api_keys enable row level security;

create policy "recording_sessions_own" on public.recording_sessions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "recording_chunks_own" on public.recording_chunks for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "integrations_own" on public.integrations for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "api_keys_own" on public.api_keys for select to authenticated using (owner_id = auth.uid());

create index if not exists recording_chunks_session_sequence_idx on public.recording_chunks(session_id, sequence);
create index if not exists recording_sessions_owner_status_idx on public.recording_sessions(owner_id, status);
