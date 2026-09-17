# API — `/api/leads`

The only public API in Phase 1. Everything else is Server Components/Server
Actions, not a REST API — there's no separate API surface for the
authenticated CRM itself yet. For a walkthrough aimed at whoever manages
the college website, see `docs/WEBSITE-INTEGRATION.md`; this doc is the
technical reference.

Implementation: `src/app/api/leads/route.ts`.

## `POST /api/leads`

Creates a lead, or (if the phone number normalizes to an existing lead)
records a `duplicate_submission` activity on the existing lead instead —
see "the core principle" in `docs/DATABASE.md`.

### Authentication

One of, in this order of precedence:

1. `x-api-key: <key>` header
2. `Authorization: Bearer <key>` header
3. `api_key` field in the request body (for plain-HTML-form fallback,
   where custom headers aren't possible)

Keys are managed in the CRM under **Settings → Website Integration** (super
admin only) and are hashed (SHA-256) at rest — `src/lib/api-keys.ts`.

### CORS / Origin

If the `LEAD_CAPTURE_ALLOWED_ORIGINS` environment variable is set
(comma-separated), browser requests whose `Origin` header isn't in that
list get `403 Origin not allowed.`. If unset, any origin is allowed (server-
to-server requests, which don't send `Origin`, are never affected either
way). See `docs/WEBSITE-INTEGRATION.md` for why this matters even though
the key itself is required.

### Rate limiting

A best-effort, in-memory, 30-requests-per-minute-per-(key, IP) limiter
(`src/lib/rate-limit.ts`). It resets on server restart and isn't shared
across instances — treat it as a first line of defense, not a hard
guarantee, and see that file's comment for how to upgrade it if needed.

### Request body

`Content-Type: application/json`, `application/x-www-form-urlencoded`, or
`multipart/form-data` are all accepted.

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | Full name, 2–200 chars |
| `phone` | yes | Any format; normalized server-side to the last 10 digits |
| `email` | no | Must be a valid email if present |
| `program` | no | Program slug or name; falls back to the only active program if there's exactly one and this is omitted |
| `city`, `state` | no | |
| `source` | no | Matched case-insensitively against `lead_sources.name`; defaults to "Website" |
| `campaign`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `landing_page` | no | Stored as-is |

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| `201` | `{ success: true, duplicate: false, leadId }` | New lead created |
| `200` | `{ success: true, duplicate: true, leadId }` | Existing lead found by phone; activity recorded, no new lead |
| `400` | `{ error, details? }` | Validation failure (`details` is a Zod field-error map) or unparseable phone number |
| `401` | `{ error: "Missing API key." \| "Invalid API key." }` | |
| `403` | `{ error: "Origin not allowed." }` | `LEAD_CAPTURE_ALLOWED_ORIGINS` is set and the request's Origin isn't in it |
| `429` | `{ error: "Too many requests." }` | Rate limited |
| `500` | `{ error: "Could not save the lead." }` | Unexpected server/database error (logged server-side) |

Every response — including errors — carries the CORS headers, so a
browser-side `fetch` can read the error body rather than getting an opaque
network failure.

### `OPTIONS /api/leads`

CORS preflight handler; returns `204` with the same CORS headers.

### Example

```bash
curl -X POST https://YOUR-CRM-DOMAIN/api/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: clg_live_..." \
  -d '{"name":"Test Lead","phone":"9876543210","email":"test@example.com"}'
```

## What happens internally on a successful create

1. Validate + normalize phone.
2. Look up an existing lead by `phone_normalized` (service-role client —
   this route has no user session, so it does its own authorization
   entirely via the API key check above, not RLS).
3. If found: update `last_activity_at` (and backfill any null
   email/city/state), insert a `duplicate_submission` activity, return.
4. If not found: resolve `program_id` (by slug, then by name, then the
   sole active program) and `source_id`, resolve the program's active
   `admission_cycle_id`, insert the lead with `status = 'NEW'`, insert a
   `created` activity and a `lead_status_history` row, write an audit log
   entry (`lead.created`), return.

Counselor assignment is **not** automatic — Phase 1 deliberately leaves
new leads unassigned; a Super Admin/Admissions Manager assigns them from
the lead detail page (`docs/WORKFLOWS.md`).
