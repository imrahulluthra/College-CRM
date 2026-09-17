create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  title text not null,
  description text,
  task_type public.task_type not null default 'follow_up',
  due_at timestamptz not null,
  assigned_to uuid not null references public.profiles (id),
  status public.task_status not null default 'pending',
  completed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index tasks_lead_id_idx on public.tasks (lead_id);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_due_at_idx on public.tasks (due_at) where status = 'pending';
