-- Programs are intentionally simple in Phase 1 (the college starts with one:
-- PG Diploma in Advertising and PR) but are a real table from day one so
-- adding more programs later never requires a schema change.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  degree_level text,
  duration_months integer,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

create table public.admission_cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  application_deadline date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, name)
);

create trigger admission_cycles_set_updated_at
  before update on public.admission_cycles
  for each row execute function public.set_updated_at();

create index admission_cycles_program_id_idx on public.admission_cycles (program_id);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'other',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
