export const teamRoles = ['worker', 'manager', 'admin', 'viewer'] as const
export type TeamRole = (typeof teamRoles)[number]

export function isValidTeamRole(role: unknown): role is TeamRole {
  return typeof role === 'string' && (teamRoles as readonly string[]).includes(role)
}
