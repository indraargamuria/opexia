import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { routeGuard } from '@/lib/routeGuard'
import { periodRange, utilizationLevel, utilizationBarClass, utilizationTextClass, toISODate, type PeriodKey } from '@/lib/period'
import { useReportsOverview } from '@/hooks'
import { downloadReport } from '@/lib/api'

export const Route = createFileRoute('/reports')({
  beforeLoad: routeGuard('/reports'),
  component: Reports,
})

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`
}

function formatMoney(cost: number): string {
  return cost.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function Reports() {
  const now = new Date()
  const [periodKey, setPeriodKey] = useState<PeriodKey>('month')
  const [customFrom, setCustomFrom] = useState(() => toISODate(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [customTo, setCustomTo] = useState(() => toISODate(now))

  const params = periodKey === 'custom'
    ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined }
    : periodRange(periodKey, now)

  const { data, isLoading, isError, error, refetch } = useReportsOverview(params)
  const [downloading, setDownloading] = useState<'xlsx' | 'csv' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport(format: 'xlsx' | 'csv') {
    setDownloading(format)
    setExportError(null)
    try {
      await downloadReport(format, params)
    } catch (err) {
      setExportError((err as Error).message)
    }
    setDownloading(null)
  }

  const projectRows = data ? [...data.byProject].sort((a, b) => b.minutes - a.minutes) : []
  const members = data?.team.members ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Reports</h1>
        <div className="flex items-center gap-2">
          <select
            aria-label="Period"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
            className="h-9 px-3 border border-border rounded-md text-sm bg-white text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="custom">Custom Range</option>
          </select>
          {periodKey === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="From"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 px-3 border border-border rounded-md text-sm bg-white text-dark-text"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 px-3 border border-border rounded-md text-sm bg-white text-dark-text"
              />
            </div>
          )}
          <button
            onClick={() => handleExport('xlsx')}
            disabled={downloading !== null}
            className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75 disabled:opacity-50"
          >
            Export Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={downloading !== null}
            className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md bg-red-50 border border-error/20 px-4 py-3 text-sm text-error flex items-center justify-between">
          <span>Failed to load reports: {(error as Error).message}</span>
          <button onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      )}

      {exportError && (
        <div className="rounded-md bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          Export failed: {exportError}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted">
          Loading reports…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Hours</p>
                <p className="text-2xl font-semibold text-dark-text mt-1">{formatHours(data.totals.minutes)}</p>
                <p className="text-xs text-muted mt-1">Across {data.byProject.length} projects</p>
              </div>
            </div>
            <div className="col-span-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Cost</p>
                <p className="text-2xl font-semibold text-dark-text mt-1">${formatMoney(data.totals.cost)}</p>
                <p className="text-xs text-muted mt-1">{data.clients.length} clients</p>
              </div>
            </div>
            <div className="col-span-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Active Projects</p>
                <p className="text-2xl font-semibold text-dark-text mt-1">{data.byProject.length}</p>
                <p className="text-xs text-muted mt-1">{data.totals.count} time entries</p>
              </div>
            </div>
            <div className="col-span-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Avg Utilization</p>
                <p className="text-2xl font-semibold text-dark-text mt-1">{data.team.teamTotals.averageUtilizationPercent}%</p>
                <p className="text-xs text-muted mt-1">{data.team.teamTotals.activeWorkerCount} active members</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8">
              <h2 className="text-lg font-semibold text-dark-text mb-3">Project Summary</h2>
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-light-bg border-b border-border">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Project</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Hours</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Budget</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted">No time logged in this period</td>
                      </tr>
                    )}
                    {projectRows.map((row) => {
                      const level = utilizationLevel(row.budgetUtilization.percentage)
                      return (
                        <tr key={row.projectId} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                          <td className="px-3 py-1.5">
                            <div className="text-dark-text font-medium">{row.name}</div>
                            <div className="text-xs text-muted">{row.clientName}</div>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text">{formatHours(row.minutes)}</td>
                          <td className="px-3 py-1.5 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted-bg rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${utilizationBarClass(level)}`}
                                  style={{ width: `${Math.min(row.budgetUtilization.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted whitespace-nowrap">{Math.round(row.budgetUtilization.percentage)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">${formatMoney(row.cost)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-span-4">
              <h2 className="text-lg font-semibold text-dark-text mb-3">Team Utilization</h2>
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-light-bg border-b border-border">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Member</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Util.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-6 text-center text-sm text-muted">No time logged in this period</td>
                      </tr>
                    )}
                    {members.map((member) => {
                      const level = utilizationLevel(member.utilizationPercent)
                      return (
                        <tr key={member.userId} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                          <td className="px-3 py-1.5">
                            <div className="text-dark-text font-medium">{member.name}</div>
                            <div className="text-xs text-muted">{formatHours(member.minutes)} logged</div>
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <span className={`font-mono text-sm font-medium ${utilizationTextClass(level)}`}>
                              {member.utilizationPercent}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
