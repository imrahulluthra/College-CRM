-- Every important mutation gets an audit row (who, what, before/after) --
-- see docs/RBAC.md. Written by lib/audit from server actions/API routes,
-- which always run with a known actor or the "system" (null actor + api_key
-- context for the public lead capture endpoint).

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- Lets the college's existing website POST leads without a user login. Keys
-- are created by the super admin, stored as a salted hash (never plaintext),
-- and checked in the /api/leads route handler with the service-role client --
-- never on the browser. See docs/WEBSITE-INTEGRATION.md.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
