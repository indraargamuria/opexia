import { createFileRoute } from '@tanstack/react-router'
import { useTimeEntries } from '@/hooks'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { data: timeEntries = [], isLoading, error, refetch } = useTimeEntries()

  const totalMinutes = timeEntries.reduce((sum: number, e: any) => sum + (e.durationMinutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMins = totalMinutes % 60
  const totalHoursStr = `${totalHours}h ${String(remainingMins).padStart(2, '0')}m`

  const activeProjects = new Set(
    timeEntries.filter((e: any) => e.project).map((e: any) => e.projectId)
  ).size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Dashboard</h1>
        <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
          Add Manual Entry
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <MetricCard label="Total Hours This Week" value={isLoading ? '—' : totalHoursStr} trend={timeEntries.length > 0 ? `${timeEntries.length} entries` : 'No entries yet'} />
        </div>
        <div className="col-span-4">
          <MetricCard label="Utilization Rate" value="—" trend="Target: 85%" />
        </div>
        <div className="col-span-4">
          <MetricCard label="Active Projects" value={isLoading ? '—' : String(activeProjects)} trend={activeProjects > 0 ? `${activeProjects} with time logged` : 'No active projects'} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-dark-text mb-3">Recent Time Entries</h2>
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <ErrorState message="Failed to load time entries" onRetry={() => refetch()} />
        ) : timeEntries.length === 0 ? (
          <EmptyState message="No time entries yet. Start tracking to see your entries here." />
        ) : (
          <TimeEntriesTable entries={timeEntries} />
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-dark-text mt-1">{value}</p>
      <p className="text-xs text-muted mt-1">{trend}</p>
    </div>
  )
}

type TimeEntryStatus = 'running' | 'pending' | 'approved' | 'rejected' | 'invoiced'

const statusConfig: Record<TimeEntryStatus, { bg: string; text: string; dot: string; label: string }> = {
  running: { bg: 'bg-brand-light', text: 'text-brand', dot: 'bg-brand animate-pulse-dot', label: 'Running' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Rejected' },
  invoiced: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Invoiced' },
}

function StatusBadge({ status }: { status: TimeEntryStatus }) {
  const config = statusConfig[status] ?? statusConfig.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function TimeEntriesTable({ entries }: { entries: any[] }) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-light-bg border-b border-border">
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Project</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Description</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Tags</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Duration</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry: any) => (
            <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
              <td className="px-3 py-1.5 text-muted whitespace-nowrap">{formatDate(entry.startedAt)}</td>
              <td className="px-3 py-1.5">
                <div className="text-dark-text font-medium">{entry.project?.name ?? '—'}</div>
                <div className="text-xs text-muted">{entry.project?.client?.name ?? ''}</div>
              </td>
              <td className="px-3 py-1.5 text-dark-text">{entry.description ?? '—'}</td>
              <td className="px-3 py-1.5">
                <div className="flex gap-1">
                  {(entry.timeEntryTags ?? []).map((t: any) => (
                    <span key={t.tag?.id ?? t.tagId} className="inline-flex items-center rounded-full bg-brand-light text-brand px-2 py-0.5 text-xs">
                      {t.tag?.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">{formatDuration(entry.durationMinutes ?? 0)}</td>
              <td className="px-3 py-1.5"><StatusBadge status={entry.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
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
