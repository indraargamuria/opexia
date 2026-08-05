import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTeamMembers, useAssignTeamMember, useUpdateTeamMember, useRemoveTeamMember, useUsers, useProjects } from '@/hooks'
import { routeGuard } from '@/lib/routeGuard'

export const Route = createFileRoute('/team')({
  beforeLoad: routeGuard('/team'),
  component: Team,
})

type TeamRole = 'admin' | 'manager' | 'worker' | 'viewer'

const roleConfig: Record<TeamRole, { bg: string; text: string; label: string }> = {
  admin: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Admin' },
  manager: { bg: 'bg-brand-light', text: 'text-brand', label: 'Manager' },
  worker: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Worker' },
  viewer: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Viewer' },
}

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

const WEEKLY_TARGET_MINUTES = 40 * 60

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
  const removeMember = useRemoveTeamMember()
  const [showAssign, setShowAssign] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const activeCount = members.filter((m: any) => m.user).length
  const avgUtilization =
    members.length === 0
      ? 0
      : Math.round(
          (members.reduce((sum: number, m: any) => sum + Math.min(m.loggedMinutes ?? 0, WEEKLY_TARGET_MINUTES), 0) /
            members.length /
            WEEKLY_TARGET_MINUTES) *
            100,
        )

  const handleRemove = (member: any) => {
    const name = member.user?.name ?? 'this member'
    if (window.confirm(`Remove ${name} from their project assignment?`)) {
      removeMember.mutate(member.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Team</h1>
        <button
          onClick={() => setShowAssign(true)}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
        >
          Assign Member
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Assignments</p>
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
            <p className="text-2xl font-semibold text-dark-text mt-1">{isLoading ? '—' : `${avgUtilization}%`}</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Weekly Target</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">40h</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState message="Failed to load team members" onRetry={() => refetch()} />
      ) : members.length === 0 ? (
        <EmptyState message="No assignments yet. Assign your first team member to a project." />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-light-bg border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Member</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Role</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Rate</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Project</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Logged Hrs</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Utilization</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
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
                const loggedMinutes = member.loggedMinutes ?? 0
                const loggedHours = (loggedMinutes / 60).toFixed(1)
                const utilization = Math.min((loggedMinutes / WEEKLY_TARGET_MINUTES) * 100, 100)

                return (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
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
                    <td className="px-3 py-1.5 text-xs text-dark-text">{projectName ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">{loggedHours}h</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted-bg rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${utilization >= 100 ? 'bg-error' : utilization >= 90 ? 'bg-warning' : 'bg-brand'}`} style={{ width: `${utilization}%` }} />
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap">{Math.round(utilization)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing(member)}
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-border text-xs font-medium text-dark-text hover:bg-highlight transition-colors duration-75"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(member)}
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-error text-white hover:bg-red-700 text-xs font-medium transition-colors duration-75"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && <MemberFormModal onClose={() => setShowAssign(false)} />}
      {editing && <MemberFormModal member={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function MemberFormModal({ member, onClose }: { member?: any; onClose: () => void }) {
  const { data: users = [] } = useUsers()
  const { data: projects = [] } = useProjects()
  const assignMember = useAssignTeamMember()
  const updateMember = useUpdateTeamMember()
  const isEditing = Boolean(member)
  const [userId, setUserId] = useState(member?.userId ?? '')
  const [projectId, setProjectId] = useState(member?.projectId ?? '')
  const [role, setRole] = useState(member?.role ?? 'worker')
  const [billableRate, setBillableRate] = useState(member?.billableRate != null ? String(member.billableRate) : '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!userId || !projectId) return
    const payload = {
      userId,
      projectId,
      role,
      billableRate: billableRate ? Number(billableRate) : undefined,
    }
    const onSuccess = () => onClose()
    if (isEditing) {
      updateMember.mutate(
        { id: member.id, data: { role, billableRate: payload.billableRate } },
        { onSuccess, onError: (err: any) => setError(err.message ?? 'Failed to update member') },
      )
    } else {
      assignMember.mutate(payload, { onSuccess, onError: (err: any) => setError(err.message ?? 'Failed to assign member') })
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-border bg-white p-6 w-full max-w-lg space-y-4"
      >
        <h2 className="text-lg font-semibold text-dark-text">{isEditing ? 'Edit Assignment' : 'Assign Member'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-text">User</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isEditing}
              className={`${inputClass} w-full mt-1 disabled:opacity-60`}
            >
              <option value="">Select user</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-text">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClass} w-full mt-1`}>
              <option value="">Select project</option>
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-text">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputClass} w-full mt-1`}>
                {Object.entries(roleConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text">Billable rate $/h</label>
              <input value={billableRate} onChange={(e) => setBillableRate(e.target.value)} type="number" min="0" placeholder="100" className={`${inputClass} w-full mt-1`} />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!userId || !projectId || (isEditing ? updateMember.isPending : assignMember.isPending)}
            className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
          >
            {isEditing ? (updateMember.isPending ? 'Saving...' : 'Save Changes') : (assignMember.isPending ? 'Assigning...' : 'Assign Member')}
          </button>
        </div>
      </form>
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
