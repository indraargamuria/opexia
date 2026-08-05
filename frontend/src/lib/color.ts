const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHexColor(color: unknown): color is string {
  return typeof color === 'string' && HEX_COLOR_RE.test(color)
}
