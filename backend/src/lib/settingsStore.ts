import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'
import {
  DEFAULT_NAME,
  DEFAULT_SLUG,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  DEFAULT_APPROVAL_LEVEL,
  DEFAULT_MANUAL_ENTRY_WINDOW_DAYS,
  DEFAULT_MAX_TIMER_HOURS,
} from './settings'

export const SETTINGS_SINGLETON_ID = 'singleton'

export type SettingsDb = any

export async function getWorkspaceSettings(d: SettingsDb): Promise<typeof schema.workspaceSettings.$inferSelect> {
  const existing = await d.query.workspaceSettings.findFirst({ where: eq(schema.workspaceSettings.id, SETTINGS_SINGLETON_ID) })
  if (existing) return existing
  await d.insert(schema.workspaceSettings).values({
    id: SETTINGS_SINGLETON_ID,
    name: DEFAULT_NAME,
    slug: DEFAULT_SLUG,
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
  }).onConflictDoNothing()
  return (await d.query.workspaceSettings.findFirst({ where: eq(schema.workspaceSettings.id, SETTINGS_SINGLETON_ID) }))!
}

export async function getApprovalPolicy(d: SettingsDb): Promise<typeof schema.approvalPolicy.$inferSelect> {
  const existing = await d.query.approvalPolicy.findFirst({ where: eq(schema.approvalPolicy.id, SETTINGS_SINGLETON_ID) })
  if (existing) return existing
  await d.insert(schema.approvalPolicy).values({
    id: SETTINGS_SINGLETON_ID,
    approvalLevel: DEFAULT_APPROVAL_LEVEL,
    manualEntryWindowDays: DEFAULT_MANUAL_ENTRY_WINDOW_DAYS,
    maxTimerHours: DEFAULT_MAX_TIMER_HOURS,
  }).onConflictDoNothing()
  return (await d.query.approvalPolicy.findFirst({ where: eq(schema.approvalPolicy.id, SETTINGS_SINGLETON_ID) }))!
}

export async function getErpConfig(d: SettingsDb): Promise<typeof schema.erpConfig.$inferSelect> {
  const existing = await d.query.erpConfig.findFirst({ where: eq(schema.erpConfig.id, SETTINGS_SINGLETON_ID) })
  if (existing) return existing
  await d.insert(schema.erpConfig).values({
    id: SETTINGS_SINGLETON_ID,
    exportFormat: 'sap',
    costCenterMappingEnabled: true,
  }).onConflictDoNothing()
  return (await d.query.erpConfig.findFirst({ where: eq(schema.erpConfig.id, SETTINGS_SINGLETON_ID) }))!
}

export async function getPolicyMaxTimerHours(d: SettingsDb): Promise<number> {
  const policy = await getApprovalPolicy(d)
  return policy.maxTimerHours
}
