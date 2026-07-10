-- Metadados de áudio / Google Calendar nas reuniões
alter table public.meetings add column if not exists google_calendar_event_id text;
alter table public.meetings add column if not exists has_audio boolean not null default false;
alter table public.meetings add column if not exists audio_storage_path text;
alter table public.meetings add column if not exists audio_size_bytes integer;
