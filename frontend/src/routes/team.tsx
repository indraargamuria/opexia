import { createFileRoute } from '@tanstack/react-router'
import { useTeamMembers } from '@/hooks'

export const Route = createFileRoute('/team')({
  component: Team,
})

type TeamRole = 'admin' | 'manager' | 'worker' | 'viewer'

const roleConfig: Record<TeamRole, { bg: string; text: string; label: string }> = {
  admin: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Admin' },
  manager: { bg: 'bg-brand-light', text: 'text-brand', label: 'Manager' },
  worker: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Worker' },
  viewer: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Viewer' },
}

function RoleBadge({ role }: { role: string }) {
  const config = roleConfig[role as TeamRole] ?? roleConfig.worker
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function Team() {
  const { data: members = [], isLoading, error, refetch } = useTeamMembers()

  const activeCount = members.filter((m: any) => m.user).length
  const totalWeeklyHours = members.length * 35

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Team</h1>
        <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
          Invite Member
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Members</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">{isLoading ? '—' : members.length}</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Active</p>
            <p className="text-2xl font-semibold text-success mt-1">{isLoading ? '—' : activeCount}</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Avg Utilization</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">—</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Weekly Hours</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">{isLoading ? '—' : `${totalWeeklyHours}h`}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error ? (
        <ErrorState message="Failed to load team members" onRetry={() => refetch()} />
      ) : members.length === 0 ? (
        <EmptyState message="No team members yet. Invite your first member to get started." />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-light-bg border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Member</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Role</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Rate</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Projects</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Weekly Hrs</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: any) => {
                const user = member.user ?? {}
                const name = user.name ?? 'Unknown'
                const email = user.email ?? ''
                const role = member.role ?? 'worker'
                const projectName = member.project?.name
                const rate = member.billableRate

                return (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9 cursor-pointer">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-dark-accent flex items-center justify-center text-white text-[10px] font-medium shrink-0">
                          {getInitials(name)}
                        </div>
                        <div>
                          <div className="text-dark-text font-medium">{name}</div>
                          <div className="text-xs text-muted">{email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5"><RoleBadge role={role} /></td>
                    <td className="px-3 py-1.5 text-muted whitespace-nowrap">{rate ? `$${rate}/h` : '—'}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-col gap-0.5">
                        {projectName ? (
                          <span className="text-xs text-dark-text">{projectName}</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">—</td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 rounded bg-muted-bg animate-pulse" style={{ width: `${100 / cols}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-12 text-center">
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-white p-12 text-center">
      <p className="text-sm text-red-600 mb-3">{message}</p>
      <button onClick={onRetry} className="text-sm font-medium text-brand hover:text-brand-hover transition-colors duration-75">
        Try again
      </button>
    </div>
  )
}
