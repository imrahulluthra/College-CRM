# Integrations & WhatsApp Automation — Architecture

Status: **approved architecture, not yet implemented.** This is the reviewed
design for the Integrations section (lead sources + WhatsApp Cloud API). It is
written to be built incrementally — see the Development Plan at the end. No
integration code beyond Phase 4's messaging module exists yet.

**Tenancy decision: Path A — instance per college.** Each college runs its own
deployment and its own Supabase project. Isolation is at the deployment
boundary (separate databases), so **no `college_id` / tenant column is added**
and existing role-based RLS is unchanged. "Multi-tenant" is achieved as one
codebase with N isolated deployments. Every integration below therefore stores
exactly one college's configuration, and the single webhook resolves to "this
instance" (still validated against the connected account — see §Security).

> If a future move to one-instance-many-colleges (Path B) is ever needed, it is
> a dedicated migration project: add a `colleges` table + `college_id` on every
> table and rewrite all RLS to be tenant-scoped. It is deliberately out of scope
> here.

---

## A. Current architecture (what exists today)

- **Frontend + backend:** Next.js 16 (App Router, Turbopack), TypeScript. Server
  Components + Server Actions do almost everything; there is **no separate
  backend service**. One public REST route today: `POST /api/leads`.
- **Database / Auth / Storage:** Supabase (Postgres + Row Level Security +
  Supabase Auth + one private Storage bucket). Two client types:
  - **session-scoped** (`src/lib/supabase/server.ts`) — RLS-enforced, used by all
    staff/student UI;
  - **service-role** (`src/lib/supabase/admin.ts`) — bypasses RLS, used only by
    `/api/leads` and user provisioning, and does its own authorization.
- **Auth:** Supabase Auth; `src/proxy.ts` refreshes the session and gates public
  paths; `requireStaff()/requireStudent()/requireUser()` gate pages; roles live
  in `user_roles`.
- **Existing integration (one):** website lead capture. `/api/leads`
  authenticates by **hashed API key** (`api_keys`, `clg_live_…`, sha256 stored,
  shown once), enforces an Origin allowlist + in-memory rate limit, **dedupes by
  normalized phone** (updates instead of duplicating), resolves
  program/source/cycle, and writes `leads` + `lead_activities` +
  `lead_status_history` + `audit_logs`. Its UI is **Settings → "Website
  Integration"** (`/settings/api-keys`) — the tab to be renamed.
- **Phase 4 messaging (already shipped):** `message_templates`, `conversations`,
  `messages`, `campaigns`, `campaign_recipients`, `message_suppressions`
  (opt-outs), `nurture_rules` + `nurture_runs` (idempotent automation), plus the
  WhatsApp **provider seam** `src/lib/messaging/provider.ts` (currently queues,
  no live transport) and an idempotent nurture evaluator.

**Reuse insight:** this work is **not a rebuild**. It is (1) an Integrations
layer in front of lead sources and (2) making the existing WhatsApp provider
seam real (Meta Cloud API send + inbound/status webhook). Phase 4 tables are
extended, never duplicated.

## B. Proposed integration architecture

```
College (this deployment)
   └── Integrations   (new /integrations section; renamed from "Website Integration")
          ├── Lead Sources
          │     ├── Website / Landing form   → reuses /api/leads + api_keys
          │     ├── Meta / Facebook Lead Ads → new: OAuth connect + Meta lead webhook
          │     ├── Inbound API              → reuses /api/leads (documented)
          │     └── CSV import               → new: bulk upload → same dedupe path
          └── Communication
                └── WhatsApp (Meta Cloud API) → new: Embedded Signup + webhook + real send
```

Each connection is a row in a new generic **`integrations`** table so every card
renders uniformly (Connect / Configure / Test / Disconnect / status / last sync /
error log) and future providers (Google Ads, Zapier/Make, landing-page builders)
slot in without schema changes.

## C. Meta WhatsApp architecture (exact flow)

```
College's Meta Business Portfolio
        │  Embedded Signup (OAuth; college authorizes)
        ▼
WhatsApp Business Account (WABA)
        ▼
Phone Number  →  Phone Number ID
        ▼
Meta Cloud API  (graph.facebook.com/v21.0/{phone_number_id}/messages)
        ▼                                   ▲
Our backend (lib/messaging/provider.ts)     │  our single webhook
        ▼                                   │  /api/webhooks/whatsapp
CRM: messages / conversations / leads       │  (Meta posts inbound + statuses)
                                            Meta
```

- **Outbound:** replace the queued return in `provider.ts` with a real POST to
  the Cloud API using the connected `phone_number_id` + decrypted token.
  Suppression check, conversation upsert, message row and status handling
  already exist around the seam.
- **Inbound + status:** new webhook — `GET` answers Meta's verify challenge;
  `POST` receives messages + statuses → verify signature → dedupe by WA
  `message_id` → match/create lead by phone → append inbound message / update
  delivery status (`delivered_at`, `read_at`, `failed`) → trigger automation.

## D. Third-party provider decision — direct Meta is sufficient; no BSP required

Meta's **Cloud API** natively supports programmatic sending, templates, media,
interactive messages and webhooks — every requirement here. A BSP
(Twilio / AiSensy / Interakt) is **not needed**; it would only offload Embedded
Signup / App Review, add prebuilt inbox/flow tooling, or front billing.

**Decision:** build **direct Meta Cloud API** as the primary and only required
transport. **Keep the existing `provider.ts` seam** as the abstraction so a
`TwilioProvider` / BSP adapter can be added later as a single file, selected per
connection via `integrations.provider` — no rework. The real cost of going
direct is operational, not architectural: the **platform operator** must
complete Meta **Business Verification + App Review** for
`whatsapp_business_management` and `whatsapp_business_messaging`.

## E. Required Meta credentials / permissions

**Guided (Embedded Signup) — what the college does:** Integrations → WhatsApp →
Connect → log into Meta → select Business Portfolio + WABA + Phone Number → grant
permissions → return. **They copy nothing.**

**What our backend obtains and stores (server-side, encrypted):** WABA ID, Phone
Number ID, Business ID, display phone number, a long-lived / system-user access
token; then subscribes that WABA to our app's webhook.

**Platform-level (operator, one-time, in env — never per college):** Meta App ID,
**App Secret**, Webhook **Verify Token**, Embedded Signup Config ID. Permissions:
`whatsapp_business_management`, `whatsapp_business_messaging`,
`business_management`; for Meta Lead Ads also `leads_retrieval`,
`pages_show_list`, `pages_manage_metadata`.

**Manual fallback (Advanced setup)** for a college using its own Meta app: App
ID, App Secret, WABA ID, Phone Number ID, Access Token, Verify Token. All secret
fields are **write-only** — masked (`••••1234`) after save, never returned.

## F. Database changes (reconciled with Phase 4 — extend, don't duplicate)

Path A: **no `college_id`** on any table (one college per deployment).

**New tables**

- **`integrations`** — `id`, `provider` (`website` | `meta_leads` |
  `whatsapp_cloud` | future), `type` (`lead_source` | `communication`),
  `status` (`connected` | `connecting` | `error` | `disconnected` |
  `token_expired` | `action_required`), `external_account_id`, `metadata jsonb`,
  `credentials_reference`, `last_sync_at`, `last_error`, timestamps.
- **`integration_secrets`** — `integration_id`, `ciphertext`, `key_version`. Read
  only by the server provider layer. (Alternative: Supabase Vault — see §G.)
- **`whatsapp_accounts`** — `id`, `integration_id`, `waba_id`, `phone_number_id`
  (unique — the webhook resolves on it), `business_name`, `phone_number`,
  `messaging_status`, `template_namespace`, timestamps.
- **`webhook_events`** — `id`, `provider`, `event_type`, `external_event_id`
  (unique → dedupe / idempotency), `payload jsonb`, `processed bool`, `error`,
  `created_at`. Raw audit + replay.
- **`meta_lead_forms`** (Meta Leads) — maps a Meta `form_id` → default program /
  source / counselor for ingested leads.

**Reused / extended Phase 4 tables**

- `message_templates` — add `meta_template_id`, `variables jsonb`,
  `usage_count`; sync real Meta approval `status`.
- `messages` — already has `provider_message_id`, `status`, `error`; add
  `message_type`, `media_url`, `delivered_at`, `read_at`.
- `conversations`, `campaigns`, `campaign_recipients`,
  `message_suppressions` (= opt-outs), `nurture_rules` / `nurture_runs`
  (= automation) — reused as-is.

## G. Security architecture

- **Secrets never leave the server.** Tokens/secrets are **encrypted at rest** —
  preferred: **Supabase Vault** (`vault.secrets`); alternative: an
  `integration_secrets` table holding **AES-256-GCM ciphertext** with the key
  from a server-only `INTEGRATION_ENCRYPTION_KEY` env var. Only the provider
  layer decrypts, and only inside Server Actions / route handlers / the webhook.
- **API/UI exposes only** masked values, status and IDs — never a token. Mirrors
  the existing api-keys pattern (hash stored, key shown once at creation).
- **Webhook authenticity:** verify Meta's `X-Hub-Signature-256` against the App
  Secret before processing; reject otherwise. Persist the raw payload in
  `webhook_events` and process idempotently by `external_event_id`.
- **Defense in depth even on Path A:** the webhook still validates that the
  event's `phone_number_id` / WABA matches the one connected in
  `whatsapp_accounts` before acting, so a stray/misrouted event is dropped.
- **RLS:** new config tables get policies mirroring Phase 4 — staff read,
  `is_admin_or_manager()` write. The webhook uses the service-role client (no
  session) and does its own validation, exactly like `/api/leads`.
- **Never** put secrets in frontend bundles, localStorage, URLs, logs, or normal
  API responses — enforced by keeping all Meta calls in `server-only` modules.

## H. Error handling

User-facing messages are specific and actionable (e.g. "WhatsApp connection
failed: the selected phone number isn't available for this WhatsApp Business
Account"), never "Error 400" / "Something went wrong". Technical detail
(status code, Meta error body) goes to `integrations.last_error` +
`webhook_events.error` + server logs for admins/developers. Connection health
per integration: `connected` / `connecting` / `error` / `disconnected` /
`token_expired` / `action_required`, plus last webhook received and messaging
status on the WhatsApp card.

## Development plan (small, testable steps)

Reconciled with what's already built; each step is independently shippable and
verifiable.

0. **Architecture review** — this document. *No code.*
1. **Step 1 — Inspect** (done; captured in §A).
2. **Step 2 — Rename + landing.** "Website Integration" → **Integrations**; new
   `/integrations` dashboard with grouped cards (Website `connected ✓`, Meta
   Leads, WhatsApp). Presentational; no new backend. Update nav + docs.
3. **Step 3 — Integration framework.** `integrations`, `integration_secrets`,
   `webhook_events` tables + RLS + TS types; secret encryption helper; generic
   status/health model and card actions (Connect/Configure/Test/Disconnect).
4. **Step 4 — Website lead source.** Fold the existing api-keys UX into
   Integrations as a first-class "connected" card (reuses `/api/leads`). Add
   **CSV import** (same phone-dedupe path) and document the inbound API.
5. **Step 5 — Meta Lead Ads.** OAuth connect, subscribe page/forms,
   `POST /api/webhooks/meta` → dedupe → `leads`. Verify: Meta Lead → CRM lead.
6. **Step 6 — WhatsApp connect.** Embedded Signup flow + manual fallback →
   `whatsapp_accounts`, encrypted token, Test Connection.
7. **Step 7 — WhatsApp webhook.** `/api/webhooks/whatsapp` verify + inbound +
   status → conversations/messages. Verify: message → Meta → webhook → CRM.
8. **Step 8 — Outbound real send.** Implement the Meta Cloud API call inside the
   existing `provider.ts` seam (queued → real). Downstream already works.
9. **Steps 9–11 — Templates / Campaigns / Automation.** Upgrade the existing
   Phase 4 surfaces: sync real Meta template status, send via the real provider,
   honor the 24-hour session-window / template rules; extend automation with
   delay + branch steps (idempotent evaluator already exists).
10. **Step 12 — Wire CRM end-to-end** and test: Meta Ad → Lead → automation →
    WhatsApp → reply → webhook → counselor.

Each step: inspect first, reuse existing code, database-first, RLS enforced,
audit important mutations, real data (no invented metrics), verify
(build/lint/screenshots) before commit.
