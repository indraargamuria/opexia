export function isValidClientCode(code: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(code)
}

export function isUniqueViolation(err: unknown): boolean {
  const seen = new Set<Error>()
  let current: Error | undefined = err instanceof Error ? err : undefined
  while (current && !seen.has(current)) {
    if (/unique constraint failed/i.test(current.message)) return true
    seen.add(current)
    current = current.cause instanceof Error ? current.cause : undefined
  }
  return false
}
