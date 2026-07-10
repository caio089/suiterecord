-- Isolamento multi-tenant (SaaS): cada usuário só acessa os próprios dados.
-- Admin (role = 'Administrador' em permitted_users) pode gerenciar tudo.

-- Helpers
create or replace function public.request_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.permitted_users pu
    where lower(pu.email) = public.request_email()
      and pu.role = 'Administrador'
  );
$$;

revoke all on function public.request_email() from public;
revoke all on function public.is_app_admin() from public;
grant execute on function public.request_email() to authenticated;
grant execute on function public.is_app_admin() to authenticated;

-- Remove políticas abertas (anon/authenticated com using true)
drop policy if exists "meetings_anon_all" on public.meetings;
drop policy if exists "permitted_users_anon_all" on public.permitted_users;
drop policy if exists "suiter_config_anon_all" on public.suiter_config;
drop policy if exists "suiter_logs_anon_all" on public.suiter_logs;

-- Garante RLS ativo
alter table public.meetings enable row level security;
alter table public.permitted_users enable row level security;
alter table public.suiter_config enable row level security;
alter table public.suiter_logs enable row level security;

alter table public.meetings force row level security;
alter table public.permitted_users force row level security;
alter table public.suiter_config force row level security;
alter table public.suiter_logs force row level security;

-- ---------- meetings ----------
drop policy if exists "meetings_select_own" on public.meetings;
drop policy if exists "meetings_insert_own" on public.meetings;
drop policy if exists "meetings_update_own" on public.meetings;
drop policy if exists "meetings_delete_own" on public.meetings;

create policy "meetings_select_own" on public.meetings
  for select to authenticated
  using (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  );

create policy "meetings_insert_own" on public.meetings
  for insert to authenticated
  with check (
    lower(coalesce(created_by, '')) = public.request_email()
  );

create policy "meetings_update_own" on public.meetings
  for update to authenticated
  using (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  )
  with check (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  );

create policy "meetings_delete_own" on public.meetings
  for delete to authenticated
  using (
    lower(coalesce(created_by, '')) = public.request_email()
    or public.is_app_admin()
  );

-- ---------- permitted_users (perfil) ----------
drop policy if exists "permitted_users_select_own" on public.permitted_users;
drop policy if exists "permitted_users_insert_own" on public.permitted_users;
drop policy if exists "permitted_users_update_own" on public.permitted_users;
drop policy if exists "permitted_users_delete_admin" on public.permitted_users;

create policy "permitted_users_select_own" on public.permitted_users
  for select to authenticated
  using (
    lower(email) = public.request_email()
    or public.is_app_admin()
  );

-- Signup: usuário autenticado só cria o próprio perfil (não pode se auto-promover a admin).
-- Admin pode inserir perfis de outros colaboradores.
create policy "permitted_users_insert_own" on public.permitted_users
  for insert to authenticated
  with check (
    public.is_app_admin()
    or (
      lower(email) = public.request_email()
      and coalesce(role, 'user') <> 'Administrador'
    )
  );

create policy "permitted_users_update_own" on public.permitted_users
  for update to authenticated
  using (
    lower(email) = public.request_email()
    or public.is_app_admin()
  )
  with check (
    (
      lower(email) = public.request_email()
      and (role is null or role <> 'Administrador' or public.is_app_admin())
    )
    or public.is_app_admin()
  );

create policy "permitted_users_delete_admin" on public.permitted_users
  for delete to authenticated
  using (public.is_app_admin());

-- ---------- suiter_config / suiter_logs (só admin) ----------
drop policy if exists "suiter_config_admin_all" on public.suiter_config;
drop policy if exists "suiter_logs_admin_all" on public.suiter_logs;

create policy "suiter_config_admin_all" on public.suiter_config
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "suiter_logs_admin_all" on public.suiter_logs
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- Revoga acesso amplo de anon (API pública sem login)
revoke all on table public.meetings from anon;
revoke all on table public.permitted_users from anon;
revoke all on table public.suiter_config from anon;
revoke all on table public.suiter_logs from anon;

grant select, insert, update, delete on table public.meetings to authenticated;
grant select, insert, update, delete on table public.permitted_users to authenticated;
grant select, insert, update, delete on table public.suiter_config to authenticated;
grant select, insert, update, delete on table public.suiter_logs to authenticated;
