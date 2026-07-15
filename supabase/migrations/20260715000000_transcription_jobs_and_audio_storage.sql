-- Fila de transcrição durável (substitui o objeto em memória do server, que não
-- sobrevive entre invocações de função serverless) + bucket de áudio no Storage
-- (o cliente sobe o áudio direto pro Storage, sem passar pelo corpo da função
-- de API, que na Vercel tem limite de 4.5 MB por requisição).

create table public.transcription_jobs (
  id text primary key,
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'processing', 'transcribing', 'completed', 'failed')),
  progress_message text,
  storage_path text,
  mime_type text,
  result jsonb,
  error text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transcription_jobs_created_by_idx on public.transcription_jobs (created_by);
create index transcription_jobs_created_at_idx on public.transcription_jobs (created_at desc);

create trigger transcription_jobs_set_updated_at
  before update on public.transcription_jobs
  for each row execute function public.set_updated_at();

alter table public.transcription_jobs enable row level security;
alter table public.transcription_jobs force row level security;

-- Dono do job vê/gerencia o próprio; admin vê tudo (mesmo padrão de public.meetings).
create policy "transcription_jobs_select_own" on public.transcription_jobs
  for select to authenticated
  using (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  );

create policy "transcription_jobs_insert_own" on public.transcription_jobs
  for insert to authenticated
  with check (
    lower(coalesce(created_by, '')) = public.request_email()
  );

create policy "transcription_jobs_update_own" on public.transcription_jobs
  for update to authenticated
  using (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  )
  with check (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  );

create policy "transcription_jobs_delete_own" on public.transcription_jobs
  for delete to authenticated
  using (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  );

revoke all on table public.transcription_jobs from anon;
grant select, insert, update, delete on table public.transcription_jobs to authenticated;

-- ---------- Storage: bucket privado para os áudios originais ----------
-- Convenção de caminho: audio-recordings/{email-do-usuário}/{recordingId}.{ext}
-- O servidor usa a service role key (bypassa RLS) para ler qualquer objeto;
-- o cliente usa a sessão do usuário e só enxerga/mexe na própria pasta.

insert into storage.buckets (id, name, public)
values ('audio-recordings', 'audio-recordings', false)
on conflict (id) do nothing;

create policy "audio_recordings_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio-recordings'
    and lower((storage.foldername(name))[1]) = public.request_email()
  );

create policy "audio_recordings_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audio-recordings'
    and lower((storage.foldername(name))[1]) = public.request_email()
  );

create policy "audio_recordings_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audio-recordings'
    and lower((storage.foldername(name))[1]) = public.request_email()
  );
