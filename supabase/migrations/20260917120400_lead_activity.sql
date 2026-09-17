-- Every important change to a lead should be visible in the timeline
-- (docs/WORKFLOWS.md). lead_activities is the general timeline feed;
-- lead_status_history and lead_assignments are narrower, queryable logs
-- used by the funnel and counselor-workload reports.

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  activity_type public.lead_activity_type not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index lead_activities_lead_id_idx on public.lead_activities (lead_id, created_at desc);

create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  from_status public.lead_status,
  to_status public.lead_status not null,
  changed_by uuid references public.profiles (id),
  reason text,
  created_at timestamptz not null default now()
);

create index lead_status_history_lead_id_idx on public.lead_status_history (lead_id, created_at desc);

create table public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  counselor_id uuid not null references public.profiles (id),
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  reason text
);

create index lead_assignments_lead_id_idx on public.lead_assignments (lead_id, assigned_at desc);
create index lead_assignments_counselor_id_idx on public.lead_assignments (counselor_id);
