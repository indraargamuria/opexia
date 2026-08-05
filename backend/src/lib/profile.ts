import { checksum } from './crypto'

export const DATE_FORMATS = ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY'] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

export const WEEKLY_START_DAYS = ['monday', 'sunday'] as const
export type WeeklyStartDay = (typeof WEEKLY_START_DAYS)[number]

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value)
}

export function isValidDateFormat(value: unknown): value is DateFormat {
  return typeof value === 'string' && (DATE_FORMATS as readonly string[]).includes(value)
}

export function isValidWeeklyStartDay(value: unknown): value is WeeklyStartDay {
  return typeof value === 'string' && (WEEKLY_START_DAYS as readonly string[]).includes(value)
}

export function isValidHourlyRate(value: unknown): value is number | null {
  if (value === null) return true
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH
}

export async function hashPassword(password: string): Promise<string> {
  return checksum(password)
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return false
  return (await checksum(password)) === hash
}
