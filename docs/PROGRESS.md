# PROGRESS.md — Opexia Project Tracker

**Last Updated:** 2026-08-05
**Current Phase:** Phase 0–1: Test Infrastructure & Master Data Management

---

## Phase 0 — Test Infrastructure & Delivery Automation

| Task | Status |
|------|--------|
| 0.1 Frontend test infrastructure (Vitest + Testing Library) | Complete |
| 0.2 Backend test infrastructure (Vitest + in-memory D1 shim) | Complete |
| 0.3 Type check gates (frontend + backend) | Complete |
| 0.4 Auto commit & push automation | Complete |

### 0.1 Frontend Test Infrastructure
- Added dev deps: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
- `vitest.config.ts`: jsdom environment, `@` alias, `src/test/setup.ts`
- `src/lib/utils.test.ts`: unit tests for `cn()`, `formatDuration()`, `formatMinutes()` (5 tests)
- Scripts: `npm run test`, `npm run test:watch`, `npm run typecheck`

### 0.2 Backend Test Infrastructure
- Added dev deps: `vitest`, `typescript`, `@types/node`, `@types/better-sqlite3`
- `test/d1-shim.ts`: D1-compatible shim over `better-sqlite3` (`prepare/bind/all/first/run/raw/batch/exec`), applies Drizzle migrations to in-memory SQLite
- `test/helpers.ts`: `createTestEnv`, `makeRequest`, `apiRequest`, `db`, `seedUser`, `seedClient`, `seedProject`
- `test/checksum.test.ts`: unit tests for `checksum()` (known SHA-256 vector, determinism, sensitivity)
- `test/projects.integration.test.ts`: integration test for `POST /api/v1/projects` (happy path + validation 400)
- Refactored `checksum` from `src/index.ts` into `src/lib/crypto.ts` for testability
- Scripts: `npm run test`, `npm run typecheck`; tsconfig adds `allowImportingTsExtensions`, `types: [node]`

### 0.3 Type Check Gates
- Added `typecheck` script to both packages: frontend `tsc -b --noEmit`, backend `tsc --noEmit`
- Both packages pass clean with zero errors; oxlint clean of errors (pre-existing fast-refresh warnings only)

### 0.4 Auto Commit & Push Automation
- `scripts/deliver.mjs`: gate-then-commit-then-push pipeline — runs frontend test+typecheck, backend test+typecheck, then `git add -A && git commit && git push`; aborts without committing on any gate failure
- Message from `--msg` flag, positional arg, or `COMMIT_MSG` env; Windows-aware (`npm.cmd`)
- `scripts/deliver.test.mjs`: 8 unit tests (failing gate aborts, all-green flow, arg parsing, no-message guard)
- Root `package.json` with `npm run deliver -- --msg "..."` and `npm test`

---

## Phase 1 — Master Data Management

| Task | Status |
|------|--------|
| 1.1 Clients module (backend CRUD + frontend) | Complete |
| 1.2 Projects module completion (PATCH/DELETE/status/budget) | Complete |
| 1.3 Team Members module completion (PATCH/DELETE) | Complete |
| 1.4 Tags module completion (PATCH/DELETE) | Complete |

### 1.1 Clients Module
- **Backend:** full CRUD `/api/v1/clients` — GET list, GET by id, POST, PATCH (incl. `is_active` toggle), DELETE (soft-delete, blocked with 409 when projects reference the client)
- Validators: `isValidClientCode` (alphanumeric + hyphens), `isUniqueViolation` (walks error cause chain for DrizzleQueryError)
- **Frontend:** `lib/validation.ts`, `api.clients.*`, `useClients/useCreateClient/useUpdateClient/useDeleteClient` hooks; Projects page now has a working "New Project" modal with client picker and a Clients management section (add form + active toggle + delete)
- **Tests:** `test/clients.integration.test.ts` (10), `test/validators.test.ts` (4), `validation.test.ts` (2)

### 1.2 Projects Module Completion
- **Backend:** `src/lib/projects.ts` — `canTransition` status state machine (planning→active/on_hold; active→on_hold/completed; on_hold→active/completed; completed→archived; archived terminal), `isValidDateRange`, `budgetUtilization` (normal <75, attention 75–90, warning 90–100, critical ≥100)
- **Backend routes:** GET `/api/v1/projects` now computes `loggedHours` (sum of `timeEntries.durationMinutes`) and `budgetUtilization`; GET by id (404); POST validates creatable status + date range + duplicate code-per-client (409); PATCH `/api/v1/projects/:id` with transition validation + 404; DELETE blocked 409 while time entries or team members reference the project, else hard delete
- **Archived guard:** `POST /api/v1/time-entries` and `POST /api/v1/timer/start` reject archived projects (400)
- **Frontend:** `lib/budget.ts` (`budgetPercentage`, `budgetLevel`), `api.projects.update/remove`, `useUpdateProject`/`useDeleteProject` hooks; Projects table shows real logged hours in budget bars; per-row Edit/Delete actions; shared `ProjectFormModal` handles both create and edit with inline error display
- **Tests:** `test/projects.test.ts` (unit: transitions, date range, budget), `test/projects-crud.integration.test.ts` (13: get by id, budget aggregation, duplicate 409, status transitions, delete 409/200, archived guards), `budget.test.ts` (frontend)

### 1.3 Team Members Module Completion
- **Backend:** `src/lib/teamMembers.ts` — `isValidTeamRole` enum validator (worker, manager, admin, viewer); `GET /api/v1/users` (with per-user `loggedMinutes`); team-members list now computes per-assignment `loggedMinutes`; added `GET /:id`, `PATCH /:id` (role/billableRate/projectId, role validation, 404), `DELETE /:id` (404, hard delete — historical time entries unaffected since they reference user+project, not the assignment row)
- **Frontend:** `api.users.list`, `api.teamMembers.update/remove`, `useUsers`/`useUpdateTeamMember`/`useRemoveTeamMember` hooks; Team page "Assign Member" modal (user + project pickers, role, rate), per-row Edit/Remove actions, Logged Hrs column, utilization progress bars (logged minutes vs 40h weekly target), Avg Utilization metric card
- **Tests:** `test/teamMembers.test.ts` (unit: role enum), `test/team-members.integration.test.ts` (10: users aggregate, relations + loggedMinutes, get by id, invalid role 400, PATCH role/rate, DELETE preserves time entries, 404s)

### 1.4 Tags Module Completion
- **Backend:** `src/lib/tags.ts` — `isValidHexColor` validator; `category` column added to `tags` via generated migration `0001_add_tags_category.sql`; tags list/get include `usageCount` (junction aggregate); added `GET /:id`, `PATCH /:id` (name/color/category/erpCode, hex + unique-name validation, 404), `DELETE /:id` — blocks 409 when referenced by `invoiced` entries, otherwise deletes junction rows then the tag
- **Frontend:** `lib/color.ts` + `api.tags.update/remove`, `useUpdateTag`/`useDeleteTag` hooks; Tags page "New Tag" modal (color/category/ERP), per-row Edit/Delete, Category badge + ERP code + Usage count columns, metrics wired to real data (Most Used by usageCount, Categories count)

---

## Phase 2 — Time Tracking

| Task | Status |
|------|--------|
| 2.1 Time entries CRUD & filtering | Complete |
| 2.2 Timer hardening | Complete |
| 2.3 Dashboard aggregation | Complete |

### 2.1 Time Entries CRUD & Filtering
- **Backend:** `src/lib/timeEntries.ts` — `isTimeEntryStatus`/`isFinalized` enum helpers, `EDIT_POLICY_WINDOW_DAYS = 7`, `isWithinEditWindow` (worker self-edit policy), `buildEntryFilters` (validated `dateFrom`/`dateTo` mapped to start/end of day, `projectId`, `status`, `userId`)
- **Backend routes:** GET `/api/v1/time-entries` now applies the filters (drizzle `gte`/`lte`/`eq`, 400 on invalid status/date); PATCH `/api/v1/time-entries/:id` — 404 unknown, 409 running (stop timer first), 409 finalized (approved/invoiced immutable), 409 outside edit window (requires manager approval), 400 archived project, recomputes SHA-256 `checksum` on save, replaces `tagIds` junction rows; tagging also supported on create (already existed)
- **Frontend:** `lib/query.ts` (`buildQueryString`, unit tested), `api.timeEntries.list(params)`/`update`, `useTimeEntries(params)` (queryKey includes filters), `useUpdateTimeEntry`; Dashboard now has a working filter bar (date range, project, status, Clear), a functional "Add Manual Entry" modal (project/date/start time/duration/description/tags multi-select) reusing create, and an Edit action for pending entries reusing the same modal via update
- **Tests:** `test/timeEntries.test.ts` (unit: status/finalized enums, edit window incl. custom window, filter building incl. throws), `test/time-entries.integration.test.ts` (11: tag on create, patch within window + checksum change, patch after window 409, patch finalized/running 409, tag replacement, date/project/status/user filters, invalid status 400), `query.test.ts` (frontend)

### 2.2 Timer Hardening
- **Backend:** `src/lib/timer.ts` — `isUnderMinDuration` (discard <1 min), `isOverdue` (12h max, 24h admin override constant), `maxDurationMinutes`; timer/start auto-stops an overdue running timer before allowing a new start, keeps single-running-timer 409 guard; timer/stop deletes sub-minute runs (`discarded: true`) and finalizes others as pending with computed duration + checksum; timer/current auto-stops overdue timers (pending, 720min) before returning
- **Frontend:** `useStartTimer`/`useStopTimer` now optimistic (onMutate sets query data, onError rolls back + refetches); TimeTracker shows a "Timer auto-stopped after the 12h limit" banner when a running timer disappears without a manual stop, plus inline action error messages
- **Tests:** `test/timer.test.ts` (unit: min duration, overdue at 12h, custom max, 24h admin override), `test/timer.integration.test.ts` (10: duplicate start 409, auto-stop-before-start, stop computes 95min pending, sub-minute discard, 404 no timer, current null/auto-stop/relations/requires userId, single running invariant)
- **Tests:** `test/tags.test.ts` (unit: hex validator), `test/tags.integration.test.ts` (8: usage counts, get by id, invalid color 400, duplicate 409, PATCH, delete cascades junction rows, delete blocked on invoiced, 404), `color.test.ts` (frontend)

### 2.3 Dashboard Aggregation
- **Backend:** `src/lib/reports.ts` — `weekBounds` (Monday-start, exclusive 7-day window), `utilizationPercent` (vs 40h target, capped 100), `roundedHours`; `GET /api/v1/reports/me?userId=...` sums `durationMinutes` for non-rejected entries in the current week, counts distinct projects, returns `weeklyTotalMinutes`, `weeklyTotalHours`, `utilizationPercent`, `activeProjects` (400 without userId)
- **Frontend:** `useReportsMe` + `WeeklyReport` type; Dashboard `Total Hours This Week`, `Utilization Rate`, `Active Projects` cards now render real API data (with week-range subtitle); entry create/update invalidate the report query
- **Tests:** `test/reports.test.ts` (unit: Monday-start windowing, 7-day invariant, utilization formula/cap, hours rounding), `test/reports.integration.test.ts` (5: requires userId 400, empty zeros, current-week-only + rejected exclusion, distinct project count, 100% cap)

---

## Phase 3 — Approval Workflow & RBAC

| Task | Status |
|------|--------|
| 3.1 Approve / reject endpoints | Complete |
| 3.2 RBAC middleware | Pending |
| 3.3 Route guards & conditional UI | Pending |

### 3.1 Approve / Reject Endpoints
- **Backend:** `src/lib/timeEntries.ts` — `reviewBlockReason` (pending only; running → "stop the timer", approved/invoiced → finalized, rejected → must resubmit); `POST /api/v1/time-entries/:id/approve` (records `approvedBy`/`approvedAt`, recomputes checksum), `POST /api/v1/time-entries/:id/reject` (requires non-empty `rejectionReason`, records reviewer), `POST /api/v1/time-entries/approve-batch` (approves all pending ids, returns `{ approved, skipped }` with per-id reasons; 400 empty/actor missing, 404 unknown id); PATCH now exempts `rejected` entries from the edit-window check and resubmits them to `pending`, clearing `rejectionReason`
- **Frontend:** new `/approvals` route (sidebar "Approvals") — status filter (pending/approved/rejected/all), checkbox batch select with Approve/Reject Selected toolbar, per-row Approve/Reject, reject-reason modal (required), lock icon + "Locked" label on approved/invoiced rows, rejection note shown inline on rejected rows; `useApproveTimeEntry`/`useRejectTimeEntry`/`useApproveTimeEntries` hooks invalidate entries + reports
- **Tests:** `reviewBlockReason` unit case; `test/approvals.integration.test.ts` (10: actorId/reason required, reject requires reason + records reviewer, approve transitions + approver + checksum change, 409 on running/approved/rejected review, 404 unknown, rejected-edit resubmits + clears reason, full workflow submit→reject→edit→resubmit→approve→locked, batch input validation + unknown 404, batch approves 2 / skips finalized with reason)

## Completed Features

### Layout Shell
- Application shell with fixed left sidebar (w-64, bg-dark-accent)
- Sticky top header (h-16, bg-white, border-b) with TimeTracker centered and profile right
- Main content area (ml-64, bg-light-bg, p-6)
- Sidebar navigation: Dashboard, Projects, Team, Reports, Tags, Settings
- Active state routing via TanStack Router (bg-brand for active, hover states for others)
- User avatar and role display pinned to sidebar bottom

### Time Tracker (Flagship Component)
- Interactive Start/Stop controls wired to real API endpoints
- Live HH:MM:SS timer with `font-mono tabular-nums` synced to active timer
- Project dropdown populated from real projects via API
- Pulsing brand dot (`animate-pulse-dot`) when running
- Dropdowns locked during active tracking
- 1-second auto-refresh when timer is running

### Dashboard (`/`)
- Page header with "Add Manual Entry" CTA
- 3-column metric summary cards: Total Hours (32h 15m), Utilization (87%), Active Projects (5)
- High-density recent time entries table (h-9 rows)
- Status badges: running, pending, approved, rejected, invoiced
- Tag pills with brand-light background
- Mono font duration column

### Projects (`/projects`)
- High-density project table (h-9 rows)
- Columns: Project name, Client, Code (mono), Status, Budget progress bar, Duration
- Status badges: planning, active, on_hold, completed, archived
- Budget utilization progress bars with color thresholds (brand < 90%, warning 90-99%, error 100%)
- 8 mock projects with realistic data

### Team (`/team`)
- Team member management table with avatar initials, email, role, rate, project allocations, weekly hours, status
- Role badges: admin (purple), manager (brand), worker (emerald), viewer (slate)
- Summary metric cards: Total Members, Active, Avg Utilization, Total Weekly Hours
- Project allocation display per member with percentage
- 6 mock team members

### Reports (`/reports`)
- Project Summary table with hours, billable hours, budget progress bars, total cost
- Team Utilization sidebar table with color-coded utilization percentages
- Period selector (This Week, This Month, This Quarter, Custom Range)
- Export buttons: Export Excel (secondary), Export CSV (outline)
- Summary metric cards: Total Hours, Billable Hours, Total Revenue, Avg Utilization
- 5 mock project summaries + 5 team utilization entries

### Tags (`/tags`)
- Tag management table with color dot, name, category badge, ERP code, usage count, actions
- Category badges: Billing, Type
- Edit and delete action buttons per row
- Summary metric cards: Total Tags, Most Used, ERP Mapped, Categories
- 8 mock tags with realistic ERP codes and usage data

### Settings (`/settings`)
- Settings navigation sidebar (Workspace, Notifications, Billing, Security)
- Workspace section: Organization name, workspace slug, currency, timezone
- Approval Policy section: approval required level, manual entry window, max timer duration
- ERP Integration section: export format selector, cost center mapping info
- Danger Zone: delete workspace with red styling
- Form inputs following DESIGN.md h-9, focus:ring-brand patterns

### Profile (`/profile`)
- User profile card with avatar, name, email, role, join date
- Personal information form: first/last name, email, role (disabled), hourly rate
- Preferences form: timezone, date format, weekly start day
- Security section: change password fields, two-factor authentication toggle
- All forms with Save Changes buttons

### Login (`/login`)
- Split-screen layout: 50/50 on large screens (hidden left panel on mobile)
- Left panel: bg-dark-accent, opexia logo, "Intelligent Time Orchestration" tagline, feature pills (Real-time capture, Audit-ready), progress dots
- Right panel: bg-light-bg, centered form with email/password inputs, Sign In button, SSO button
- Mock authentication: stores dummy JWT token + user object in localStorage on submit
- Redirects to `/` via `useNavigate` after 800ms simulated loading
- Loading spinner state on button during auth
- Inline validation error display
- "Forgot password?" placeholder link
- "Accounts are provisioned by your organization administrator" notice
- No sign-up or registration links (enterprise-only provisioning)
- Root layout (`__root.tsx`) conditionally renders shell — login route renders without sidebar/header

### TopHeader Update
- Profile avatar and name in top header now link to `/profile` route via TanStack Router `Link`
- Dropdown menu on avatar click: shows user email, Profile link, and Sign out button
- Click-outside handler closes dropdown automatically
- Logout clears `opexia_token` and `opexia_user` from localStorage, redirects to `/login`
- Logout button styled with `text-error` and red hover background

---

## Design System Compliance

All pages follow `docs/DESIGN.md`:

| Constraint | Status |
|-----------|--------|
| Color palette: `#17A5DC` brand, `#0F4664` dark-accent, `#F8FBFD` light-bg | Compliant |
| Table row height: `h-9` (36px) | Compliant |
| Cell padding: `px-3 py-1.5` | Compliant |
| Table header: `bg-light-bg text-xs font-semibold uppercase tracking-wide text-muted` | Compliant |
| Header height: `h-10` | Compliant |
| Button variants: primary, secondary, outline, destructive | Compliant |
| Form inputs: `h-9 px-3 rounded-md border-border focus:ring-brand/20` | Compliant |
| Status badges: `rounded-full px-2 py-0.5 text-xs font-medium` | Compliant |
| Cards: `rounded-lg border border-border bg-white p-4` | Compliant |
| Page padding: `p-6` | Compliant |
| Typography: Inter font family, design system size scale | Compliant |
| No comments in code | Compliant |
| Lucide icons | Compliant |

---

## File Structure

```
frontend/src/
  main.tsx                          # Entry point
  App.tsx                           # QueryClientProvider + RouterProvider
  index.css                         # Tailwind v4 @theme with design tokens
  lib/
    utils.ts                        # cn(), formatDuration(), formatMinutes()
    api.ts                          # Typed fetch API client (projects, team-members, tags, time-entries)
  hooks/
    index.ts                        # Barrel export for all hooks
    useProjects.ts                  # useProjects, useCreateProject
    useTeamMembers.ts               # useTeamMembers, useAssignTeamMember
    useTags.ts                      # useTags, useCreateTag
    useTimeEntries.ts               # useTimeEntries, useCreateTimeEntry
    useTimer.ts                     # useActiveTimer, useStartTimer, useStopTimer
  components/
    layout/
      Sidebar.tsx                   # Fixed left navigation
      TopHeader.tsx                 # Sticky top header + TimeTracker + profile dropdown
      TimeTracker.tsx               # Interactive start/stop timer
  routes/
    __root.tsx                      # Root layout shell (skips shell for /login)
    login.tsx                       # Split-screen login page
    index.tsx                       # Dashboard page
    projects.tsx                    # Projects management
    team.tsx                        # Team member management
    reports.tsx                     # Reports and exports
    tags.tsx                        # Tag management
    settings.tsx                    # Workspace settings
    profile.tsx                     # User profile
  __generated/
    routeTree.gen.ts                # Auto-generated by TanStack Router

backend/
  src/
    index.ts                        # Hono entry point (projects, team-members, tags, time-entries CRUD)
    db/
      schema.ts                     # Drizzle schema: 8 tables, 24 indexes, relations
  drizzle/
    migrations/                     # Drizzle migration files
  wrangler.jsonc                    # Workers config (D1 binding: opexai_db)
  drizzle.config.ts                 # Drizzle Kit config (local sqlite.db)
  worker-configuration.d.ts         # Generated Cloudflare types
```

---

## Phase 2: Backend Integration & Hono RPC Setup

### Backend Architecture & Schema

#### Tech Stack & Runtime

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Cloudflare Workers | compatibility_date: 2026-07-17 |
| Framework | Hono | 4.12.30 |
| Database | Cloudflare D1 (SQLite at edge) | binding: `opexai_db` |
| ORM | Drizzle ORM | 0.45.2 |
| Migration | Drizzle Kit | 0.31.10 |
| Bundler | Wrangler | 4.110.0 |
| Language | TypeScript (ESNext) | - |
| JSX | hono/jsx | - |

**Entry point:** `backend/src/index.ts` — Hono app with CORS middleware, CRUD API routes for projects, team members, tags, time entries, and timer start/stop/current endpoints.

#### Database Schema Overview

**8 tables** defined in `backend/src/db/schema.ts` with full Drizzle relations and 24 indexes.

| Table | Key Columns | Constraints |
|-------|------------|-------------|
| **users** | id (PK), email (unique), name, avatarUrl, timestamps | idx on email |
| **clients** | id (PK), name (unique), code (unique), billingRate, currency, address, isActive, timestamps | idx on code, isActive |
| **projects** | id (PK), clientId (FK→clients), name, code, description, status, budgetHours, budgetCost, startDate, endDate, timestamps | idx on clientId, status, (clientId+status) |
| **team_members** | id (PK), userId (FK→users), projectId (FK→projects), role, billableRate, assignedAt, timestamps | idx on userId, projectId, (userId+projectId), role |
| **tags** | id (PK), name (unique), color, erpCode, timestamps | idx on name |
| **time_entries** | id (PK), userId (FK→users), projectId (FK→projects), description, startedAt, endedAt, durationMinutes, status, entryMethod, approvedBy (FK→users), approvedAt, rejectionReason, checksum, timestamps | 7 composite indexes |
| **time_entry_tags** | timeEntryId (FK→time_entries), tagId (FK→tags) | idx on both FKs |
| **audit_logs** | id (PK), entityType, entityId, action, actorId (FK→users), payload, checksum, createdAt | idx on entity, actor, action, createdAt |

**Enum values:**
- `projects.status`: planning, active, on_hold, completed, archived
- `team_members.role`: worker, manager, admin, viewer
- `time_entries.status`: running, pending, approved, rejected, invoiced
- `time_entries.entry_method`: timer, manual, import

**Relations:**
```
users ──1:N──> team_members ──N:1──> projects ──N:1──> clients
users ──1:N──> time_entries ──N:1──> projects
users ──1:N──> audit_logs
time_entries ──M:N──> tags (via time_entry_tags)
time_entries ──N:1──> users (approved_by)
```

#### Current API Routes

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| `GET` | `/api/v1/projects` | Complete | List all projects with client relation |
| `POST` | `/api/v1/projects` | Complete | Create project |
| `GET` | `/api/v1/team-members` | Complete | List all team members with user and project relations |
| `POST` | `/api/v1/team-members` | Complete | Assign team member to project |
| `GET` | `/api/v1/tags` | Complete | List all tags |
| `POST` | `/api/v1/tags` | Complete | Create tag |
| `GET` | `/api/v1/time-entries` | Complete | List time entries with user, project, and tag relations |
| `POST` | `/api/v1/time-entries` | Complete | Create time entry with SHA-256 checksum generation |
| `POST` | `/api/v1/timer/start` | Complete | Start timer (status: running, entryMethod: timer) |
| `POST` | `/api/v1/timer/stop` | Complete | Stop timer (compute duration, generate checksum, status: pending) |
| `GET` | `/api/v1/timer/current` | Complete | Fetch active running timer for user |

#### Backend Integration Roadmap

**Phase 2a — API Scaffold + Hono RPC Client (IN PROGRESS):**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/projects` | GET, POST | List/create projects | Complete |
| `/api/v1/team-members` | GET, POST | List/assign members | Complete |
| `/api/v1/tags` | GET, POST | List/create tags | Complete |
| `/api/v1/time-entries` | GET, POST | List/create time entries | Complete |

**Phase 2b — Time Tracker & Entries:**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/timer/start` | POST | Start timer | Complete |
| `/api/v1/timer/stop` | POST | Stop timer | Complete |
| `/api/v1/timer/current` | GET | Get active timer | Complete |
| `/api/v1/time-entries` | GET | List (filtered) | Complete |
| `/api/v1/time-entries/:id` | PATCH | Edit entry | Pending |
| `/api/v1/time-entries/:id/approve` | POST | Approve entry | Pending |
| `/api/v1/time-entries/:id/reject` | POST | Reject with note | Pending |

**Phase 2c — Reports & Audit:**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/v1/reports/project/:id` | GET | Project summary | Medium |
| `/api/v1/reports/client/:id` | GET | Client summary | Medium |
| `/api/v1/reports/export` | GET | Excel/CSV export | Medium |
| `/api/v1/audit-logs` | GET | Audit trail (admin) | Low |

---

### Frontend Integration Status

**Phase 2 — TanStack Query + Typed Fetch Client**

| Task | Priority | Status |
|------|----------|--------|
| Create typed API client wrapper (`lib/api.ts`) | High | Complete |
| Wire TanStack Query hooks for time entries | High | Complete |
| Wire TanStack Query hooks for projects | High | Complete |
| Wire TanStack Query hooks for team members | High | Complete |
| Wire TanStack Query hooks for tags | High | Complete |
| Wire TanStack Query hooks for timer (start/stop/current) | High | Complete |
| Replace static mock data with query results | High | Complete |
| Add loading skeleton states | Medium | Complete |
| Add error boundary and retry UI | Medium | Complete |
| Implement optimistic updates for timer | High | Pending |
| Connect TimeTracker to POST /api/v1/timer/start, stop | High | Pending |
| Wire approval workflow (approve/reject) | Medium | Pending |
| Add real-time dashboard aggregation | Medium | Pending |

### Phase 3 — Auth & RBAC

| Task | Priority | Status |
|------|----------|--------|
| Login page with mock auth (localStorage token) | High | Complete |
| Logout: clear localStorage + redirect to /login | High | Complete |
| Integrate Better Auth session | High | Pending |
| Route guards based on role | High | Pending |
| Conditional UI (hide admin for workers) | Medium | Pending |
| Session refresh and logout flow | High | Pending |

### Phase 4 — Export & Compliance

| Task | Priority | Status |
|------|----------|--------|
| Excel export via SheetJS | Medium | Pending |
| CSV streaming export | Medium | Pending |
| Audit log viewer (admin) | Low | Pending |
| Checksum verification UI | Low | Pending |

---

## Environment

### Frontend

| Tool | Version |
|------|---------|
| React | 19.2.7 |
| TypeScript | 6.0.2 |
| Vite | 8.1.5 |
| TanStack Router | file-based via @tanstack/router-plugin |
| TanStack Query | Latest |
| Tailwind CSS | v4 (@tailwindcss/vite) |
| Lucide React | Latest |
| Linter | oxlint |

### Backend

| Tool | Version |
|------|---------|
| Hono | 4.12.30 |
| Wrangler | 4.110.0 |
| Drizzle ORM | 0.45.2 |
| Drizzle Kit | 0.31.10 |
| Cloudflare D1 | opexai_db binding |
