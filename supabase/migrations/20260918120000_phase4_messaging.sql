-- Phase 4: modular communication (WhatsApp) — inbox, templates, audience
-- segments, campaigns, opt-out suppression, and idempotent nurture automation.
-- Everything hangs off the one lead record from Phase 1 (leads.id); nothing
-- here duplicates a person. The actual WhatsApp transport is deferred behind a
-- provider seam (src/lib/messaging/provider.ts): with no WABA credentials in
-- the environment, outbound messages are recorded as 'queued' and the real
-- Meta Cloud API call slots into that one seam later. See docs/WORKFLOWS.md §9.

create type public.message_direction as enum ('inbound', 'outbound');

-- Outbound lifecycle: queued -> sent -> delivered -> read (or failed).
-- Inbound messages land as 'received'.
create type public.message_status as enum (
  'queued', 'sent', 'delivered', 'read', 'failed', 'received'
);

-- Mirrors WhatsApp's template categories (kept for parity with the Cloud API).
create type public.template_category as enum ('marketing', 'utility', 'authentication');

-- Local approval state. Without a WABA connection templates default to
-- 'approved' so they're usable; the real submit-for-approval flow maps onto
-- this column when credentials are added.
create type public.template_status as enum ('draft', 'approved', 'rejected');

create type public.campaign_status as enum (
  'draft', 'scheduled', 'sending', 'completed', 'cancelled'
);

-- What makes a nurture rule fire against a lead.
create type public.nurture_trigger as enum ('lead_created', 'lead_status_changed');

-- ── message_templates ───────────────────────────────────────────────────────
-- Body may contain {{full_name}}, {{first_name}}, {{program}}, {{counselor}}
-- placeholders, substituted per-lead at send time (see src/lib/messaging).
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category public.template_category not null default 'utility',
  language text not null default 'en',
  body text not null,
  status public.template_status not null default 'approved',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ── audience_segments ───────────────────────────────────────────────────────
-- A saved, re-runnable filter over leads. `definition` holds the criteria
-- (statuses[], program_id, counselor_id, city); the count/rows are computed
-- live from leads, never stored, so a segment never goes stale.
create table public.audience_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  definition jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger audience_segments_set_updated_at
  before update on public.audience_segments
  for each row execute function public.set_updated_at();

-- ── campaigns ───────────────────────────────────────────────────────────────
-- A one-off broadcast of one template to one segment. Per-recipient outcome
-- lives in campaign_recipients; the headline stats are aggregated from there.
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid not null references public.message_templates (id),
  segment_id uuid references public.audience_segments (id),
  status public.campaign_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create index campaigns_status_idx on public.campaigns (status);

-- ── conversations ───────────────────────────────────────────────────────────
-- One WhatsApp thread per lead. The denormalized last_* columns keep the inbox
-- list cheap to render without scanning messages.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  last_direction public.message_direction,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index conversations_last_message_idx
  on public.conversations (last_message_at desc nulls last);

-- ── messages ────────────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  direction public.message_direction not null,
  body text not null,
  status public.message_status not null default 'queued',
  template_id uuid references public.message_templates (id),
  campaign_id uuid references public.campaigns (id) on delete set null,
  sent_by uuid references public.profiles (id),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_lead_idx on public.messages (lead_id, created_at desc);

-- ── campaign_recipients ─────────────────────────────────────────────────────
create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  status public.message_status not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);

create index campaign_recipients_campaign_idx on public.campaign_recipients (campaign_id);

-- ── message_suppressions (opt-out list) ─────────────────────────────────────
-- A row here means the lead has opted out / been suppressed; the send service
-- checks this before every outbound message. Absence = opted in.
create table public.message_suppressions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  reason text not null default 'opted_out',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ── nurture_rules + nurture_runs ────────────────────────────────────────────
-- A rule sends one template when a lead is created, or when it reaches a given
-- status. nurture_runs is the idempotency ledger: unique(rule_id, lead_id)
-- guarantees a rule fires at most once per lead however often the evaluator runs.
create table public.nurture_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger public.nurture_trigger not null,
  to_status public.lead_status,
  template_id uuid not null references public.message_templates (id),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger nurture_rules_set_updated_at
  before update on public.nurture_rules
  for each row execute function public.set_updated_at();

create table public.nurture_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.nurture_rules (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (rule_id, lead_id)
);

create index nurture_runs_rule_idx on public.nurture_runs (rule_id);
