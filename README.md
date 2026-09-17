# College CRM

A single-college Education CRM and Admission Management System, covering the
journey **Website Visitor → Lead → Counseling → Application → Documents →
Fee Payment → Admission → Student**, built in four phases. See
[`docs/PRD.md`](docs/PRD.md) for the full product context.

**Phase 1 (this codebase, so far): College CRM — Lead Capture & Lead
Tracking.** Phases 2–4 (Student Portal, Admissions Dashboard, WhatsApp/
Campaigns) build on this same foundation and haven't started yet.

## Tech stack

- **Frontend/Backend:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- **UI components:** hand-written shadcn/ui-style primitives on Radix UI
  (see `docs/ARCHITECTURE.md` for why — the shadcn CLI's registry wasn't
  reachable from the build environment this was scaffolded in)
- **Database/Auth/Storage:** Supabase (Postgres + Row Level Security,
  Supabase Auth)
- **Validation:** Zod
- **Charts:** Recharts

## Getting started (local development)

### 1. Create a Supabase project (free tier)

1. Go to [supabase.com](https://supabase.com), create an account, and create
   a new project (the Free plan is enough for Phase 1 and for development).
2. In **Project Settings → API**, copy the **Project URL**, **anon public**
   key, and **service_role** key.

### 2. Apply the database schema

In the Supabase dashboard, open **SQL Editor** and run each file in
`supabase/migrations/` **in filename order** (they're numbered/timestamped
for this reason). Then, optionally, run `supabase/seed/seed.sql` to load
demo data (a program, staff accounts, and ~25 sample leads) so you have
something to click through.

If you use the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
and Docker instead, `supabase db reset` applies both migrations and seed
data to a local instance in one step.

> **Demo login (only if you ran seed.sql):** `admin@democollege.edu` /
> `DemoPass123!` (super admin) — see `supabase/seed/seed.sql` for the other
> demo accounts. Change or remove these before using the project for
> anything real.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from step 1.

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected
to `/login`. There is no self-signup; either use a seeded demo account, or
create your first super admin directly in Supabase (Authentication → Add
user, then insert matching rows into `profiles` and `user_roles` with role
`super_admin` via the SQL Editor) and use that to create the rest of the
team from **Settings → Users**.

### 5. Connect the college website

Once logged in as a super admin, go to **Settings → Website Integration** to
generate an API key, then follow
[`docs/WEBSITE-INTEGRATION.md`](docs/WEBSITE-INTEGRATION.md) to wire up the
college's existing enquiry form.

## Deployment

This app deploys as an ordinary Next.js app. **Netlify** (via
`@netlify/plugin-nextjs`, configured in `netlify.toml`) is a good default —
it has a generous free tier and needs no server management, which fits a
single-college deployment. Vercel works equally well if preferred; both
detect the Next.js app automatically.

1. Push this repo to GitHub (or your Git provider of choice).
2. In Netlify (or Vercel), create a new site from the repo — the build
   command and output are already configured in `netlify.toml`.
3. Add the same environment variables from `.env.local` (step 3 above) in
   the platform's site settings, plus set `NEXT_PUBLIC_APP_URL` to the
   deployed URL once you know it.
4. Deploy. Your Supabase project is already live (it's hosted, not part of
   this deploy), so no separate database step is needed here.

## Project structure

```
src/
  app/                  Routes (App Router)
    (app)/               Authenticated staff shell: dashboard, leads, settings
    api/leads/           Public lead-capture endpoint
    login/
  features/             UI + data-fetching grouped by domain
    dashboard/
    leads/
    nav/
  lib/                  Cross-cutting: supabase clients, auth, permissions,
                         audit logging, rate limiting, api keys
  types/database.ts     Hand-written Supabase Database type
supabase/
  migrations/           SQL migrations, run in filename order
  seed/                 Demo data
docs/                   PRD, architecture, database, API, RBAC, workflows
```

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product requirements and roadmap (all 4 phases)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture and key decisions
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema and the lead→student data model
- [`docs/API.md`](docs/API.md) — the public `/api/leads` endpoint
- [`docs/RBAC.md`](docs/RBAC.md) — roles and how access control is enforced
- [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) — key user journeys
- [`docs/WEBSITE-INTEGRATION.md`](docs/WEBSITE-INTEGRATION.md) — connecting the college website

## Status

- ✅ **Phase 1 — College CRM (Lead Capture & Lead Tracking):** implemented
- ⬜ Phase 2 — Student Dashboard (Application, Documents, Fees)
- ⬜ Phase 3 — College Admissions Dashboard (Students, Documents, Admissions)
- ⬜ Phase 4 — WhatsApp API + Campaigns + Nurturing
