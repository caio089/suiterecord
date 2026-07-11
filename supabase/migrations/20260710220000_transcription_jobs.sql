-- Jobs de transcrição (estado fora da memória do container)
-- Etapa 1 da arquitetura híbrida: Vercel (front) + API worker + Supabase

create table if not exists public.transcription_jobs (
  id text primary key,
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'processing', 'transcribing', 'completed', 'failed')),
  progress_message text,
  result jsonb,
  error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours')
);

create index if not exists transcription_jobs_status_idx
  on public.transcription_jobs (status);

create index if not exists transcription_jobs_created_by_idx
  on public.transcription_jobs (created_by);

create index if not exists transcription_jobs_expires_at_idx
  on public.transcription_jobs (expires_at);

drop trigger if exists transcription_jobs_set_updated_at on public.transcription_jobs;
create trigger transcription_jobs_set_updated_at
  before update on public.transcription_jobs
  for each row execute function public.set_updated_at();

alter table public.transcription_jobs enable row level security;

-- Jobs são lidos/escritos pela API (service role). Client autenticado só lê os próprios.
drop policy if exists "transcription_jobs_select_own" on public.transcription_jobs;
create policy "transcription_jobs_select_own" on public.transcription_jobs
  for select to authenticated
  using (
    created_by is not null
    and lower(created_by) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Sem insert/update/delete para anon/authenticated via Data API (só service role / API)
