-- Row Level Security. This is the actual enforcement layer for RBAC
-- (docs/RBAC.md): server components/actions read with the signed-in user's
-- session, so these policies are what actually stops a counselor from
-- reading another counselor's leads, not the UI. The public lead-capture API
-- route (Phase 1) and any server-only maintenance script use the
-- service-role key, which bypasses RLS entirely -- so those code paths must
-- do their own authorization checks in application code.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.programs enable row level security;
alter table public.admission_cycles enable row level security;
alter table public.lead_sources enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.lead_assignments enable row level security;
alter table public.tasks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.api_keys enable row level security;

-- Shared helper: can the current user see this lead at all? Admin/manager see
-- everything, a document reviewer sees everything (Phase 3 needs this), a
-- counselor sees only leads currently assigned to them.
create or replace function public.can_access_lead(p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin_or_manager()
    or public.has_role('document_reviewer')
    or exists (
      select 1 from public.leads
      where id = p_lead_id and assigned_counselor_id = auth.uid()
    );
$$;

-- ── profiles ────────────────────────────────────────────────────────────
create policy "profiles_select_staff_or_self"
  on public.profiles for select
  using (public.is_staff() or id = auth.uid());

create policy "profiles_insert_super_admin"
  on public.profiles for insert
  with check (public.has_role('super_admin'));

create policy "profiles_update_self_or_super_admin"
  on public.profiles for update
  using (id = auth.uid() or public.has_role('super_admin'));

create policy "profiles_delete_super_admin"
  on public.profiles for delete
  using (public.has_role('super_admin'));

-- ── user_roles ──────────────────────────────────────────────────────────
create policy "user_roles_select_admin_or_self"
  on public.user_roles for select
  using (public.is_admin_or_manager() or user_id = auth.uid());

create policy "user_roles_write_super_admin"
  on public.user_roles for all
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

-- ── programs / admission_cycles / lead_sources (staff read, admin write) ──
create policy "programs_select_staff" on public.programs for select using (public.is_staff());
create policy "programs_write_super_admin" on public.programs for all
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

create policy "admission_cycles_select_staff" on public.admission_cycles for select using (public.is_staff());
create policy "admission_cycles_write_admin_or_manager" on public.admission_cycles for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "lead_sources_select_staff" on public.lead_sources for select using (public.is_staff());
create policy "lead_sources_write_admin_or_manager" on public.lead_sources for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── leads ───────────────────────────────────────────────────────────────
create policy "leads_select_scoped"
  on public.leads for select
  using (
    public.is_admin_or_manager()
    or public.has_role('document_reviewer')
    or assigned_counselor_id = auth.uid()
  );

create policy "leads_insert_staff"
  on public.leads for insert
  with check (public.is_staff());

create policy "leads_update_scoped"
  on public.leads for update
  using (public.is_admin_or_manager() or assigned_counselor_id = auth.uid());

create policy "leads_delete_super_admin"
  on public.leads for delete
  using (public.has_role('super_admin'));

-- ── lead_activities / lead_status_history / lead_assignments ─────────────
create policy "lead_activities_select_scoped" on public.lead_activities for select
  using (public.can_access_lead(lead_id));
create policy "lead_activities_insert_scoped" on public.lead_activities for insert
  with check (public.can_access_lead(lead_id));

create policy "lead_status_history_select_scoped" on public.lead_status_history for select
  using (public.can_access_lead(lead_id));
create policy "lead_status_history_insert_scoped" on public.lead_status_history for insert
  with check (public.can_access_lead(lead_id));

create policy "lead_assignments_select_scoped" on public.lead_assignments for select
  using (public.can_access_lead(lead_id));
create policy "lead_assignments_insert_admin_or_manager" on public.lead_assignments for insert
  with check (public.is_admin_or_manager());
create policy "lead_assignments_update_admin_or_manager" on public.lead_assignments for update
  using (public.is_admin_or_manager());

-- ── tasks ───────────────────────────────────────────────────────────────
create policy "tasks_select_scoped" on public.tasks for select
  using (assigned_to = auth.uid() or public.can_access_lead(lead_id));

create policy "tasks_insert_scoped" on public.tasks for insert
  with check (public.is_staff());

create policy "tasks_update_scoped" on public.tasks for update
  using (assigned_to = auth.uid() or public.is_admin_or_manager());

create policy "tasks_delete_scoped" on public.tasks for delete
  using (assigned_to = auth.uid() or public.is_admin_or_manager());

-- ── audit_logs (append-only; no update/delete policy = no client can) ────
create policy "audit_logs_select_admin_or_manager" on public.audit_logs for select
  using (public.is_admin_or_manager());
create policy "audit_logs_insert_staff" on public.audit_logs for insert
  with check (public.is_staff());

-- ── api_keys (never read from the browser; service role manages these) ───
create policy "api_keys_all_super_admin" on public.api_keys for all
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
