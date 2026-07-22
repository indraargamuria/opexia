import { createFileRoute } from '@tanstack/react-router'
import { useProjects } from '@/hooks'

export const Route = createFileRoute('/projects')({
  component: Projects,
})

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

const projectStatusConfig: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Planning' },
  active: { bg: 'bg-brand-light', text: 'text-brand', label: 'Active' },
  on_hold: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'On Hold' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Archived' },
}

function ProjectStatusBadge({ status }: { status: string }) {
  const config = projectStatusConfig[status as ProjectStatus] ?? projectStatusConfig.planning
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function BudgetBar({ logged, budget }: { logged: number; budget: number }) {
  const pct = budget > 0 ? Math.min((logged / budget) * 100, 100) : 0
  const barColor = pct >= 100 ? 'bg-error' : pct >= 90 ? 'bg-warning' : 'bg-brand'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted whitespace-nowrap">{logged}/{budget}h</span>
    </div>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Projects() {
  const { data: projects = [], isLoading, error, refetch } = useProjects()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Projects</h1>
        <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
          New Project
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState message="Failed to load projects" onRetry={() => refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState message="No projects yet. Create your first project to get started." />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-light-bg border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Project</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Client</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Code</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Budget</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Duration</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project: any) => (
                <tr key={project.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9 cursor-pointer">
                  <td className="px-3 py-1.5 font-medium text-dark-text">{project.name}</td>
                  <td className="px-3 py-1.5 text-muted">{project.client?.name ?? '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-muted">{project.code ?? '—'}</td>
                  <td className="px-3 py-1.5"><ProjectStatusBadge status={project.status} /></td>
                  <td className="px-3 py-1.5 min-w-[180px]">
                    <BudgetBar logged={0} budget={project.budgetHours ?? 0} />
                  </td>
                  <td className="px-3 py-1.5 text-muted whitespace-nowrap text-xs">
                    {formatDate(project.startDate)} — {formatDate(project.endDate)}
                  </td>
                </tr>
              ))}
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
