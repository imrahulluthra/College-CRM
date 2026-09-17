# Database (Phase 1)

Schema lives in `supabase/migrations/*.sql`, applied in filename order.
Demo data is in `supabase/seed/seed.sql`. The TypeScript mirror is
`src/types/database.ts` (hand-written — see that file's header).

## The core principle: one person, one record

A lead that becomes an applicant, gets admitted, and enrolls is **the same
database row (`leads.id`) throughout its own table and, in later phases,
the row it's linked to in `applications`/`students`** — never a new,
disconnected person record created at each funnel stage. This is why the
public lead-capture endpoint does a duplicate check by normalized phone
number before inserting: a second website submission from the same person
updates their existing lead's activity feed instead of creating a
duplicate. See `src/app/api/leads/route.ts` and
`public.normalize_phone()`.

## Tables

### Identity

- **`profiles`** — one row per staff/student login, mirroring `auth.users`
  (id is a foreign key to it). Created by the Super Admin (staff) or,
  Phase 2+, an invite flow (students) — never by self-signup.
- **`user_roles`** — `(user_id, role)`, so a person could hold more than one
  role. Role is one of `super_admin, admissions_manager, counselor,
  document_reviewer, student`.

### Admissions structure

- **`programs`** — seeded with one program (PG Diploma in Advertising and
  Public Relations); designed to hold more without a schema change.
- **`admission_cycles`** — belongs to a program (e.g. "2026-27").
- **`lead_sources`** — Website, Google, Meta, Referral, Walk-in, Other, etc.

### Leads

- **`leads`** — the core record. Contact info, program/cycle/source,
  full UTM attribution (`utm_source/medium/campaign/content/term`,
  `campaign`, `landing_page`), `status` (the pipeline enum), and
  `assigned_counselor_id`. `phone_normalized` is maintained by a trigger
  (`public.normalize_phone()`) and is what duplicate detection and search
  key off of.
- **`lead_activities`** — the timeline shown on the lead detail page. Every
  meaningful action (created, status changed, assigned, note, task
  created/completed, duplicate submission, …) writes one row here.
- **`lead_status_history`** — `(lead_id, from_status, to_status, changed_by,
  reason)`. Narrower than `lead_activities`, purpose-built for funnel
  reporting (`lead_funnel_counts` view below) — it's what lets the funnel
  count "leads that ever reached INTERESTED", not just "leads currently at
  INTERESTED".
- **`lead_assignments`** — assignment history (`assigned_at`/
  `unassigned_at`), separate from `leads.assigned_counselor_id` (which is
  just the current value) so reassignment history and counselor workload
  over time are queryable.
- **`tasks`** — follow-ups/calls/reminders, optionally linked to a lead,
  always assigned to a staff member with a due date and status.

### System

- **`audit_logs`** — append-only (no update/delete RLS policy exists, so
  clients literally cannot alter one): actor, action, entity type/id,
  previous/new value JSON, free-form context, timestamp. Written by
  `src/lib/audit/log.ts` from server actions/routes — see `docs/RBAC.md`.
- **`api_keys`** — hashed (SHA-256) API keys for the public lead-capture
  endpoint. The plaintext key is shown exactly once, at creation, in the
  Settings UI; only the hash and a short prefix (for display) are stored.

## Reporting views

`supabase/migrations/20260917120800_reporting_views.sql` defines three
views used by the dashboard (`src/features/dashboard/data.ts`):

- **`lead_funnel_counts`** — `count(distinct lead_id)` per `to_status` from
  `lead_status_history`. A true funnel (a lead currently `ENROLLED` still
  counts toward `CONTACTED`, `INTERESTED`, etc.), not just a current-status
  snapshot.
- **`lead_source_counts`** — current lead count per source.
- **`counselor_workload`** — assigned/pending/applications/pending-tasks
  counts per counselor.

All three are declared `with (security_invoker = true)`. This matters: a
Postgres view without that option runs with the **view owner's** privileges,
which would silently bypass every RLS policy on the tables it reads and
leak all data to whoever queries it. `security_invoker = true` makes the
view apply RLS as the querying user instead, exactly as if they'd queried
the underlying tables directly.

## Extending the schema in later phases

Add new tables in a new numbered migration file rather than editing an
existing one (migrations are meant to be an append-only history — editing
an already-applied migration doesn't retroactively change a database that
already ran it). Update `src/types/database.ts` to match, remembering the
required `Relationships`/`Functions`/etc. shape noted at the top of that
file. Phase 2 will add `applications`, `student_profiles`,
`academic_records`, `document_types`, `student_documents`,
`document_reviews`, `payments`, `payment_transactions` — Phase 3 mostly
builds UI on top of what Phase 1/2 already created rather than adding many
new tables — Phase 4 adds `conversations`, `messages`, `whatsapp_templates`,
`campaigns`, `campaign_recipients`, `communication_consents`.
