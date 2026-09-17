-- Phase 2: student portal spine. A converted lead reuses its same leads.id
-- (the one person record from Phase 1) and gains: an auth login (a profiles
-- row with role 'student'), an application, a student profile, a fee row, and
-- uploaded documents. Nothing here duplicates the person -- see docs/DATABASE.md.

create type public.application_status as enum (
  'DRAFT',           -- student account made, application not yet submitted
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'FEE_PENDING',
  'ADMITTED',
  'ENROLLED',
  'REJECTED',
  'WITHDRAWN'
);

-- Reject implies "please re-upload"; a re-upload flips the row back to UPLOADED.
-- ponytail: 3 states cover the flow; add UNDER_REVIEW / RESUBMISSION_REQUIRED
-- distinctions only if reviewers need a separate "seen but not decided" state.
create type public.document_status as enum ('UPLOADED', 'APPROVED', 'REJECTED');

create type public.payment_status as enum ('PENDING', 'PARTIAL', 'PAID');

-- Programs carry the headline fee so a converted application can seed its fee
-- row. ponytail: one column; add a fee_structures table if programs ever need
-- multiple heads/installments defined up front.
alter table public.programs add column fee_amount numeric(12, 2);

-- ── applications ─────────────────────────────────────────────────────────
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  student_user_id uuid references public.profiles (id),
  program_id uuid references public.programs (id),
  admission_cycle_id uuid references public.admission_cycles (id),
  status public.application_status not null default 'DRAFT',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create index applications_student_user_idx on public.applications (student_user_id);
create index applications_status_idx on public.applications (status);

-- ── student_profiles ─────────────────────────────────────────────────────
-- Personal + academic details the student fills in. Flat academic columns
-- (not a normalized academic_records table) because the single program has a
-- fixed 10th/12th/graduation/entrance shape. ponytail: add academic_records
-- if future programs need variable qualification structures.
create table public.student_profiles (
  application_id uuid primary key references public.applications (id) on delete cascade,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,
  guardian_name text,
  guardian_phone text,
  tenth_percentage numeric(5, 2),
  twelfth_percentage numeric(5, 2),
  graduation_percentage numeric(5, 2),
  entrance_exam text,
  entrance_score text,
  updated_at timestamptz not null default now()
);

create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

-- ── document_types (college-configured) ──────────────────────────────────
create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── student_documents ────────────────────────────────────────────────────
-- Review outcome lives on the row (status + rejection_reason + reviewer);
-- the full who/when history goes to audit_logs, so no separate
-- document_reviews table. storage_path points into the private
-- 'student-documents' bucket; every read/write is mediated by a server action
-- that checks ownership then uses the service-role client, so the bucket needs
-- no storage RLS policies (it denies all direct client access by default).
create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  document_type_id uuid not null references public.document_types (id),
  storage_path text not null,
  file_name text not null,
  status public.document_status not null default 'UPLOADED',
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now(),
  unique (application_id, document_type_id)
);

create index student_documents_application_idx on public.student_documents (application_id);
create index student_documents_status_idx on public.student_documents (status);

-- ── payments (display + status; the gateway lands in a later change) ──────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  label text not null default 'Program Fee',
  amount_total numeric(12, 2) not null,
  amount_paid numeric(12, 2) not null default 0,
  status public.payment_status not null default 'PENDING',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index payments_application_idx on public.payments (application_id);

-- ── private storage bucket for documents ─────────────────────────────────
insert into storage.buckets (id, name, public)
values ('student-documents', 'student-documents', false)
on conflict (id) do nothing;
