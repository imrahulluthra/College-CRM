-- Phase 1: extensions, shared enums, and helper functions/triggers used across every table below.

create extension if not exists "pgcrypto";

-- Single source of truth for staff/student roles. A person can hold more than one
-- staff role (e.g. Admissions Manager who also counsels), so roles live in their
-- own table rather than a single column on profiles.
create type public.user_role as enum (
  'super_admin',
  'admissions_manager',
  'counselor',
  'document_reviewer',
  'student'
);

create type public.lead_status as enum (
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'COUNSELLING',
  'APPLICATION_STARTED',
  'DOCUMENTS_PENDING',
  'APPLICATION_COMPLETE',
  'OFFER_SENT',
  'FEE_PENDING',
  'ADMITTED',
  'ENROLLED',
  'NOT_INTERESTED',
  'UNQUALIFIED',
  'WRONG_NUMBER',
  'DUPLICATE',
  'LOST',
  'NURTURE'
);

create type public.lead_activity_type as enum (
  'created',
  'duplicate_submission',
  'status_changed',
  'assigned',
  'reassigned',
  'note',
  'call',
  'email',
  'whatsapp',
  'task_created',
  'task_completed',
  'task_cancelled',
  'application_link_sent'
);

create type public.task_type as enum (
  'call',
  'follow_up',
  'meeting',
  'document_reminder',
  'application_reminder',
  'other'
);

create type public.task_status as enum ('pending', 'completed', 'cancelled');

-- Generic "touch updated_at" trigger reused by every table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
