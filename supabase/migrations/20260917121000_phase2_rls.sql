-- Phase 2 RLS. A student may only ever touch their own application and its
-- children; staff scope matches Phase 1 (admin/manager everything, document
-- reviewer read + review). See docs/RBAC.md.

alter table public.applications enable row level security;
alter table public.student_profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.student_documents enable row level security;
alter table public.payments enable row level security;

-- Can the current user see this application? Its owning student, or any staff.
create or replace function public.can_access_application(p_application_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_staff()
    or exists (
      select 1 from public.applications
      where id = p_application_id and student_user_id = auth.uid()
    );
$$;

-- ── applications ──────────────────────────────────────────────────────────
create policy "applications_select_scoped" on public.applications for select
  using (public.is_staff() or student_user_id = auth.uid());

create policy "applications_insert_staff" on public.applications for insert
  with check (public.is_staff());

-- Student may edit only their own DRAFT (submitting flips it out of DRAFT);
-- admin/manager may edit any (status changes, admission decisions).
create policy "applications_update_scoped" on public.applications for update
  using (
    public.is_admin_or_manager()
    or (student_user_id = auth.uid() and status = 'DRAFT')
  );

-- ── student_profiles ──────────────────────────────────────────────────────
create policy "student_profiles_select_scoped" on public.student_profiles for select
  using (public.can_access_application(application_id));

create policy "student_profiles_insert_scoped" on public.student_profiles for insert
  with check (public.can_access_application(application_id));

create policy "student_profiles_update_scoped" on public.student_profiles for update
  using (public.can_access_application(application_id));

-- ── document_types (everyone signed in reads; admin/manager configures) ────
create policy "document_types_select_all" on public.document_types for select
  using (auth.uid() is not null);

create policy "document_types_write_admin" on public.document_types for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── student_documents ─────────────────────────────────────────────────────
create policy "student_documents_select_scoped" on public.student_documents for select
  using (public.can_access_application(application_id));

-- Student uploads/replaces their own; the server action gates re-upload to
-- non-approved docs, but RLS also blocks reaching into another application.
create policy "student_documents_insert_scoped" on public.student_documents for insert
  with check (public.can_access_application(application_id));

-- Owner (re-upload) or reviewer/admin (approve/reject) may update.
create policy "student_documents_update_scoped" on public.student_documents for update
  using (
    public.is_admin_or_manager()
    or public.has_role('document_reviewer')
    or exists (
      select 1 from public.applications
      where id = application_id and student_user_id = auth.uid()
    )
  );

-- ── payments (student reads own; admin/manager writes) ─────────────────────
create policy "payments_select_scoped" on public.payments for select
  using (public.can_access_application(application_id));

create policy "payments_write_admin" on public.payments for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
