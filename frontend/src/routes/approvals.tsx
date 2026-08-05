import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Lock, CheckCheck, X } from 'lucide-react'
import {
  useTimeEntries,
  useApproveTimeEntry,
  useRejectTimeEntry,
  useApproveTimeEntries,
} from '@/hooks'
import { routeGuard } from '@/lib/routeGuard'

export const Route = createFileRoute('/approvals')({
  beforeLoad: routeGuard('/approvals'),
  component: Approvals,
})

const DEMO_ACTOR_ID = '00000000-0000-0000-0000-000000000001'

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

type Status = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All entries' },
]

function Approvals() {
  const [status, setStatus] = useState<Status>('pending')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rejecting, setRejecting] = useState<{ ids: string[]; singleName?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const params = status === 'all' ? undefined : { status }
  const { data: entries = [], isLoading, error: loadError, refetch } = useTimeEntries(params)
  const approveOne = useApproveTimeEntry()
  const rejectOne = useRejectTimeEntry()
  const approveMany = useApproveTimeEntries()

  const selectable = entries.filter((e: any) => e.status === 'pending')
  const allSelected = selectable.length > 0 && selectable.every((e: any) => selected.has(e.id))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected((prev) => {
      if (selectable.every((e: any) => prev.has(e.id))) {
        const next = new Set(prev)
        selectable.forEach((e: any) => next.delete(e.id))
        return next
      }
      const next = new Set(prev)
      selectable.forEach((e: any) => next.add(e.id))
      return next
    })

  const handleApprove = (ids: string[]) => {
    setError(null)
    const onError = (err: any) => setError(err.message ?? 'Failed to approve')
    if (ids.length === 1) {
      approveOne.mutate({ id: ids[0], actorId: DEMO_ACTOR_ID }, { onError })
    } else {
      approveMany.mutate({ actorId: DEMO_ACTOR_ID, ids }, { onSuccess: () => setSelected(new Set()), onError })
    }
  }

  const handleReject = (ids: string[], singleName?: string) => {
    setError(null)
    setRejecting({ ids, singleName })
  }

  const confirmReject = (reason: string) => {
    if (!rejecting) return
    const ids = rejecting.ids
    const onError = (err: any) => setError(err.message ?? 'Failed to reject')
    const onSuccess = () => {
      setSelected(new Set())
      setRejecting(null)
    }
    if (ids.length === 1) {
      rejectOne.mutate({ id: ids[0], actorId: DEMO_ACTOR_ID, rejectionReason: reason }, { onSuccess, onError })
    } else {
      rejectOne.mutate({ id: ids[0], actorId: DEMO_ACTOR_ID, rejectionReason: reason }, {
        onSuccess: async () => {
          for (const id of ids.slice(1)) {
            await rejectOne.mutateAsync({ id, actorId: DEMO_ACTOR_ID, rejectionReason: reason }).catch(() => {})
          }
          onSuccess()
        },
        onError,
      })
    }
  }

  const isLocked = (e: any) => e.status === 'approved' || e.status === 'invoiced'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Approvals</h1>
        <div>
          <select value={status} onChange={(e) => { setStatus(e.target.value as Status); setSelected(new Set()) }} className={`${inputClass} w-48`}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="rounded-lg border border-border bg-white p-3 flex items-center gap-3">
          <span className="text-sm text-dark-text">{selected.size} selected</span>
          <button
            onClick={() => handleApprove([...selected])}
            disabled={approveMany.isPending}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors duration-75"
          >
            <CheckCheck className="h-4 w-4" />
            Approve Selected
          </button>
          <button
            onClick={() => handleReject([...selected])}
            disabled={rejectOne.isPending}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-error text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors duration-75"
          >
            <X className="h-4 w-4" />
            Reject Selected
          </button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : loadError ? (
        <ErrorState message="Failed to load time entries" onRetry={() => refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState message={status === 'pending' ? 'No pending entries awaiting review.' : 'No entries match this filter.'} />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-light-bg border-b border-border">
                <th className="px-3 py-2.5 w-10">
                  {selectable.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border accent-brand"
                    />
                  )}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Worker</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Project</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Description</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Duration</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => {
                const locked = isLocked(entry)
                return (
                  <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                    <td className="px-3 py-1.5">
                      {locked ? (
                        <Lock className="h-3.5 w-3.5 text-muted" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggle(entry.id)}
                          className="h-4 w-4 rounded border-border accent-brand"
                        />
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-muted whitespace-nowrap">{formatDate(entry.startedAt)}</td>
                    <td className="px-3 py-1.5 text-dark-text">{entry.user?.name ?? '—'}</td>
                    <td className="px-3 py-1.5">
                      <div className="text-dark-text font-medium">{entry.project?.name ?? '—'}</div>
                      <div className="text-xs text-muted">{entry.project?.client?.name ?? ''}</div>
                    </td>
                    <td className="px-3 py-1.5 text-dark-text">
                      {entry.description ?? '—'}
                      {entry.rejectionReason && (
                        <div className="text-xs text-red-600 mt-0.5">Rejected: {entry.rejectionReason}</div>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">{formatDuration(entry.durationMinutes ?? 0)}</td>
                    <td className="px-3 py-1.5"><StatusBadge status={entry.status} /></td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-2">
                        {entry.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove([entry.id])}
                              disabled={approveOne.isPending}
                              className="inline-flex items-center gap-1 justify-center h-8 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs font-medium transition-colors duration-75"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject([entry.id], entry.description)}
                              disabled={rejectOne.isPending}
                              className="inline-flex items-center gap-1 justify-center h-8 px-3 rounded-md border border-error text-error hover:bg-red-50 disabled:opacity-50 text-xs font-medium transition-colors duration-75"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted">{locked ? 'Locked' : '—'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {rejecting && (
        <RejectModal
          count={rejecting.ids.length}
          entryName={rejecting.singleName}
          isPending={rejectOne.isPending}
          onCancel={() => setRejecting(null)}
          onConfirm={confirmReject}
        />
      )}
    </div>
  )
}

function RejectModal({
  count,
  entryName,
  isPending,
  onCancel,
  onConfirm,
}: {
  count: number
  entryName?: string
  isPending: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('A rejection reason is required')
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-6" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-border bg-white p-6 w-full max-w-md space-y-4"
      >
        <h2 className="text-lg font-semibold text-dark-text">
          Reject {count > 1 ? `${count} time entries` : 'time entry'}
        </h2>
        {count === 1 && entryName && (
          <p className="text-sm text-muted">"{entryName}"</p>
        )}
        <div>
          <label className="text-sm font-medium text-dark-text">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this entry is being rejected..."
            className={`${inputClass} w-full mt-1 py-2`}
          />
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="bg-error text-white hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
          >
            {isPending ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </form>
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
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
