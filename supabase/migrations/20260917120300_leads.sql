-- The lead is the one person-record that carries through the whole funnel
-- (Lead -> Applicant -> Student in later phases reuse this same row's id,
-- never a new person record -- see docs/DATABASE.md).

create extension if not exists pg_trgm;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  phone_normalized text not null,
  email text,
  city text,
  state text,
  program_id uuid references public.programs (id),
  admission_cycle_id uuid references public.admission_cycles (id),
  source_id uuid references public.lead_sources (id),
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  status public.lead_status not null default 'NEW',
  assigned_counselor_id uuid references public.profiles (id),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create index leads_phone_normalized_idx on public.leads (phone_normalized);
create index leads_status_idx on public.leads (status);
create index leads_assigned_counselor_idx on public.leads (assigned_counselor_id);
create index leads_program_idx on public.leads (program_id);
create index leads_created_at_idx on public.leads (created_at desc);
create index leads_full_name_trgm_idx on public.leads using gin (full_name gin_trgm_ops);

-- Normalizes to a bare 10-digit Indian mobile number (strips +91/spaces/dashes)
-- so "+91 98765 43210" and "9876543210" are recognized as the same lead.
-- Deliberately simple for a single-college, India-based deployment; revisit if
-- the college later takes international applicants.
create or replace function public.normalize_phone(raw_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  digits := regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g');
  if length(digits) > 10 then
    digits := right(digits, 10);
  end if;
  return digits;
end;
$$;

create or replace function public.leads_set_phone_normalized()
returns trigger
language plpgsql
as $$
begin
  new.phone_normalized = public.normalize_phone(new.phone);
  return new;
end;
$$;

create trigger leads_set_phone_normalized
  before insert or update of phone on public.leads
  for each row execute function public.leads_set_phone_normalized();
