# RBAC — Roles, Access Control, and Audit Logging

## Roles (Phase 1)

| Role | Can see | Can do |
| --- | --- | --- |
| `super_admin` | Everything | Everything, including creating/deactivating staff logins and managing API keys |
| `admissions_manager` | Every lead | Manage leads, assign/reassign counselors, update status, manage programs/cycles/sources |
| `counselor` | Only leads currently assigned to them | Update status, add notes/tasks, on their own leads |
| `document_reviewer` | Every lead (needed for Phase 2/3 document review) | Read-only on leads in Phase 1 — document actions arrive in Phase 2 |
| `student` | (Phase 2+) | N/A in Phase 1 — no student-facing surface exists yet |

Defined in `supabase/migrations/*_extensions_and_helpers.sql` (the
`user_role` enum) and `*_profiles_and_roles.sql` (`user_roles` table +
helper functions). Display labels live in `src/lib/permissions.ts` — that
file is **presentation only** (nav visibility, badges); it enforces
nothing by itself.

## The enforcement layer: Row Level Security

**RLS policies (`supabase/migrations/*_rls_policies.sql`) are the actual
access control**, not the UI and not `requireUser()`. Every table has RLS
enabled; policies are written in terms of a few SECURITY DEFINER helper
functions so the logic lives in one place:

- `public.has_role(role)` / `public.current_user_roles()`
- `public.is_staff()` — any role except `student`
- `public.is_admin_or_manager()` — `super_admin` or `admissions_manager`
- `public.can_access_lead(lead_id)` — admin/manager, or `document_reviewer`,
  or the lead's `assigned_counselor_id`

Concretely: `leads_select_scoped` allows a row if
`is_admin_or_manager() OR has_role('document_reviewer') OR
assigned_counselor_id = auth.uid()`. A counselor querying `leads` from the
browser or a server action — no matter what the UI tried to show them —
physically cannot receive another counselor's lead row from Postgres.
`lead_activities`, `lead_status_history`, `lead_assignments`, and `tasks`
all key off `can_access_lead()` so the same scoping applies to a lead's
whole timeline, not just the lead row itself.

**Two clients, two trust levels:**

- `src/lib/supabase/server.ts` — session-scoped, used by every
  page/Server Action. Subject to RLS as the signed-in user. **Use this
  unless you have a specific reason not to.**
- `src/lib/supabase/admin.ts` — service-role, **bypasses RLS entirely**.
  Only imported by: the public `/api/leads` route (no user session exists
  there) and the Super Admin user-creation action (`auth.admin.createUser`
  requires it). Anything using this client is responsible for its own
  authorization logic — see `docs/API.md` for how `/api/leads` does that
  (API key check) since it can't rely on RLS.

## `requireUser()` — the UX layer, not the security layer

`src/lib/auth.ts`'s `requireUser(allowedRoles?)` redirects a signed-out
visitor to `/login`, and redirects a signed-in user lacking every allowed
role to `/dashboard`. It's called at the top of every page and every
mutating Server Action. **Its job is a good user experience** (don't render
a "Create User" form for a counselor who'll just get an RLS error on
submit) — the actual "can this user do this" answer is still decided by
RLS (for data) or an explicit role check inside the action (for anything
that doesn't map to a simple row, like `auth.admin.createUser`).

## Audit logging

`src/lib/audit/log.ts`'s `writeAuditLog()` writes one row to `audit_logs`
(actor, action, entity type/id, previous/new value JSON, context, time).
It never throws — a failed audit write logs to the console but doesn't
roll back the mutation it's describing.

Called from every action that the roadmap calls out as needing a trace:
lead creation, status changes, counselor assignment, staff user
creation/deactivation, API key creation/revocation. When adding a new
mutation in a later phase, ask "would a Super Admin want to see who did
this and when" — if yes, call `writeAuditLog()`.

`audit_logs` itself has no `update`/`delete` RLS policy at all (only
`select` for admin/manager and `insert` for staff) — so even a
super-admin-authenticated client can't alter or remove an existing audit
row; only new rows can be appended. Only the service-role client used by
`/api/leads` bypasses this, which is expected — the public route doesn't
have a per-staff actor to check against.
