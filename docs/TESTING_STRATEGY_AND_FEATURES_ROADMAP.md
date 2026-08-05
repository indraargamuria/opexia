# TESTING STRATEGY & FEATURES ROADMAP

**Document Version:** 1.0
**Classification:** Internal
**Last Updated:** 2026-08-05
**Source of Truth:** `docs/PRD.md`, `docs/DESIGN.md`, `docs/PROGRESS.md`

---

## 1. Testing Strategy

### 1.1 Testing Pyramid

Every feature task is delivered through **three mandatory gates**. A task is **not complete** until all three pass:

```
             ▲
            │  INTEGRATION (1 per task)
           │
          │   TYPE CHECK (tsc, both packages)
         │
        │    UNIT (fast, isolated, > 90% coverage on new code)
       │
```

| Gate | What it verifies | Tooling | Fail policy |
|------|------------------|---------|-------------|
| **Unit Test** | Pure logic: validators, checksums, duration math, formatters, hooks in isolation, route handlers against in-memory DB | Vitest (frontend + backend) | Task blocked, no commit |
| **Type Check Test** | Compile-time correctness across the whole monorepo | `tsc -b` (frontend), `tsc --noEmit` (backend) | Task blocked, no commit |
| **Integration Test** | Cross-boundary behavior: frontend hook ↔ API client ↔ backend route ↔ DB. Verifies contracts end-to-end against seeded in-memory SQLite | Vitest + Hono `app.request()` + better-sqlite3 (D1 mock) | Task blocked, no commit |

### 1.2 Test Runners & Layout

#### Frontend (`frontend/`)
- Runner: **Vitest** + `@testing-library/react` + `@testing-library/user-event` + `jsdom`.
- Unit tests: colocated `*.test.ts(x)` next to source.
- Component/hook tests mount against mocked query client (`QueryClientProvider` + mocked `lib/api`).
- Integration tests: run against the real backend app via an injected base URL pointing at the Vitest-managed Hono instance (contract tests), or MSW where edge latency is simulated.
- Type check gate: `npm run typecheck` → `tsc -b`.

#### Backend (`backend/`)
- Runner: **Vitest** + Hono's built-in `app.request()` test client.
- DB strategy: `better-sqlite3` (already a devDependency) via `drizzle-orm/better-sqlite3` standing in for D1. A `createTestDb()` helper seeds schema + fixtures and is re-created per test (`beforeEach`).
- Unit tests: checksum helper, validation, business rules (single active timer, min/max duration, budget thresholds, status transitions).
- Integration tests: full HTTP round-trips through `app.request()` — request → route → Drizzle → SQLite → response, asserting status codes, payload shapes, and DB state.
- Type check gate: `npm run typecheck` → `tsc --noEmit`.

### 1.3 Contract & Fixtures
- A shared fixture factory (`backend/test/fixtures.ts`) creates a valid user, client, project, tags, and time entry so each test seeds only the delta it needs.
- API response shapes are asserted via `@types` exported from `backend/src/index.ts` (`AppType`) so frontend hooks and backend routes compile against the same contract.
- Deterministic clocks: timer math uses an injectable `now()` so duration calculations are stable under test.

### 1.4 Definition of Done (per task)

A task ships **only** when the automation below reports green:

```
1. Implement feature slice (backend + frontend)
2. Write unit tests for all new/changed pure logic
3. Run unit tests        → npm run test          (all pass)
4. Run type check test   → npm run typecheck     (both packages pass)
5. Run integration test  → npm run test:integration (all pass)
6. Auto commit + push    → npm run deliver       (stages, commits, pushes)
```

### 1.5 Auto Commit & Push Automation

A shared script (e.g. `scripts/deliver.mjs` at repo root) executes the gates and only then commits and pushes. It reads the task's commit message from a `--msg` flag (or `COMMIT_MSG` env / positional arg).

```jsonc
// frontend/package.json (same pattern in backend/)
{
  "scripts": {
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "typecheck": "tsc -b --noEmit"
  }
}
```

```jsonc
// root scripts/deliver.mjs
// 1. run: cd frontend && npm run test && npm run typecheck
// 2. run: cd backend  && npm run test && npm run typecheck
// 3. run: cd frontend && npm run test:integration
// 4. if all green: git add -A && git commit -m "<message>" && git push
// 5. on any failure: exit 1, do NOT commit, print failing gate
```

**Commit convention:** `feat(<area>): <summary>` — e.g. `feat(clients): full CRUD with tests`. One commit per task, atomic and pushable.

> **Note:** until `scripts/deliver.mjs` lands (Task 0.4), tasks still ship manually but the three gates remain mandatory.

---

## 2. Features Roadmap

The roadmap is derived from the **existing pages** (`Dashboard`, `Projects`, `Team`, `Reports`, `Tags`, `Settings`, `Profile`, `Login`, global `TimeTracker`) plus the backend API surface in `backend/src/index.ts`. Each phase groups independent tasks; tasks within a phase can be taken in any order, but later phases depend on earlier ones.

Legend: 🟦 Backend · 🟩 Frontend · 🟪 Both

---

### Phase 0 — Foundation: Test Infra & Delivery Automation

Sets up the gates so every later task is automatically verifiable and self-shipping.

#### Task 0.1 — Frontend test infrastructure 🟩 ✅
- Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` to `frontend/`.
- Add `vitest.config.ts` (jsdom env, `@` alias) and a sample unit test for `lib/utils.ts` (`cn`, `formatDuration`, `formatMinutes`).
- **Unit:** formatter/`cn` edge cases. **Type check:** `tsc -b`. **Integration:** N/A (infra only).
- **Commit:** `test(frontend): add vitest + testing-library setup` — **done 2026-08-05**

#### Task 0.2 — Backend test infrastructure 🟦 ✅
- Add `vitest` to `backend/`. Create `backend/test/helpers.ts` (`createTestDb`, `seedFixtures`, `makeRequest`) using `better-sqlite3` + `drizzle-orm/better-sqlite3` with `drizzle-kit` migration applied in-memory.
- Sample unit test for `checksum()` and an integration test hitting `POST /api/v1/projects`.
- **Unit:** `checksum` known-vector. **Type check:** `tsc --noEmit`. **Integration:** route happy path + validation 400.
- **Commit:** `test(backend): add vitest + in-memory D1 test harness` — **done 2026-08-05** (delivered as `test(backend): add vitest + in-memory D1 test harness`)

#### Task 0.3 — Type check gates 🟪 ✅
- Add `typecheck` scripts to both packages. Ensure CI-style `tsc` runs clean on current code (fix any drift).
- **Unit:** N/A. **Type check:** both packages clean. **Integration:** N/A.
- **Commit:** `chore: add typecheck gates to frontend and backend` — **done 2026-08-05**

#### Task 0.4 — Auto commit & push automation 🟪 ✅
- Add root `scripts/deliver.mjs` implementing the gate-then-commit-then-push flow from §1.5.
- Add `npm run deliver -- --msg "..."` at root.
- **Unit:** unit-test the gate runner with a mocked shell (failing gate must abort). **Type check:** clean. **Integration:** dry-run that a green pipeline ends with a commit.
- **Commit:** `ci: add gate-based auto commit & push pipeline` — **done 2026-08-05**

---

### Phase 1 — Master Data Management

Based on the **Projects**, **Team**, and **Tags** pages. Completes the CRUD surface the pages render and hardens business rules from PRD §3.1.

#### Task 1.1 — Clients module 🟪 ✅
- **Backend:** full CRUD `/api/v1/clients` (list, get by id, create, patch, soft-delete `is_active=false`). Validations: unique `name`/`code`, alphanumeric+hyphen `code`. Restrict delete when projects exist.
- **Frontend:** surface client picker in the Projects page; add a client management section (or drawer) listing clients with active toggle.
- **Unit:** code-format validator, unique-violation mapping, soft-delete guard. **Type check:** both. **Integration:** create → project references client → soft-delete blocked with projects.
- **Commit:** `feat(clients): full CRUD + projects page integration` — **done 2026-08-05**

#### Task 1.2 — Projects module completion 🟪 ✅
- **Backend:** add `GET /:id`, `PATCH /:id`, `DELETE` (soft/restrict), status transition validation (`planning→active→completed→archived`, no new entries on `archived`), `end_date ≥ start_date`, budget warnings at 75/90/100%.
- **Frontend:** wire Projects page create/edit/delete to API; status change control; budget progress bars driven by real `budgetHours` vs logged hours.
- **Unit:** status-machine transitions, budget-threshold calculator, date validation. **Type check:** both. **Integration:** create → transition to archived → timer start against archived project returns 400.
- **Commit:** `feat(projects): status transitions, budget warnings, edit/delete` — **done 2026-08-05**

#### Task 1.3 — Team Members module completion 🟪 ✅
- **Backend:** add `GET /:id`, `PATCH /:id` (role/rate change), `DELETE` (restrict, preserving historical time entries). Enforce manager/admin-only approval assignment later (Phase 3).
- **Frontend:** wire Team page assign/edit/remove to API; role badges from real `role`; utilization from logged hours.
- **Unit:** role enum validation, remove-preserves-entries logic. **Type check:** both. **Integration:** assign member → remove → old time entries still resolvable.
- **Commit:** `feat(team-members): edit/remove + utilization wiring` — **done 2026-08-05**

#### Task 1.4 — Tags module completion 🟪 ✅
- **Backend:** add `GET /:id`, `PATCH /:id`, `DELETE` (cascade junction, block delete if referenced by invoiced entries). Color hex validation, `erp_code` mapping.
- **Frontend:** wire Tags page create/edit/delete; category and ERP display from real data.
- **Unit:** hex validator, cascade-delete guard. **Type check:** both. **Integration:** create → attach to entry → delete → junction rows removed.
- **Commit:** `feat(tags): full CRUD + erp mapping` — **done 2026-08-05**

---

### Phase 2 — Time Tracking (Dashboard + Timer)

Based on the **Dashboard** page and the global **TimeTracker** component.

#### Task 2.1 — Time entries CRUD & filtering 🟪 ✅
- **Backend:** `PATCH /api/v1/time-entries/:id` (edit within policy window; 3-business-day rule requires manager approval), list filters (`dateFrom`, `dateTo`, `projectId`, `status`, `userId`), entry tagging on create/update, immutable `checksum` recompute guard on finalized entries.
- **Frontend:** filter bar on Dashboard; edit action for own pending entries; tag multi-select in manual entry.
- **Unit:** checksum immutability, policy-window rule, filter query building. **Type check:** both. **Integration:** create manual entry → patch within window → patch after window as worker rejected.
- **Commit:** `feat(time-entries): edit, filters, tagging` — **done 2026-08-05**

#### Task 2.2 — Timer hardening 🟪 ✅
- **Backend:** enforce one running timer per user (exists — return 409), min duration 1 min (discard <1 min), max 12h auto-stop (24h admin override), timer start against archived project blocked.
- **Frontend:** optimistic start/stop with rollback on error; auto-stop notification; disable Start when project unselected (exists); offline queuing (stub → Phase 7).
- **Unit:** min/max duration rules, auto-stop trigger, single-active-timer. **Type check:** both. **Integration:** start → duplicate start 409 → stop computes duration → pending.
- **Commit:** `feat(timer): duration policy + optimistic UI` — **done 2026-08-05**

#### Task 2.3 — Dashboard aggregation 🟪 ✅
- **Backend:** `GET /api/v1/reports/me` — weekly total hours (Mon–Sun), utilization % (logged / 40h target, capped 100%), distinct active project count for the current user.
- **Frontend:** replace Dashboard placeholder metrics with real query data; "Add Manual Entry" opens a working modal (reuse Task 2.1 create).
- **Unit:** week boundary math, utilization formula/cap. **Type check:** both. **Integration:** entries across weeks + rejected status → metrics assert correct.
- **Commit:** `feat(dashboard): real weekly metrics + manual entry modal` — **done 2026-08-05**

---

### Phase 3 — Approval Workflow & RBAC

Based on the PRD approval flow and Dashboard status badges.

#### Task 3.1 — Approve / Reject endpoints 🟪 ✅
- **Backend:** `POST /time-entries/:id/approve`, `POST /time-entries/:id/reject` (rejection requires `rejectionReason`), batch approval array endpoint, locked-after-approved rule, `invoiced` set externally.
- **Frontend:** manager approval queue view (batch select → approve/reject), rejection note prompt, locked state on approved rows.
- **Unit:** approve/reject state machine, reason required, batch semantics. **Type check:** both. **Integration:** worker submits → manager rejects with note → worker edits → resubmits → approves → locked.
- **Commit:** `feat(approvals): approve/reject workflow + batch queue` — **done 2026-08-05**

#### Task 3.2 — RBAC middleware 🟪 ✅
- **Backend:** auth-aware middleware resolving the caller's role per project (worker/manager/admin/viewer) from `team_members` + global admin; route guards for reports/audit/export.
- **Frontend:** role-aware API client that includes the session (stub user for now, real in Phase 6).
- **Unit:** permission matrix (PRD §2.3), role resolution. **Type check:** both. **Integration:** viewer denied approve → 403; admin allowed audit logs.
- **Commit:** `feat(rbac): role-based route guards backend + frontend` — **done 2026-08-05**

#### Task 3.3 — Route guards & conditional UI 🟪 ✅
- **Frontend:** TanStack Router guards — workers cannot open admin-only pages; sidebar hides Reports/Team/Tags for workers; login redirect for unauthenticated.
- **Unit:** guard hook matrix, redirect behavior. **Type check:** both. **Integration:** logged-out → `/` redirects to `/login`; worker blocked from `/settings`.
- **Commit:** `feat(rbac): route guards and conditional navigation` — **done 2026-08-05**

---

### Phase 4 — Reports & Export

Based on the **Reports** page.

#### Task 4.1 — Reports backend 🟪 ✅
- **Backend:** `GET /api/v1/reports/project/:id` (hours by tag, budget vs actual, cost), `GET /api/v1/reports/client/:id` (total hours, cost, utilization), `GET /api/v1/reports/team` (utilization per member). < 200ms p95 for ≤ 90-day windows (composite indexes).
- **Unit:** aggregation queries, budget-vs-actual math, date windowing. **Type check:** both. **Integration:** seed 3 projects/5 members → assert per-project and per-client rollups.
- **Commit:** `feat(reports): project/client/team aggregation endpoints` — **done 2026-08-05**

#### Task 4.2 — Reports frontend wiring 🟪 ✅
- **Frontend:** replace Reports mock tables with real aggregation data; period selector (week/month/quarter/custom) drives API filters; utilization color thresholds (brand < 90 / warning / error).
- **Unit:** period-to-range mapper, threshold color function. **Type check:** both. **Integration:** select custom range → rendered table matches API payload.
- **Commit:** `feat(reports): live reports page + period filters` — **done 2026-08-05**

#### Task 4.3 — Excel export 🟪 ✅
- **Backend:** `GET /api/v1/reports/export?format=xlsx` (SheetJS) — schema from PRD §3.3.2 (`Date | Worker | Client | Project | Task Description | Tags | Duration (h) | Rate | Amount | Status`).
- **Frontend:** wire Reports "Export Excel" button to the endpoint (download blob).
- **Unit:** workbook row mapper (headers, amounts, status mapping). **Type check:** both. **Integration:** export returns valid xlsx buffer with expected sheet name/columns.
- **Commit:** `feat(export): excel export with ERP-ready schema` — **done 2026-08-05**

#### Task 4.4 — CSV export 🟪 ✅
- **Backend:** streaming CSV export with same schema; RFC 4180 quoting.
- **Frontend:** wire "Export CSV" button.
- **Unit:** escaping/quoting edge cases. **Type check:** both. **Integration:** CSV parse back equals seeded entries.
- **Commit:** `feat(export): streaming csv export` — **done 2026-08-05**

---

### Phase 5 — Settings & Profile

Based on the **Settings** and **Profile** pages (currently static forms).

#### Task 5.1 — Workspace settings persistence 🟪
- **Backend:** `GET/PATCH /api/v1/workspace` (name, slug, currency, timezone), `GET/PATCH /api/v1/approval-policy` (approval level, manual entry window, max timer duration), `GET/PATCH /api/v1/erp-config` (export format, cost-center mapping).
- **Frontend:** bind Settings forms to API with save states and validation; Danger Zone delete confirmed via typed confirmation.
- **Unit:** slug/currency/timezone validators, policy constraint checks (e.g. max duration ≤ 24h). **Type check:** both. **Integration:** patch policy → timer uses new max duration.
- **Commit:** `feat(settings): workspace + approval policy + erp config`

#### Task 5.2 — Profile persistence 🟪
- **Backend:** `GET/PATCH /api/v1/users/me` (name, email, hourly rate, timezone, date format, weekly start day), password change endpoint.
- **Frontend:** bind Profile forms; disable email/role fields per design; two-factor toggle placeholder.
- **Unit:** PATCH merge semantics, rate/timezone validation. **Type check:** both. **Integration:** update profile → `users/me` reflects change → re-login keeps it.
- **Commit:** `feat(profile): personal info + preferences persistence`

---

### Phase 6 — Auth & Compliance

Based on the **Login** page and PRD §6 (auditability).

#### Task 6.1 — Better Auth integration (backend) 🟪
- **Backend:** mount Better Auth (session-based, email+password; passkey later), auth middleware on all `/api/v1/*`, session cookie + CSRF handling, seed admin user.
- **Unit:** session create/validate/expire, cookie flags. **Type check:** both. **Integration:** login → cookie → authenticated request 200 → anonymous 401.
- **Commit:** `feat(auth): better-auth sessions on backend`

#### Task 6.2 — Session login / logout (frontend) 🟪
- **Frontend:** replace mock localStorage auth with real session login; logout revokes server session; `useSession` hook; refetch-on-401 with redirect to `/login`.
- **Unit:** session hook states, 401 handling, logout invalidation. **Type check:** both. **Integration:** login → navigate to `/` → hard reload keeps session → logout → redirect.
- **Commit:** `feat(auth): real session login/logout replacing mock`

#### Task 6.3 — Audit logs & checksum verification 🟪
- **Backend:** write audit records for every state change (create/update/approve/reject), chained checksum (SHA-256 of `payload + previous checksum`), `GET /api/v1/audit-logs` (admin-only, filterable). `GET /api/v1/audit-logs/verify` recomputes the chain.
- **Frontend:** admin Audit view listing changes; verification report with pass/fail per record (PRD §6.3).
- **Unit:** chain math, tamper detection (flip one payload → fail). **Type check:** both. **Integration:** perform edits → verify chain passes → tamper row → verify fails.
- **Commit:** `feat(audit): chained audit logs + verification report`

---

### Phase 7 — Compliance Polish & Performance

#### Task 7.1 — Offline queue 🟪
- **Frontend:** IndexedDB queue for timer actions; sync on reconnect; "Offline Queued" state (PRD Timer states). **Backend:** idempotency keys on timer/time-entry mutations.
- **Unit:** queue ordering, replay semantics, idempotency. **Type check:** both. **Integration:** (simulated) queued stop replayed once after reconnect.
- **Commit:** `feat(offline): queued timer sync + idempotency`

#### Task 7.2 — Performance & edge cache 🟪
- **Backend:** report caching (Cache API, 30s), response time assertions (< 50ms p95 local). **Frontend:** route-level code splitting, skeleton consistency audit.
- **Unit:** cache key generation, TTL. **Type check:** both. **Integration:** second report call hits cache (fast path), payload identical.
- **Commit:** `perf: report caching and frontend code splitting`

#### Task 7.3 — Accessibility & design audit 🟪
- **Frontend:** keyboard-first timer, focus rings, `prefers-reduced-motion` on `animate-pulse-dot`, WCAG AA contrast sweep per DESIGN.md §6.3.
- **Unit:** a11y test on timer (button labels, focus). **Type check:** both. **Integration:** route smoke walk of all pages.
- **Commit:** `polish(a11y): keyboard-first timer + focus + reduced motion`

---

## 3. Delivery Flow

```
Branch  ──►  Task  ──►  Implement (FE + BE)  ──►  Unit tests
                                                        │
                              Auto commit + push ◄── all green
                                                        │
                                        Integration tests
                                                        │
                                              Type check
```

1. One task = one slice = one commit.
2. `npm run test`, `npm run typecheck`, `npm run test:integration` must all pass.
3. `npm run deliver -- --msg "feat(area): summary"` gates, commits, and pushes.
4. After each push, update `docs/PROGRESS.md` (mark the task complete) in the same commit when applicable.

## 4. Test Coverage Targets

| Layer | Threshold | Method |
|-------|-----------|--------|
| Backend pure logic (checksum, validators, state machines) | ≥ 90% | `c8`/vitest coverage |
| Backend route handlers (via integration tests) | ≥ 80% | seeded in-memory DB |
| Frontend utils + hooks | ≥ 85% | Vitest + RTL |
| Frontend page smoke (integration) | all routes render | route walk |
| Type check | 0 errors | `tsc` both packages |
