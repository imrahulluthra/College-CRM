-- Dashboard aggregation views (Phase 1). `security_invoker = true` is what
-- keeps these RLS-safe: without it a view runs with the *owner's* rights and
-- would leak every counselor's data to every counselor querying it. With it,
-- the underlying table policies apply per calling user, same as querying the
-- tables directly -- see docs/RBAC.md.

-- True funnel (not just "current status"): counts every lead that has ever
-- reached a given status, from lead_status_history, so a lead currently
-- ENROLLED still counts toward CONTACTED, INTERESTED, etc.
create view public.lead_funnel_counts
with (security_invoker = true) as
select to_status as status, count(distinct lead_id) as lead_count
from public.lead_status_history
group by to_status;

create view public.lead_source_counts
with (security_invoker = true) as
select
  coalesce(s.name, 'Unknown') as source_name,
  count(l.id) as lead_count
from public.leads l
left join public.lead_sources s on s.id = l.source_id
group by coalesce(s.name, 'Unknown');

-- Admin/manager-only in practice: counselor role can technically query this
-- (profiles are staff-readable), but leads RLS scopes each counselor to
-- their own rows, so it will only ever be rendered for admin/manager in the
-- UI (src/features/dashboard) to avoid showing misleading zero counts for
-- colleagues a counselor has no visibility into.
create view public.counselor_workload
with (security_invoker = true) as
select
  p.id as counselor_id,
  p.full_name,
  count(l.id) as assigned_leads,
  count(l.id) filter (
    where l.status not in (
      'ADMITTED', 'ENROLLED', 'NOT_INTERESTED', 'UNQUALIFIED',
      'WRONG_NUMBER', 'DUPLICATE', 'LOST'
    )
  ) as pending_leads,
  count(l.id) filter (
    where l.status in (
      'APPLICATION_STARTED', 'DOCUMENTS_PENDING', 'APPLICATION_COMPLETE',
      'OFFER_SENT', 'FEE_PENDING'
    )
  ) as applications,
  (
    select count(*) from public.tasks t
    where t.assigned_to = p.id and t.status = 'pending'
  ) as pending_tasks
from public.profiles p
join public.user_roles ur on ur.user_id = p.id and ur.role = 'counselor'
left join public.leads l on l.assigned_counselor_id = p.id
group by p.id, p.full_name;
