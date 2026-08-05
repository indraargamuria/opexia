# PROGRESS.md — Opexia Project Tracker

**Last Updated:** 2026-07-22
**Current Phase:** Phase 2: Backend Integration & Hono RPC Setup

---

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
