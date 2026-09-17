-- Staff/student identity. auth.users (Supabase Auth) is the source of truth for
-- login credentials; profiles mirrors the display data the app actually needs.
-- Rows are created by the super admin (staff) or by the student-invite flow
-- (Phase 2) -- there is no public self-signup in Phase 1.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

-- SECURITY DEFINER so RLS policies elsewhere can call this without recursing
-- into user_roles' own RLS (which would otherwise deadlock the policy check).
create or replace function public.current_user_roles()
returns setof public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.has_role(check_role public.user_role)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$;

-- Staff = anyone who isn't a student. Used to gate the whole CRM away from
-- the student portal (built in Phase 2).
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role <> 'student'
  );
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('super_admin', 'admissions_manager')
  );
$$;
