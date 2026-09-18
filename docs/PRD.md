# PRD — Single-College Education CRM

This is the durable product spec for the project. It's the source of truth
for what each phase must do — update it if scope changes, don't let it drift
from what's actually built.

## Objective

Build a single-college Education CRM and Student Admission Management
System that manages the complete journey:

**Website Visitor → Lead → Counseling → Application → Documents → Fee
Payment → Admission → Student**

Two experiences, one shared database:

- **College/Admin side:** capture and manage leads, track admissions,
  assign leads to counselors, track applications, review documents, monitor
  fee/payment status, manage student records, communicate with students,
  run WhatsApp campaigns, analyze admission performance.
- **Student side:** login to a personal dashboard, complete the
  application, upload documents, check document/application status, view
  and pay fees, receive college communications and notifications.

**This is a single-college product.** Do not build multi-tenancy, tenant
IDs, college provisioning, college subscriptions, or multi-college database
isolation.

## Core data principle

The same individual moves through the funnel — **Lead → Applicant →
Admitted → Student** — as **one connected record**, never as separate
unrelated people created at each stage. Lead history, application history,
documents, payments, and communication all stay connected to that one
record. See `docs/DATABASE.md`.

## Development philosophy

The product is built in four major phases, each independently functional,
built on the previous phase's database/architecture, tested before the next
phase starts, and never rewriting a previous phase's working modules without
a documented reason. Phases are not built simultaneously.

## Roles

1. **Super Admin** (College Admin) — sees everything; manages users,
   programs, settings; full access to leads/applications/students/payments;
   creates campaigns; views reports.
2. **Admissions Manager** — manages leads and applications, assigns
   counselors, reviews documents, views student data, monitors the
   admission pipeline.
3. **Counselor** — sees only their assigned leads; updates lead status; adds
   notes; creates follow-up tasks; tracks follow-ups.
4. **Document Reviewer** — views applications/documents; approves or
   rejects documents with a reason.
5. **Student** (Phase 2+) — own dashboard only: application, documents,
   payments, messages.

Accounts are created by the Super Admin (or, for students, via an invite
flow in Phase 2) — **there is no public self-signup** for any role.

---

## Phase 1 — College CRM: Lead Capture & Lead Tracking (current)

**Objective:** the operational CRM foundation. By the end of Phase 1 the
college can capture leads from its website, view/search/filter all leads,
assign leads to counselors, track lead status through a pipeline, add notes
and schedule follow-ups, see lead activity history, track lead sources, and
see funnel/counselor/dashboard analytics.

**Lead statuses:** `NEW → CONTACTED → INTERESTED → COUNSELLING →
APPLICATION_STARTED → DOCUMENTS_PENDING → APPLICATION_COMPLETE →
OFFER_SENT → FEE_PENDING → ADMITTED → ENROLLED`, plus terminal/side
outcomes `NOT_INTERESTED, UNQUALIFIED, WRONG_NUMBER, DUPLICATE, LOST,
NURTURE`.

**Website integration:** the college's existing website posts enquiry-form
submissions to a public, API-key-authenticated endpoint
(`docs/API.md`, `docs/WEBSITE-INTEGRATION.md`). Duplicate submissions (by
normalized phone number) update the existing lead's activity instead of
creating a new lead.

**Acceptance criteria (all implemented):**

- Website leads reach the CRM; data is validated; duplicates are handled by
  updating the existing lead, not creating a new one.
- Lead source and UTM attribution are captured and stored.
- Dashboard reflects real database data (no static/fake analytics): KPI
  cards, admission funnel, lead sources, counselor workload, today's
  operations, recent leads.
- Counselors can be assigned/reassigned (manually — round-robin/auto
  assignment is an explicit non-goal for Phase 1).
- Lead status can be updated through the pipeline; every status change,
  assignment, note, and task is recorded as a timeline activity and (for
  status changes and assignments) an audit log entry.
- Search and filters work on the lead list (name/phone/email, status,
  program, source, counselor).
- Permissions are enforced server-side via RLS (`docs/RBAC.md`), not just
  hidden in the UI: a counselor only ever sees their own assigned leads.
- Mobile layout, loading/empty states, and error handling are in place.

**Explicitly out of scope for Phase 1:** student dashboard, WhatsApp,
campaigns, AI features, round-robin/program-based auto-assignment.

---

## Phase 2 — Student Portal: Application, Documents & Fees (implemented)

Convert a lead into an applicant/student (preserving lead history), create a
student login, and let the student complete their application, upload
documents, track document approval/rejection with resubmission, and see fee
status. **Implemented:** lead→applicant conversion with student-login
creation; role-based routing (students → `/portal`, staff → `/dashboard`);
student portal (dashboard progress, application form with submit-lock, document
upload to a private bucket with status/resubmit, read-only fees); staff-side
document review (approve/reject with reason via signed-URL view) wired into the
lead detail Application/Documents tabs. See `docs/WORKFLOWS.md` §7 and
`docs/DATABASE.md`.

**Deferred:** the online payment gateway (Razorpay) + webhook — needs API
keys; fee status is read-only and updated by staff until then. Also cut as
YAGNI for now: normalized `academic_records`, a `document_reviews` history
table (covered by `audit_logs`), `payment_transactions`, and a student
notifications table (the dashboard's computed next-action covers it).

## Phase 3 — College Admissions Dashboard: Students, Documents & Admissions (implemented)

Give the college a full Student 360 view (profile, academic data,
application, documents, payments, communication, activity), a document
review dashboard (pending/rejected/resubmission/approved queues), admission
status management, and real-data admissions/program/counselor/document/
payment reports.

**Implemented** (all real aggregation over the Phase 1/2 schema — no new
migration was needed; the `applications.status` enum already covers every
admission stage):

- **Admissions overview** (`/admissions`, admin/manager) — six live KPIs
  (total applicants, submitted, documents pending, admitted, fee pending,
  enrolled) and a CSS application funnel with per-stage drop-off.
- **Applicants list** (`/admissions/students`, admin/manager/reviewer) —
  search plus program/status/counselor filters, paginated, each row links
  to the Student 360 (the existing lead detail page).
- **Student 360** — the lead detail page doubles as the 360; admins/managers
  get an inline admission-status control on the Application tab.
- **Document review dashboard** (`/admissions/documents`,
  admin/manager/reviewer) — pending/rejected/approved queues across every
  applicant with counts, reusing the existing approve/reject-with-reason
  review action and signed-URL view.
- **Payments overview** (`/admissions/payments`, admin/manager) — billed /
  collected / outstanding totals and a per-payment table with a staff
  "record payment" dialog (offline entry until the gateway lands).
- **Reports** (`/admissions/reports`, admin/manager) — admissions funnel
  conversion, document, fee-collection, per-program, and counselor
  performance figures, all aggregated live from the database.

Admission-status changes and payment updates are audit-logged; every page is
gated with `requireStaff([...])` on top of the RLS policies. See
`docs/WORKFLOWS.md` §8.

## Phase 4 — WhatsApp API + Campaigns + Nurturing (not started)

A modular communication service (not hardcoded per-feature) connecting
WhatsApp to leads/applicants/students: an inbox, templates, audience
segmentation, campaign scheduling and analytics, opt-in/opt-out and
suppression handling, and idempotent rule-based nurturing automation.

---

## Development rules (apply to every phase)

1. **Never build multiple phases at once.** Finish and validate one before
   starting the next.
2. **Inspect before coding.** Check the current repo, database, APIs,
   components, and permissions; reuse existing code instead of duplicating
   it.
3. **Database first:** requirements → schema/migration → API/service →
   authorization → frontend → tests.
4. **Security:** never expose secret/service-role keys to the client; never
   trust frontend-only permission checks; never allow one student to see
   another's data (Phase 2+); never accept an unauthorized entity ID.
5. **Audit everything important.** Every meaningful mutation (status
   change, assignment, role/user change, document decision, payment) is
   logged with actor, action, entity, before/after, and timestamp
   (`docs/RBAC.md`, `src/lib/audit`).
6. **Definition of done** for any feature: database + backend logic +
   authorization + validation + error handling + loading/empty states +
   mobile responsiveness + audit logging where applicable + docs. A feature
   that "looks done in the UI" isn't done without these.

## Future features — explicitly not part of Phases 1–4

AI counselor copilot, AI lead intelligence/scoring, voice/calling
integration, a drag-and-drop automation builder, and advanced/predictive
analytics. These come only after the core 4-phase workflow is stable.
