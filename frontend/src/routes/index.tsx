import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry, useProjects, useTags, useReportsMe } from '@/hooks'
import { routeGuard } from '@/lib/routeGuard'

export const Route = createFileRoute('/')({
  beforeLoad: routeGuard('/'),
  component: Dashboard,
})

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

function Dashboard() {
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', projectId: '', status: '' })
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any | null>(null)

  const params = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    projectId: filters.projectId || undefined,
    status: filters.status || undefined,
  }
  const { data: timeEntries = [], isLoading, error, refetch } = useTimeEntries(params)
  const { data: projects = [] } = useProjects()
  const { data: report } = useReportsMe(DEMO_USER_ID)

  const totalMinutes = report?.weeklyTotalMinutes ?? 0
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMins = totalMinutes % 60
  const totalHoursStr = `${totalHours}h ${String(remainingMins).padStart(2, '0')}m`
  const utilizationPercent = report?.utilizationPercent ?? 0
  const activeProjects = report?.activeProjects ?? 0

  const hasFilters = Boolean(params.dateFrom || params.dateTo || params.projectId || params.status)

  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Dashboard</h1>
        <button
          onClick={() => setShowEntryModal(true)}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
        >
          Add Manual Entry
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <MetricCard label="Total Hours This Week" value={isLoading ? '—' : totalHoursStr} trend={report ? `${shortDate(report.weekStart)} — ${shortDate(report.weekEnd)}` : 'This week'} />
        </div>
        <div className="col-span-4">
          <MetricCard label="Utilization Rate" value={isLoading ? '—' : `${utilizationPercent}%`} trend="Target: 85%" />
        </div>
        <div className="col-span-4">
          <MetricCard label="Active Projects" value={isLoading ? '—' : String(activeProjects)} trend={activeProjects > 0 ? `${activeProjects} with time logged` : 'No active projects'} />
        </div>
      </div>

      <FilterBar filters={filters} projects={projects} hasFilters={hasFilters} onChange={setFilter} />

      <div>
        <h2 className="text-lg font-semibold text-dark-text mb-3">Recent Time Entries</h2>
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorState message="Failed to load time entries" onRetry={() => refetch()} />
        ) : timeEntries.length === 0 ? (
          <EmptyState message={hasFilters ? 'No time entries match the current filters.' : 'No time entries yet. Start tracking to see your entries here.'} />
        ) : (
          <TimeEntriesTable entries={timeEntries} onEdit={setEditingEntry} />
        )}
      </div>

      {showEntryModal && <EntryFormModal onClose={() => setShowEntryModal(false)} />}
      {editingEntry && <EntryFormModal entry={editingEntry} onClose={() => setEditingEntry(null)} />}
    </div>
  )
}

function FilterBar({
  filters,
  projects,
  hasFilters,
  onChange,
}: {
  filters: { dateFrom: string; dateTo: string; projectId: string; status: string }
  projects: any[]
  hasFilters: boolean
  onChange: (key: keyof typeof filters, value: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">From</label>
          <input type="date" value={filters.dateFrom} onChange={(e) => onChange('dateFrom', e.target.value)} className={`${inputClass} w-40`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">To</label>
          <input type="date" value={filters.dateTo} onChange={(e) => onChange('dateTo', e.target.value)} className={`${inputClass} w-40`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Project</label>
          <select value={filters.projectId} onChange={(e) => onChange('projectId', e.target.value)} className={`${inputClass} w-48`}>
            <option value="">All projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Status</label>
          <select value={filters.status} onChange={(e) => onChange('status', e.target.value)} className={`${inputClass} w-36`}>
            <option value="">All statuses</option>
            {(Object.keys(statusConfig) as TimeEntryStatus[]).map((key) => (
              <option key={key} value={key}>{statusConfig[key].label}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={() => { onChange('dateFrom', ''); onChange('dateTo', ''); onChange('projectId', ''); onChange('status', '') }}
            className="mt-5 inline-flex items-center justify-center h-9 px-3 rounded-md border border-border text-xs font-medium text-dark-text hover:bg-highlight transition-colors duration-75"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function EntryFormModal({ entry, onClose }: { entry?: any; onClose: () => void }) {
  const { data: projects = [] } = useProjects()
  const { data: tags = [] } = useTags()
  const createEntry = useCreateTimeEntry()
  const updateEntry = useUpdateTimeEntry()
  const isEditing = Boolean(entry)

  const entryDate = entry?.startedAt ? new Date(entry.startedAt) : new Date()
  const [projectId, setProjectId] = useState(entry?.projectId ?? '')
  const [date, setDate] = useState(entryDate.toISOString().slice(0, 10))
  const [time, setTime] = useState('09:00')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [hours, setHours] = useState(entry?.durationMinutes != null ? String(Math.floor(entry.durationMinutes / 60)) : '')
  const [minutes, setMinutes] = useState(entry?.durationMinutes != null ? String(entry.durationMinutes % 60) : '')
  const [tagIds, setTagIds] = useState<string[]>(entry ? (entry.timeEntryTags ?? []).map((t: any) => t.tagId) : [])
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    const durationMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0)
    if (durationMinutes <= 0) {
      setError('Duration must be greater than zero')
      return
    }
    setError(null)
    const startedAt = new Date(`${date}T${time}`).toISOString()
    const onSuccess = () => onClose()
    if (isEditing) {
      updateEntry.mutate(
        { id: entry.id, data: { description: description || undefined, durationMinutes, startedAt, tagIds } },
        { onSuccess, onError: (err: any) => setError(err.message ?? 'Failed to update entry') },
      )
    } else {
      createEntry.mutate(
        { userId: DEMO_USER_ID, projectId, description: description || undefined, startedAt, durationMinutes, entryMethod: 'manual', tagIds },
        { onSuccess, onError: (err: any) => setError(err.message ?? 'Failed to create entry') },
      )
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-border bg-white p-6 w-full max-w-lg space-y-4"
      >
        <h2 className="text-lg font-semibold text-dark-text">{isEditing ? 'Edit Time Entry' : 'Add Manual Entry'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-text">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputClass} w-full mt-1`}>
              <option value="">Select project</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-text">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} w-full mt-1`} />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text">Start time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} w-full mt-1`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-text">Duration (hrs)</label>
              <input value={hours} onChange={(e) => setHours(e.target.value)} type="number" min="0" placeholder="0" className={`${inputClass} w-full mt-1`} />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text">Duration (min)</label>
              <input value={minutes} onChange={(e) => setMinutes(e.target.value)} type="number" min="0" max="59" placeholder="0" className={`${inputClass} w-full mt-1`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-text">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you work on?" className={`${inputClass} w-full mt-1`} />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-text">Tags</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {tags.map((tag: any) => {
                const active = tagIds.includes(tag.id)
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors duration-75 ${active ? 'bg-brand-light text-brand border-brand/30' : 'bg-white text-muted border-border hover:bg-highlight'}`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                )
              })}
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
            disabled={!projectId || (isEditing ? updateEntry.isPending : createEntry.isPending)}
            className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
          >
            {(isEditing ? updateEntry.isPending : createEntry.isPending) ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Entry')}
          </button>
        </div>
      </form>
    </div>
  )
}

function shortDate(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

function TimeEntriesTable({ entries, onEdit }: { entries: any[]; onEdit: (entry: any) => void }) {
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
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
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
              <td className="px-3 py-1.5">
                <div className="flex items-center justify-end">
                  {entry.status === 'pending' ? (
                    <button
                      onClick={() => onEdit(entry)}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-border text-xs font-medium text-dark-text hover:bg-highlight transition-colors duration-75"
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </div>
              </td>
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
