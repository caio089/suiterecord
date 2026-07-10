-- Suiter Record — schema inicial (substitui Firestore)

create extension if not exists "pgcrypto";

create table public.meetings (
  id text primary key,
  title text not null,
  date text not null,
  duration integer not null default 0,
  transcript text not null default '',
  overview text not null default '',
  topics jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  participants jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_created_by_idx on public.meetings (created_by);
create index meetings_date_idx on public.meetings (date desc);

create table public.permitted_users (
  id text primary key,
  name text not null,
  email text not null unique,
  photo text,
  photo_url text,
  role text not null default 'user',
  password text,
  google_calendar_linked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index permitted_users_email_idx on public.permitted_users (lower(email));

create table public.suiter_config (
  id text primary key default 'default',
  api_url text not null default '',
  token text not null default '',
  is_mock boolean not null default true,
  mapping text not null default 'standard',
  updated_at timestamptz not null default now()
);

create table public.suiter_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  meeting_title text not null default '',
  status text not null check (status in ('success', 'error')),
  simulated boolean not null default false,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index suiter_logs_timestamp_idx on public.suiter_logs (timestamp desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

create trigger permitted_users_set_updated_at
  before update on public.permitted_users
  for each row execute function public.set_updated_at();

create trigger suiter_config_set_updated_at
  before update on public.suiter_config
  for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
alter table public.permitted_users enable row level security;
alter table public.suiter_config enable row level security;
alter table public.suiter_logs enable row level security;

create policy "meetings_anon_all" on public.meetings
  for all to anon, authenticated using (true) with check (true);

create policy "permitted_users_anon_all" on public.permitted_users
  for all to anon, authenticated using (true) with check (true);

create policy "suiter_config_anon_all" on public.suiter_config
  for all to anon, authenticated using (true) with check (true);

create policy "suiter_logs_anon_all" on public.suiter_logs
  for all to anon, authenticated using (true) with check (true);
