# Workflows (Phase 1)

## 1. Standing up the college's account (one-time)

1. Create the Supabase project, apply migrations, optionally seed demo data
   (`README.md`).
2. Get the first `super_admin` into `profiles`/`user_roles` (either via
   `seed.sql`'s demo admin, or by hand for a real deployment — see
   README "Getting started" step 4).
3. Sign in as that super admin → **Settings → Users** → create logins for
   the Admissions Manager, counselors, and document reviewer. Each gets a
   one-time temporary password shown once in the UI — share it out of band
   and have them change it after first login (Phase 1 doesn't yet enforce a
   forced password change on first login; see `docs/ARCHITECTURE.md`-style
   note for a good Phase 2 follow-up).
4. **Settings → Website Integration** → generate an API key → follow
   `docs/WEBSITE-INTEGRATION.md` to add the embed snippet (or
   server-to-server call) to the college's existing website.

## 2. A lead comes in from the website

```
Visitor fills the enquiry form on the college website
  → website posts to POST /api/leads with the integration's API key
  → validated, phone normalized
  → duplicate check by phone
      - existing lead found  → activity logged on that lead, no new row
      - no existing lead     → new lead created, status = NEW, unassigned
  → appears on the CRM dashboard and lead list immediately
```

See `docs/API.md` for the exact contract.

## 3. Admissions Manager assigns a counselor

Lead list (or dashboard "Recent Leads") → open the lead → **Counselor**
dropdown in the header (visible to `super_admin`/`admissions_manager` only)
→ pick a counselor. This:

- Updates `leads.assigned_counselor_id`
- Closes out any previous open row in `lead_assignments` and inserts a new
  one
- Logs an `assigned`/`reassigned` activity and an audit log entry

The counselor now sees this lead in their own lead list (RLS-scoped —
`docs/RBAC.md`).

## 4. Counselor works a lead

1. **Leads** (scoped to their own assignments) → open a lead.
2. **Overview** tab: contact info, program, UTM attribution, admission
   cycle.
3. Change **Status** in the header as the conversation progresses (e.g.
   `NEW → CONTACTED → INTERESTED`). Every change is timestamped in
   `lead_status_history` and shown in the **Activity** tab, and feeds the
   dashboard funnel immediately.
4. **Notes** tab: log call outcomes/context.
5. **Tasks** tab: create a follow-up ("Call back tomorrow 11 AM"), assign
   it (defaults to themselves), and mark it complete/cancelled later.
   Overdue pending tasks surface on the dashboard's "Today's Operations"
   panel and (for admin/manager) the counselor workload table.

**Application** and **Documents** tabs are visible but disabled — they
activate in Phase 2 once there's something to show there.

## 5. Checking on the whole funnel (Super Admin / Admissions Manager)

**Dashboard** → KPI cards (Total/New/Contacted/Interested/
Applications/Admitted/Enrolled), the funnel chart (leads that have *ever*
reached each stage, not just currently-at-that-stage — see
`docs/DATABASE.md`), lead sources breakdown, counselor workload, and
today's operations (new-today, uncontacted, follow-ups due/overdue,
applications/documents pending). All computed from live queries — nothing
here is hardcoded.

## 6. Manually logging a lead the website didn't capture

Walk-ins and phone enquiries: **Leads → Add Lead**. Same duplicate check by
phone as the API path; same activity/audit trail.

## Not yet implemented (tracked for later phases)

- Forced password change on first staff login.
- Round-robin/program-based auto-assignment (Phase 1 is deliberately manual
  — see `docs/PRD.md`).
- Everything under "Application"/"Documents" tabs, student login, payments,
  WhatsApp, campaigns — Phases 2–4.
