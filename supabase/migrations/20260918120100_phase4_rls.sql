-- Phase 4 RLS. Messaging is staff-only (no student touches these tables).
-- Conversation/message visibility follows the same lead scoping as Phase 1:
-- admin/manager and document reviewers see every thread, a counselor sees only
-- threads for leads currently assigned to them (public.can_access_lead).
-- Configuration surfaces (templates, segments, campaigns, suppressions,
-- nurture rules) are readable by all staff and written by admin/manager.

alter table public.message_templates enable row level security;
alter table public.audience_segments enable row level security;
alter table public.campaigns enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.message_suppressions enable row level security;
alter table public.nurture_rules enable row level security;
alter table public.nurture_runs enable row level security;

-- ── message_templates ───────────────────────────────────────────────────────
create policy "message_templates_select_staff" on public.message_templates for select
  using (public.is_staff());
create policy "message_templates_write_admin" on public.message_templates for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── audience_segments ───────────────────────────────────────────────────────
create policy "audience_segments_select_staff" on public.audience_segments for select
  using (public.is_staff());
create policy "audience_segments_write_admin" on public.audience_segments for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── campaigns ───────────────────────────────────────────────────────────────
create policy "campaigns_select_staff" on public.campaigns for select
  using (public.is_staff());
create policy "campaigns_write_admin" on public.campaigns for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── campaign_recipients ─────────────────────────────────────────────────────
create policy "campaign_recipients_select_staff" on public.campaign_recipients for select
  using (public.is_staff());
create policy "campaign_recipients_write_admin" on public.campaign_recipients for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── conversations (lead-scoped) ─────────────────────────────────────────────
create policy "conversations_select_scoped" on public.conversations for select
  using (public.can_access_lead(lead_id));
create policy "conversations_insert_scoped" on public.conversations for insert
  with check (public.can_access_lead(lead_id));
create policy "conversations_update_scoped" on public.conversations for update
  using (public.can_access_lead(lead_id)) with check (public.can_access_lead(lead_id));

-- ── messages (lead-scoped) ──────────────────────────────────────────────────
create policy "messages_select_scoped" on public.messages for select
  using (public.can_access_lead(lead_id));
create policy "messages_insert_scoped" on public.messages for insert
  with check (public.can_access_lead(lead_id));
create policy "messages_update_scoped" on public.messages for update
  using (public.can_access_lead(lead_id)) with check (public.can_access_lead(lead_id));

-- ── message_suppressions (staff read, admin/manager write) ──────────────────
create policy "message_suppressions_select_staff" on public.message_suppressions for select
  using (public.is_staff());
create policy "message_suppressions_write_admin" on public.message_suppressions for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ── nurture_rules / nurture_runs ────────────────────────────────────────────
create policy "nurture_rules_select_staff" on public.nurture_rules for select
  using (public.is_staff());
create policy "nurture_rules_write_admin" on public.nurture_rules for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

create policy "nurture_runs_select_staff" on public.nurture_runs for select
  using (public.is_staff());
create policy "nurture_runs_write_admin" on public.nurture_runs for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
