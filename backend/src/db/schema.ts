import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// ─── Helpers ────────────────────────────────────────────────────────────────

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
};

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    ...timestamps,
  },
  (t) => [
    index('idx_users_email').on(t.email),
  ],
);

// ─── Clients ────────────────────────────────────────────────────────────────

export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull().unique(),
    code: text('code').notNull().unique(),
    billingRate: real('billing_rate'),
    currency: text('currency').notNull().default('USD'),
    address: text('address'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('idx_clients_code').on(t.code),
    index('idx_clients_is_active').on(t.isActive),
  ],
);

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    status: text('status', {
      enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
    })
      .notNull()
      .default('planning'),
    budgetHours: real('budget_hours'),
    budgetCost: real('budget_cost'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    ...timestamps,
  },
  (t) => [
    index('idx_projects_client_id').on(t.clientId),
    index('idx_projects_status').on(t.status),
    index('idx_projects_client_status').on(t.clientId, t.status),
  ],
);

// ─── Team Members ───────────────────────────────────────────────────────────

export const teamMembers = sqliteTable(
  'team_members',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    role: text('role', {
      enum: ['worker', 'manager', 'admin', 'viewer'],
    })
      .notNull()
      .default('worker'),
    billableRate: real('billable_rate'),
    assignedAt: integer('assigned_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    ...timestamps,
  },
  (t) => [
    index('idx_team_members_user_id').on(t.userId),
    index('idx_team_members_project_id').on(t.projectId),
    index('idx_team_members_user_project').on(t.userId, t.projectId),
    index('idx_team_members_role').on(t.role),
  ],
);

// ─── Tags ───────────────────────────────────────────────────────────────────

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull().unique(),
    color: text('color').notNull().default('#6366f1'),
    erpCode: text('erp_code'),
    ...timestamps,
  },
  (t) => [
    index('idx_tags_name').on(t.name),
  ],
);

// ─── Time Entries ───────────────────────────────────────────────────────────

export const timeEntries = sqliteTable(
  'time_entries',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    description: text('description'),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
    durationMinutes: integer('duration_minutes'),
    status: text('status', {
      enum: ['running', 'pending', 'approved', 'rejected', 'invoiced'],
    })
      .notNull()
      .default('pending'),
    entryMethod: text('entry_method', {
      enum: ['timer', 'manual', 'import'],
    })
      .notNull()
      .default('timer'),
    approvedBy: text('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
    rejectionReason: text('rejection_reason'),
    checksum: text('checksum').notNull(),
    ...timestamps,
  },
  (t) => [
    index('idx_time_entries_user_id').on(t.userId),
    index('idx_time_entries_project_id').on(t.projectId),
    index('idx_time_entries_status').on(t.status),
    index('idx_time_entries_started_at').on(t.startedAt),
    index('idx_time_entries_user_started').on(t.userId, t.startedAt),
    index('idx_time_entries_project_status').on(t.projectId, t.status),
    index('idx_time_entries_approved_by').on(t.approvedBy),
  ],
);

// ─── Time Entry Tags (M:N Junction) ────────────────────────────────────────

export const timeEntryTags = sqliteTable(
  'time_entry_tags',
  {
    timeEntryId: text('time_entry_id')
      .notNull()
      .references(() => timeEntries.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('idx_time_entry_tags_entry_id').on(t.timeEntryId),
    index('idx_time_entry_tags_tag_id').on(t.tagId),
  ],
);

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    payload: text('payload'),
    checksum: text('checksum').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_audit_logs_entity').on(t.entityType, t.entityId),
    index('idx_audit_logs_actor_id').on(t.actorId),
    index('idx_audit_logs_action').on(t.action),
    index('idx_audit_logs_created_at').on(t.createdAt),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  timeEntries: many(timeEntries),
  auditLogs: many(auditLogs),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  teamMembers: many(teamMembers),
  timeEntries: many(timeEntries),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [teamMembers.projectId],
    references: [projects.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  timeEntryTags: many(timeEntryTags),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  approver: one(users, {
    fields: [timeEntries.approvedBy],
    references: [users.id],
    relationName: 'approvals',
  }),
  timeEntryTags: many(timeEntryTags),
}));

export const timeEntryTagsRelations = relations(timeEntryTags, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [timeEntryTags.timeEntryId],
    references: [timeEntries.id],
  }),
  tag: one(tags, {
    fields: [timeEntryTags.tagId],
    references: [tags.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));
