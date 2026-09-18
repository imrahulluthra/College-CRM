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

## 7. Lead → Applicant → Student (Phase 2)

1. On a lead's detail page, **Application** or **Documents** tab (or the
   prompt there) → **Convert to Applicant**. This creates a student login for
   the lead's email, an application (status DRAFT), an empty student profile,
   and a fee row from the program's fee — reusing the same lead record, so all
   Phase 1 history stays attached. A one-time temporary password is shown once;
   share it with the student securely.
2. The student signs in at the same `/login` and lands on the **student
   portal** (`/portal`) — staff and students share one login, routed by role.
3. The student completes the application as a 3-step wizard:
   **My Application** (personal + academic; **Next** saves and advances) →
   **Documents** (upload PDF/JPG/PNG ≤ 5 MB; **Back**/**Next**) →
   **Fees & Submit** (**Back**, plus the final **Submit**). Data and uploads
   persist across back-and-forth navigation; the application is only
   submitted from the Fees step. On submit, the student sees a success
   confirmation and is sent to their dashboard, which shows their Personal
   and Academic details.
4. A **Document Reviewer** (or admin/manager) opens the lead's **Documents**
   tab, views each file (short-lived signed URL), and Approves or Rejects with
   a reason. A rejected document shows its reason in the student portal and can
   be re-uploaded; an approved one locks.

**Online fee payment is deferred.** The portal shows fee status read-only; the
payment gateway (Razorpay) needs API keys and is a follow-up change — until
then, staff record payments by updating the `payments` row. Everything else in
the Phase 2 journey works end to end.

## 8. Running admissions (Phase 3)

For admissions managers and super admins (document reviewers get the
applicant and document-review views):

1. **Admissions overview** (`/admissions`) — the day's headline numbers:
   total applicants, submitted, documents pending, admitted, fee pending,
   enrolled, plus an application funnel showing where applicants drop off.
   Every figure is a live count from the database.
2. **Applicants** (`/admissions/students`) — the full applicant list.
   Search by name/phone/email and filter by program, application status, or
   assigned counselor. Each row shows document progress (approved/total) and
   fee status; the name links to the **Student 360** (the lead detail page),
   where an admin/manager can change the admission status inline (Application
   Received → Under Review → Approved → Admitted → Enrolled, or
   Rejected/Withdrawn). Status changes are audit-logged.
3. **Document review** (`/admissions/documents`) — one queue across every
   applicant, tabbed Pending review / Rejected / Approved with counts. View
   each file via a short-lived signed URL and approve or reject with a reason,
   the same action the lead Documents tab uses.
4. **Payments** (`/admissions/payments`) — billed / collected / outstanding
   totals and a per-payment table. Staff record an offline payment (amount
   paid + status) from the row's **Record** dialog; the student sees the
   updated status in their portal. Updates are audit-logged. (Online gateway
   still deferred — see §7.)
5. **Reports** (`/admissions/reports`) — live aggregation only, no vanity
   metrics: admissions-funnel conversion rates, document counts, fee
   collection, a per-program breakdown, and counselor performance (from the
   `counselor_workload` view).

## 9. Messaging leads over WhatsApp (Phase 4)

Under **Communications** in the sidebar. WhatsApp itself isn't connected in
this environment (no WABA credentials), so every send is recorded and
**queued** — a banner says so on each screen. Adding `WHATSAPP_PHONE_NUMBER_ID`
and `WHATSAPP_ACCESS_TOKEN` wires the real Meta Cloud API at one seam
(`src/lib/messaging/provider.ts`) with no other change.

1. **Inbox** (`/messaging`, all staff) — one conversation thread per lead.
   Open a lead's thread and reply; counselors see only threads for their own
   leads, admin/manager and reviewers see all. From the thread you can **opt
   the lead out** (or back in).
2. **Templates** (`/messaging/templates`) — reusable messages with
   `{{first_name}}`, `{{full_name}}`, `{{program}}`, `{{counselor}}`
   placeholders filled per lead when sent.
3. **Segments** (`/messaging/segments`) — a saved filter over leads
   (status/program/counselor/city). The lead count is computed live, so a
   segment never goes stale.
4. **Campaigns** (`/messaging/campaigns`) — pick a template + segment, create a
   draft, then **Send**: one message is queued per lead in the audience,
   opted-out leads skipped, and per-recipient delivery is tracked on the row.
5. **Automation** (`/messaging/automation`) — rules that send a template when a
   lead is created or reaches a status. Each rule fires **at most once per
   lead** (the `nurture_runs` ledger). Press **Run now** to evaluate them; a
   scheduled worker can call the same idempotent function later.
6. **Opt-outs** (`/messaging/opt-outs`) — everyone suppressed from messaging.
   The send service skips these leads everywhere; opt a lead back in here.

Sends, campaign runs, opt-out changes and rule changes are audit-logged.

## Not yet implemented (tracked for later phases)

- Forced password change on first login (staff or student).
- Online payment gateway + webhook (needs Razorpay keys).
- Round-robin/program-based auto-assignment (Phase 1 is deliberately manual).
- Live WhatsApp transport + inbound webhook (needs WABA credentials) and a
  background sender/scheduler to drain the queue and fire nurture rules on a
  timer (Phase 4 ships the provider seam and idempotent evaluator ready for it).
