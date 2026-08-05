export function isValidClientCode(code: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(code)
}
