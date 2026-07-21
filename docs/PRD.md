# PRD: Opexia (Opex Internal App) — Intelligent Time Orchestrator

**Document Version:** 1.0  
**Classification:** Internal — Confidential  
**Last Updated:** 2026-07-17  

---

## 1. Executive Summary

### 1.1 Problem Statement

Professional services, consulting, and government-contracted organizations lose **12–18% of billable revenue** due to fragmented time capture, post-hoc manual entry, and insufficient audit trails. Existing tools force a binary choice: rich project management with weak time accountability (ClickUp, Asana), or strong time tracking with no project context (Clockify, Toggl). Neither satisfies the compliance rigor required for SOX, DCAA, or ISO 27001 audit frameworks.

### 1.2 Product Definition

**Opexia** is a high-density, enterprise-grade Project & Time Management SaaS platform. It combines hierarchical project/task structures with real-time, start/stop time capture — purpose-built for organizations where every billed hour must be traceable, defensible, and ERP-exportable.

### 1.3 Value Proposition

| Dimension | Value |
|-----------|-------|
| **Auditability** | Immutable time entry logs with cryptographic checksums, full change history, and manager-level approval workflows. |
| **ERP Integration** | RESTful API and CSV/Excel export schemas designed for direct ingestion into SAP, Oracle Financials, and Workday. |
| **Edge Performance** | Sub-50ms API response latency via Cloudflare Workers edge deployment. |
| **Compliance-Ready** | Data residency controls, role-based access, and tamper-evident audit logs suitable for DCAA/FAR-regulated environments. |
| **Operational Efficiency** | One-click time capture eliminates manual timesheet friction — workers log time in <3 seconds. |

### 1.4 Success Metrics

| Metric | Target | Measurement Window |
|--------|--------|--------------------|
| Daily Active Time Logging Rate | ≥ 90% of assigned workers | Monthly |
| Average Time Entry Accuracy (vs. proxy data) | ≥ 97% | Quarterly |
| Time-to-Report (Manager dashboard load) | < 200ms p95 | Continuous |
| ERP Export Error Rate | < 0.1% | Monthly |
| Audit Pass Rate (external) | 100% | Annual |

---

## 2. User Personas

### 2.1 Persona: Worker (Time Logger)

**Role:** Consultant, Developer, Analyst, Contractor  
**Primary Goal:** Capture time with minimal friction; avoid end-of-week timesheet scrambling.  
**Secondary Goal:** Self-audit personal hours before submission deadlines.

| Attribute | Detail |
|-----------|--------|
| **Technical Proficiency** | Low to Medium |
| **Session Frequency** | 8–12x daily (start/stop toggles) |
| **Primary Interface** | Timer bar (persistent, top-level UI element) |
| **Pain Points** | Forgetting to start timer; unclear project-task mapping; post-hoc entry rejection by managers |
| **Key Workflows** | Start/stop timer; switch active task; view personal daily/weekly summary; tag entries |

### 2.2 Persona: Manager / Admin (Reviewer & Auditor)

**Role:** Project Manager, Finance Controller, Compliance Officer, Workspace Admin  
**Primary Goal:** Ensure organizational time integrity; generate client-ready reports; enforce billing policies.  
**Secondary Goal:** Identify utilization gaps and resourcing bottlenecks.

| Attribute | Detail |
|-----------|--------|
| **Technical Proficiency** | Medium to High |
| **Session Frequency** | 2–4x daily (review cycles) |
| **Primary Interface** | Reporting dashboard; team activity feed; approval queues |
| **Pain Points** | Incomplete timesheets; inability to reconcile project budgets vs. actuals; audit preparation overhead |
| **Key Workflows** | Review/approve/reject time entries; generate project/client reports; export to Excel; configure project metadata; manage team assignments |

### 2.3 Access Control Model

| Permission | Worker | Manager | Admin |
|------------|--------|---------|-------|
| Log own time | ✅ | ✅ | ✅ |
| Edit own entries (pre-approval) | ✅ | ✅ | ✅ |
| Edit any entry | ❌ | ✅ | ✅ |
| Approve/reject entries | ❌ | ✅ | ✅ |
| View team reports | ❌ | ✅ | ✅ |
| View organization reports | ❌ | ❌ | ✅ |
| Manage clients/projects | ❌ | ❌ | ✅ |
| Manage users/roles | ❌ | ❌ | ✅ |
| Access audit logs | ❌ | ❌ | ✅ |
| Export data | ❌ | ✅ | ✅ |

---

## 3. Core Features

### 3.1 Master Data Management

#### 3.1.1 Client Management

**Purpose:** Top-level organizational entity. All projects and billable time roll up to a client.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `name` | VARCHAR(255) | Unique, Not Null |
| `code` | VARCHAR(50) | Unique, Not Null — short identifier for ERP mapping |
| `billing_rate` | DECIMAL(10,2) | Nullable — default hourly rate |
| `currency` | VARCHAR(3) | ISO 4217, default `USD` |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-generated |

**Business Rules:**
- Clients cannot be deleted if associated projects exist (soft delete via `is_active = false`).
- `code` must be alphanumeric + hyphens only; used as ERP cross-reference key.

#### 3.1.2 Project Management

**Purpose:** Scoped work containers under a client. Projects carry budget targets, date ranges, and team assignments.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `client_id` | UUID | FK → `clients.id`, Not Null |
| `name` | VARCHAR(255) | Not Null |
| `code` | VARCHAR(50) | Unique per client, Not Null |
| `description` | TEXT | Nullable |
| `status` | ENUM | `planning`, `active`, `on_hold`, `completed`, `archived` |
| `budget_hours` | DECIMAL(10,2) | Nullable — planned hours cap |
| `budget_cost` | DECIMAL(12,2) | Nullable — planned cost cap |
| `start_date` | DATE | Nullable |
| `end_date` | DATE | Nullable — must be ≥ `start_date` |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-generated |

**Business Rules:**
- Projects transition `planning → active → completed → archived` via explicit status change.
- When `status = archived`, no new time entries may be created against the project.
- Budget thresholds generate warnings at 75%, 90%, and 100% utilization.

#### 3.1.3 Team Management (IAM-Integrated)

**Purpose:** Role-based groupings of users scoped to projects. Integrated with the platform's IAM layer for authentication and authorization.

**Relationship Model:**
- A **user** is an authenticated identity (email + password/passkey via Better Auth).
- A **team member** is a user + role binding within a specific project or organization.
- Roles: `worker`, `manager`, `admin`, `viewer`.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | FK → `users.id`, Not Null |
| `project_id` | UUID | FK → `projects.id`, Not Null |
| `role` | ENUM | `worker`, `manager`, `admin`, `viewer` |
| `hourly_rate` | DECIMAL(10,2) | Nullable — overrides client default |
| `assigned_at` | TIMESTAMP | Auto-generated |

**Business Rules:**
- A user may hold different roles across different projects.
- Only `manager` or `admin` roles can approve time entries on a given project.
- Removing a team member prevents future time entry but preserves historical entries.

#### 3.1.4 Tag Management

**Purpose:** Orthogonal metadata for time entries. Used for categorization, reporting dimensions, and ERP cost-center mapping.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `name` | VARCHAR(100) | Unique, Not Null |
| `color` | VARCHAR(7) | Hex color code, for UI display |
| `erp_code` | VARCHAR(50) | Nullable — cost center mapping |

**Usage:**
- Tags are many-to-many with time entries.
- Predefined system tags: `billable`, `non-billable`, `overtime`, `travel`, `meeting`, `deep-work`.

---

### 3.2 Transactional: Time Tracker

#### 3.2.1 Timer Bar (Primary UI Component)

The **Timer Bar** is a persistent, top-of-viewport UI element that provides real-time time capture with zero-disruption workflow.

**States:**

| State | Visual Indicator | Behavior |
|-------|------------------|----------|
| **Idle** | Muted bar, "Start Tracking" CTA | Project/task dropdown enabled; click to start |
| **Running** | Pulsing accent dot, live elapsed counter (HH:MM:SS) | Stop button visible; project/task locked (switch triggers new entry) |
| **Paused** | Amber accent, frozen counter | Resume or Stop; notes field expanded |
| **Offline Queued** | Yellow sync icon | Entry cached locally; synced on reconnection |

**Interaction Flow:**

```
1. Worker clicks "Start"
2. Timer begins; entry created with `started_at = now()`
3. Worker selects Project → Task (if hierarchy exists) → Tags
4. Worker clicks "Stop"
5. Entry finalized: `ended_at = now()`, `duration` calculated
6. Entry enters "pending" state → visible in Manager review queue
```

**Constraints:**
- Only **one timer may be active per user** at any time.
- Minimum entry duration: 1 minute (entries < 1 min auto-discarded).
- Maximum continuous timer: 12 hours (auto-stop with notification).
- Timer can be extended to 24 hours via `admin` override.

#### 3.2.2 Manual Entry

For retroactive entry correction (within policy window):
- Workers may manually add entries for the current or prior business day.
- Entries older than 3 business days require `manager` approval to edit.
- All manual entries are flagged in audit logs with `entry_method: manual`.

#### 3.2.3 Time Entry Schema

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | FK → `users.id`, Not Null |
| `project_id` | UUID | FK → `projects.id`, Not Null |
| `tag_ids` | UUID[] | FK → `tags.id`, Array |
| `description` | TEXT | Nullable — free-text task description |
| `started_at` | TIMESTAMP | Not Null |
| `ended_at` | TIMESTAMP | Nullable — Null while timer is running |
| `duration_minutes` | INTEGER | Computed: `ended_at - started_at`, Nullable while running |
| `status` | ENUM | `running`, `pending`, `approved`, `rejected`, `invoiced` |
| `entry_method` | ENUM | `timer`, `manual`, `import` |
| `approved_by` | UUID | FK → `users.id`, Nullable — set on approval |
| `approved_at` | TIMESTAMP | Nullable |
| `checksum` | VARCHAR(64) | SHA-256 hash of entry fields — immutable after finalization |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-generated |

---

### 3.3 Management Review: Reporting Module

#### 3.3.1 Dashboard Views

| View | Dimensions | Filters | Target Persona |
|------|-----------|---------|----------------|
| **My Time** | Day, Week, Month | Date range, project, tag | Worker |
| **Team Utilization** | Per member, per project | Date range, project, status | Manager |
| **Project Summary** | Hours by tag, budget vs. actual | Project, client, date range | Manager |
| **Client Overview** | Total hours, cost, utilization % | Client, date range | Admin |
| **Audit Trail** | Entry changes, approvals, rejections | User, date range, action type | Admin/Compliance |

#### 3.3.2 Report Generation

**Real-Time Aggregation:**
- All dashboard metrics computed via D1 SQL views with indexed aggregations.
- Response target: < 200ms p95 for reports covering ≤ 90-day ranges.

**Export Capabilities:**

| Format | Use Case | Implementation |
|--------|----------|----------------|
| **Excel (.xlsx)** | Client invoicing, ERP import | SheetJS (xlsx) library via Workers |
| **CSV** | Bulk data operations, custom integrations | Native streaming export |
| **PDF** | Formal reporting, compliance artifacts | Headless rendering via Cloudflare Browser Rendering (or pre-rendered) |

**Excel Export Schema:**

```
| Date | Worker | Client | Project | Task Description | Tags | Duration (h) | Rate | Amount | Status |
|------|--------|--------|---------|-----------------|------|-------------|------|--------|--------|
```

#### 3.3.3 Approval Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Worker   │────▶│  Pending  │────▶│ Manager  │────▶│ Approved │
│  Submits  │     │  Review   │     │  Reviews  │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Rejected │
                                  │ (w/ note)│
                                  └──────────┘
```

**Rules:**
- Batch approval: Manager can approve/reject multiple entries simultaneously.
- Rejection requires a reason note; worker is notified and may edit + resubmit.
- Approved entries are locked — no further edits without admin intervention.
- `invoiced` status set externally via API after ERP export confirmation.

---

## 4. Data Schema Architecture

### 4.1 Entity Relationship Diagram (Textual)

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────┐
│   clients    │──1:N──│    projects       │──1:N──│ team_members  │
│              │       │                   │       │               │
│ id (PK)     │       │ id (PK)          │       │ id (PK)       │
│ name        │       │ client_id (FK)   │       │ user_id (FK)  │──┐
│ code        │       │ name             │       │ project_id(FK)│  │
│ billing_rate│       │ code             │       │ role          │  │
│ currency    │       │ status           │       │ hourly_rate   │  │
│ is_active   │       │ budget_hours     │       └──────────────┘  │
└─────────────┘       │ budget_cost      │                         │
                      │ start_date       │       ┌──────────────┐  │
                      │ end_date         │       │    users      │◀─┘
                      └──────────────────┘       │              │
                               │                 │ id (PK)      │
                               │ 1:N             │ email        │
                               ▼                 │ name         │
                      ┌──────────────────┐       │ auth_id      │
                      │  time_entries     │       │ role         │
                      │                   │       └──────────────┘
                      │ id (PK)          │
                      │ user_id (FK)     │──┐
                      │ project_id (FK)  │  │
                      │ description      │  │
                      │ started_at       │  │
                      │ ended_at         │  │
                      │ duration_minutes │  │
                      │ status           │  │
                      │ entry_method     │  │
                      │ approved_by (FK) │──┘
                      │ approved_at      │
                      │ checksum         │
                      └──────────────────┘
                               │
                               │ M:N
                               ▼
                      ┌──────────────────┐
                      │  time_entry_tags  │
                      │                   │
                      │ time_entry_id(FK)│
                      │ tag_id (FK)      │
                      └──────────────────┘
                               │
                               │ M:1
                               ▼
                      ┌──────────────────┐
                      │     tags          │
                      │                   │
                      │ id (PK)          │
                      │ name             │
                      │ color            │
                      │ erp_code         │
                      └──────────────────┘

                      ┌──────────────────┐
                      │   audit_logs      │
                      │                   │
                      │ id (PK)          │
                      │ entity_type      │
                      │ entity_id        │
                      │ action           │
                      │ actor_id (FK)    │
                      │ payload (JSON)   │
                      │ checksum         │
                      │ created_at       │
                      └──────────────────┘
```

### 4.2 Drizzle ORM Schema Definitions

```typescript
// schema/clients.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  billingRate: real('billing_rate'),
  currency: text('currency').notNull().default('USD'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

```typescript
// schema/projects.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text('client_id').notNull().references(() => clients.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  status: text('status', { enum: ['planning', 'active', 'on_hold', 'completed', 'archived'] })
    .notNull()
    .default('planning'),
  budgetHours: real('budget_hours'),
  budgetCost: real('budget_cost'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

```typescript
// schema/team-members.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { projects } from './projects';

export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').notNull().references(() => projects.id),
  role: text('role', { enum: ['worker', 'manager', 'admin', 'viewer'] }).notNull().default('worker'),
  hourlyRate: real('hourly_rate'),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

```typescript
// schema/time-entries.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { projects } from './projects';

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').notNull().references(() => projects.id),
  description: text('description'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  durationMinutes: integer('duration_minutes'),
  status: text('status', {
    enum: ['running', 'pending', 'approved', 'rejected', 'invoiced'],
  })
    .notNull()
    .default('pending'),
  entryMethod: text('entry_method', { enum: ['timer', 'manual', 'import'] })
    .notNull()
    .default('timer'),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  checksum: text('checksum').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

```typescript
// schema/tags.ts
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  erpCode: text('erp_code'),
});
```

```typescript
// schema/time-entry-tags.ts
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timeEntries } from './time-entries';
import { tags } from './tags';

export const timeEntryTags = sqliteTable('time_entry_tags', {
  timeEntryId: text('time_entry_id').notNull().references(() => timeEntries.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});
```

```typescript
// schema/audit-logs.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityType: text('entity_type').notNull(),       // 'time_entry', 'project', 'user', etc.
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),                 // 'create', 'update', 'delete', 'approve', 'reject'
  actorId: text('actor_id').notNull().references(() => users.id),
  payload: text('payload'),                          // JSON string of diff/changes
  checksum: text('checksum').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

### 4.3 Relationship Summary

| Relationship | Type | FK Table | Reference | Cascade |
|-------------|------|----------|-----------|---------|
| Client → Projects | One-to-Many | `projects.client_id` | `clients.id` | Restrict delete |
| Project → Team Members | One-to-Many | `team_members.project_id` | `projects.id` | Restrict delete |
| User → Team Members | One-to-Many | `team_members.user_id` | `users.id` | Cascade delete |
| User → Time Entries | One-to-Many | `time_entries.user_id` | `users.id` | Restrict delete |
| Project → Time Entries | One-to-Many | `time_entries.project_id` | `projects.id` | Restrict delete |
| User → Approvals | One-to-Many | `time_entries.approved_by` | `users.id` | Set null |
| Time Entry ↔ Tags | Many-to-Many | `time_entry_tags` | Junction table | Cascade delete |
| User → Audit Logs | One-to-Many | `audit_logs.actor_id` | `users.id` | Restrict delete |

---

## 5. Technical Requirements

### 5.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Cloudflare Workers | Edge deployment, sub-50ms cold starts, global distribution |
| **API Framework** | Hono | Lightweight, Web Standards API-compliant, optimized for Workers |
| **Database** | Cloudflare D1 | SQLite at edge, automatic replication, zero-config with Workers |
| **ORM** | Drizzle ORM | Type-safe, lightweight, D1-optimized, no codegen overhead |
| **Auth** | Better Auth | Self-hosted, session-based, passkey support, IAM-ready |
| **UI Framework** | React 19+ | Component ecosystem, concurrent rendering |
| **Design System** | shadcn/ui + Tailwind CSS v4 | High-density enterprise aesthetic, fully customizable |
| **Build** | Vite + Wrangler | Fast HMR locally, Workers-compatible bundling |
| **Export** | SheetJS (xlsx) | Client-side Excel generation, no server-side rendering needed |

### 5.2 API Architecture

**Pattern:** RESTful, resource-oriented, versioned (`/api/v1/...`).

**Core Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/timer/start` | Start time tracker |
| `POST` | `/api/v1/timer/stop` | Stop time tracker |
| `GET` | `/api/v1/timer/current` | Get active timer state |
| `GET` | `/api/v1/time-entries` | List entries (filtered) |
| `PATCH` | `/api/v1/time-entries/:id` | Edit entry |
| `POST` | `/api/v1/time-entries/:id/approve` | Approve entry |
| `POST` | `/api/v1/time-entries/:id/reject` | Reject entry with note |
| `GET` | `/api/v1/reports/project/:id` | Project summary report |
| `GET` | `/api/v1/reports/client/:id` | Client summary report |
| `GET` | `/api/v1/reports/export` | Export (xlsx/csv) |
| `GET` | `/api/v1/audit-logs` | Audit trail (admin only) |
| `CRUD` | `/api/v1/clients` | Client management |
| `CRUD` | `/api/v1/projects` | Project management |
| `CRUD` | `/api/v1/tags` | Tag management |

**Authentication:** Bearer token (session cookie) on all `/api/v1/*` routes.  
**Rate Limiting:** 100 req/min per user (Workers KV-backed token bucket).

### 5.3 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| API latency (p50) | < 20ms | D1 read replicas, edge caching via Cache API |
| API latency (p95) | < 50ms | Query optimization, composite indexes |
| Dashboard load (initial) | < 800ms | Code splitting, streaming SSR |
| Report generation (≤90 days) | < 200ms | Pre-computed aggregates, indexed views |
| Timer sync latency | < 100ms | Optimistic UI + background sync |
| Offline support | 24-hour queue | Service Worker + IndexedDB local cache |

### 5.4 Design System Principles

| Principle | Implementation |
|-----------|---------------|
| **High Density** | Compact spacing (gap-1, gap-2), 14px base font, minimal padding |
| **Minimal Chrome** | No heavy borders; use subtle separators (border-zinc-800) |
| **Data-Forward** | Tables and grids as primary layout; charts secondary |
| **Dark Mode Default** | Dark palette as primary; light mode optional |
| **Keyboard-First** | All timer operations accessible via keyboard shortcuts |
| **Responsive** | Desktop-first; mobile as companion view |

**Palette Reference (Dark Mode):**
```
Background:    zinc-950 (#09090b)
Card/Surface:  zinc-900 (#18181b)
Border:        zinc-800 (#27272a)
Text Primary:  zinc-100 (#f4f4f5)
Text Muted:    zinc-400 (#a1a1aa)
Accent:        indigo-500 (#6366f1)
Success:       emerald-500 (#10b981)
Warning:       amber-500 (#f59e0b)
Error:         red-500 (#ef4444)
```

---

## 6. Compliance & Auditability

### 6.1 Data Integrity Framework

#### 6.1.1 Immutable Checksums

Every time entry, upon finalization (status transition from `running` → `pending`), receives a **SHA-256 checksum** computed over:

```
checksum = SHA256(user_id + project_id + started_at + ended_at + duration_minutes + description)
```

- Checksums are **append-only** — once written, they are never recomputed or overwritten.
- Any mutation to a finalized entry triggers a **new audit log record** with the previous checksum and the delta.
- External auditors can verify data integrity by recomputing checksums against stored values.

#### 6.1.2 Audit Trail

**Every** state-changing operation generates an `audit_logs` entry:

| Field | Purpose |
|-------|---------|
| `entity_type` | What was modified (`time_entry`, `project`, `user`) |
| `entity_id` | Which specific record |
| `action` | What happened (`create`, `update`, `approve`, `reject`, `delete`) |
| `actor_id` | Who performed the action |
| `payload` | JSON diff of changes (before/after) |
| `checksum` | Hash of the audit record itself (chain integrity) |

**Audit Log Immutability:**
- Audit logs cannot be updated or deleted — not even by admins.
- The audit table has `write-once` semantics enforced at the application layer.
- D1 point-in-time recovery provides additional backup integrity.

### 6.2 Compliance Alignment

| Framework | Opexia Control | Evidence Artifact |
|-----------|---------------|-------------------|
| **DCAA (Defense Contract Audit Agency)** | Full time entry audit trail; no silent edits; manager approval gate | Audit log export, checksum verification report |
| **SOX (Sarbanes-Oxley)** | Separation of duties (worker ≠ approver); immutable financial records | Role matrix, approval workflow logs |
| **ISO 27001** | Role-based access; data encryption at rest (D1 native); session management | Access control matrix, auth logs |
| **GDPR** | Data minimization; right to erasure (soft delete with audit); data residency via Cloudflare regions | Privacy policy hooks, deletion audit trail |

### 6.3 Tamper Detection Protocol

```
1. External auditor requests full audit log for date range [T1, T2]
2. System exports all audit_logs records in chronological order
3. Auditor recomputes checksum chain:
   - For each record i: verify checksum[i] == SHA256(payload[i] + checksum[i-1])
   - Genesis record (first entry) uses fixed salt as checksum[0] predecessor
4. Any chain break indicates tampering
5. Report generated with pass/fail per record
```

### 6.4 Data Retention & Archival

| Data Type | Retention Period | Archive Strategy |
|-----------|-----------------|------------------|
| Time Entries | 7 years (configurable) | Annual D1 export to R2 (S3-compatible) |
| Audit Logs | 10 years (immutable) | Append-only export to R2 with checksum manifest |
| User Data | Duration of contract + 1 year | Anonymize PII post-retention |
| Session Data | 30 days | Auto-purge |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Time Entry** | A discrete record of time spent on a project task |
| **Timer** | The real-time clock mechanism (start/stop) that auto-generates time entries |
| **Checksum** | SHA-256 hash used to detect data tampering |
| **ERP** | Enterprise Resource Planning system (SAP, Oracle, Workday) |
| **DCAA** | Defense Contract Audit Agency — US government audit body for defense contracts |
| **IAM** | Identity and Access Management — authentication and authorization layer |
| **Edge** | Cloudflare's globally distributed compute network |

## Appendix B: Open Decisions

| ID | Decision | Status | Owner | Due Date |
|----|----------|--------|-------|----------|
| OD-001 | Implement offline queue via Service Worker vs. PWA | Pending | Engineering | TBD |
| OD-002 | PDF export: Cloudflare Browser Rendering vs. pre-rendered templates | Pending | Engineering | TBD |
| OD-003 | Billing rate override precedence: team_member > project > client | Pending | Product | TBD |
| OD-004 | Approval SLA: auto-approve if manager doesn't act within N days | Pending | Product + Legal | TBD |
| OD-005 | Multi-workspace support for SaaS tier | Deferred to v2 | Product | TBD |
