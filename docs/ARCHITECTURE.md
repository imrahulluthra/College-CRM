# Architecture

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend/Backend | Next.js 16 (App Router), TypeScript | Server Components + Server Actions for almost everything; no separate backend service. |
| Styling/UI | Tailwind CSS v4, hand-written shadcn/ui-style components on Radix UI primitives | See "Deviation" below. |
| Database/Auth/Storage | Supabase (Postgres, Row Level Security, Supabase Auth) | Storage isn't used yet (Phase 2 needs it for documents). |
| Validation | Zod | Used in both the public API route and every server action. |
| Charts | Recharts | Wrapped by `src/components/ui/chart.tsx`. |
| Deployment | Netlify (`netlify.toml` + `@netlify/plugin-nextjs`) or Vercel | Either works; Netlify chosen as the documented default for cost/simplicity on a single-college deployment. |

### Deviation from the suggested setup: shadcn/ui CLI

The project was scaffolded in an environment whose network policy blocks
`ui.shadcn.com` (the CLI fetches its component registry from there). Rather
than block on that, the shadcn/ui-style components under `src/components/ui`
were hand-written directly against `@radix-ui/react-*` packages (a normal
npm registry, unaffected by the block), matching the same API/structure the
CLI would have generated. `components.json` is still present so the CLI
can be used normally in an environment that *does* have network access to
it (e.g. to add a new component later — `npx shadcn add <component>` should
just work).

### Deviation: Next.js 16, not "Next.js" unspecified

Next.js 16 was current at scaffold time and was used as-is. It renamed
`middleware.ts` → `proxy.ts` (`src/proxy.ts`) and changed a few other
conventions — see `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
in this repo for the full list if something looks unfamiliar. Route-group
layouts (e.g. `src/app/(app)/layout.tsx`) don't get a typed `LayoutProps`
entry from Next's typegen in this version, so that one file types its props
by hand instead — noted inline in the file.

## System overview (Phase 1)

```
College website (existing, unmodified)
        │  POST (API key)
        ▼
/api/leads  ──────────────────────────────┐
        │  service-role client            │
        ▼                                 │
   Supabase Postgres  ◄────────────────────┤  staff browser (RLS-scoped session)
   (RLS enforced)                          │
        ▲                                  │
        │  server components/actions       │
        └── Next.js app (this repo) ───────┘
```

- The **public lead-capture endpoint** (`src/app/api/leads/route.ts`) has no
  Supabase user session — it authenticates via a per-integration API key and
  uses the **service-role client** (`src/lib/supabase/admin.ts`), which
  bypasses RLS. It is therefore responsible for its own authorization
  checks (see `docs/API.md`).
- **Everything staff-facing** runs through Server Components/Server Actions
  using the **session-scoped client** (`src/lib/supabase/server.ts`), so
  every query is subject to Postgres Row Level Security as that signed-in
  user. This is the real enforcement layer for roles — see `docs/RBAC.md`.
  `requireUser()` (`src/lib/auth.ts`) is a UX convenience (redirect before
  rendering something the user can't use) on top of that, not the security
  boundary itself.

## Repository structure

```
src/
  app/
    (app)/            Authenticated staff shell (layout enforces auth)
      dashboard/
      leads/           list + [id] detail + shared server actions (actions.ts)
      settings/
        users/          Super Admin: create/deactivate staff logins
        api-keys/       Super Admin: manage website-integration API keys
    api/leads/         Public lead-capture endpoint (no session)
    login/
  features/            UI + data-fetching grouped by domain, not by route
    dashboard/          KPIs, funnel, sources, workload, today's ops, recent leads
    leads/               status helpers, list/table/filters, lookups
      detail/             lead-detail-page-specific pieces (header, tabs, forms)
    nav/                 sidebar/mobile nav
  components/ui/       shadcn-style primitives (see deviation above)
  lib/
    supabase/            server/browser/admin clients + env accessors
    audit/                writeAuditLog()
    auth.ts               getCurrentUser/requireUser
    permissions.ts         role labels/constants (display only, not enforcement)
    api-keys.ts            API key generation/hashing
    phone.ts                phone normalization (mirrors the DB trigger)
    rate-limit.ts            best-effort in-memory limiter for /api/leads
  types/database.ts     Hand-written Supabase Database type (see file header)
  proxy.ts              Session refresh + redirect-when-signed-out (ex-middleware)
supabase/
  migrations/          SQL, applied in filename order
  seed/                 Demo data
docs/                  This file and its siblings
```

`features/*` is organized by domain (leads, dashboard) rather than by route,
so Phase 2/3 can add `features/students`, `features/documents`,
`features/payments`, etc. alongside this without reshuffling Phase 1 code.

## Why a hand-written `Database` type instead of generated types

`src/types/database.ts` is maintained by hand to match the SQL migrations,
with a comment at the top explaining the required shape
(`Tables`/`Views`/`Functions`/`Relationships`, etc. — `@supabase/postgrest-js`
silently resolves everything to `never` if these are missing, which is a
sharp edge worth knowing about). Once a real Supabase project exists, prefer
regenerating it with `npx supabase gen types typescript --project-id <id>`
and keep hand-editing only until then.
