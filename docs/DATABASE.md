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

## Phase 2 tables (student portal)

A converted lead keeps its `leads.id` and gains a student login (a `profiles`
row with role `student`) plus:

- **`applications`** — one per lead (`lead_id` unique), owned by a student
  login (`student_user_id`). Carries the application `status` and
  `submitted_at`. RLS scopes a student to `student_user_id = auth.uid()`.
- **`student_profiles`** — personal + academic details the student fills in,
  keyed 1:1 to an application. Academic fields are flat columns (`tenth_percentage`,
  `twelfth_percentage`, `graduation_percentage`, `entrance_*`) rather than a
  normalized `academic_records` table — fine for the single fixed-shape program.
- **`document_types`** — college-configured list of documents to collect.
- **`student_documents`** — one row per (application, document type). The review
  outcome lives on the row (`status` = UPLOADED/APPROVED/REJECTED +
  `rejection_reason` + reviewer); full history goes to `audit_logs`, so there's
  no separate `document_reviews` table. `storage_path` points into the private
  `student-documents` bucket.
- **`payments`** — fee display (total/paid/pending/status/due). One row per
  application, seeded from `programs.fee_amount` at conversion.

**Document storage has no storage RLS policies.** The `student-documents`
bucket is private (denies all direct client access). Every upload and view goes
through a server action that checks ownership (or staff role) first, then uses
the service-role client to upload or mint a short-lived signed URL. This is
simpler than authoring storage.objects policies and equally locked down —
nothing but our server, after an auth check, ever touches the bucket.

Cut for now (add when actually needed): `academic_records`,
`document_reviews`, `payment_transactions`, and a student notifications table
(the dashboard's computed "what's next" covers the notification need).

## Phase 4 tables (messaging)

All hang off `leads.id` — messaging is staff-only, no student rows.

- **`message_templates`** — reusable WhatsApp messages with `{{placeholder}}`
  bodies, a category (marketing/utility/authentication) and a local approval
  `status`.
- **`conversations`** — one thread per lead (`lead_id` unique) with denormalized
  `last_message_*` for a cheap inbox list.
- **`messages`** — inbound/outbound messages on a conversation, with a delivery
  `status` (queued→sent→delivered→read/failed, or `received` inbound) and
  optional `template_id`/`campaign_id`.
- **`audience_segments`** — a saved filter (`definition` jsonb) over leads;
  membership is computed live, never stored.
- **`campaigns`** + **`campaign_recipients`** — a template broadcast to a
  segment, with one recipient row per lead carrying its own delivery status.
- **`message_suppressions`** — the opt-out list (`lead_id` unique); the send
  service checks it before every outbound message.
- **`nurture_rules`** + **`nurture_runs`** — automation rules and their
  idempotency ledger. `unique (rule_id, lead_id)` guarantees a rule fires at
  most once per lead however often the evaluator runs.

RLS follows lead scoping for conversations/messages (`can_access_lead`) and
admin/manager-writes-staff-reads for the configuration tables. The WhatsApp
transport is deferred behind `src/lib/messaging/provider.ts`: with no
`WHATSAPP_*` env vars, outbound messages persist as `queued`.

Cut for now: a normalized `communication_consents` table (the boolean
suppression list covers opt-out today) and `payment_transactions`.

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
new tables — Phase 4 added `message_templates`, `conversations`, `messages`,
`audience_segments`, `campaigns`, `campaign_recipients`, `message_suppressions`,
`nurture_rules`, `nurture_runs` (see the Phase 4 section above).
