import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
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
          <MetricCard label="Total Hours This Week" value="32h 15m" trend="+4.2h vs last week" />
        </div>
        <div className="col-span-4">
          <MetricCard label="Utilization Rate" value="87%" trend="Target: 85%" />
        </div>
        <div className="col-span-4">
          <MetricCard label="Active Projects" value="5" trend="2 pending review" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-dark-text mb-3">Recent Time Entries</h2>
        <TimeEntriesTable />
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

interface TimeEntry {
  id: string
  project: string
  client: string
  description: string
  duration: string
  date: string
  status: TimeEntryStatus
  tags: string[]
}

const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    project: 'Q4 Financial Audit',
    client: 'Acme Corp',
    description: 'Review quarterly financial statements',
    duration: '02:34:17',
    date: 'Today',
    status: 'running',
    tags: ['billable'],
  },
  {
    id: '2',
    project: 'Cloud Migration',
    client: 'TechVault Inc',
    description: 'Infrastructure assessment and planning',
    duration: '03:15:00',
    date: 'Today',
    status: 'pending',
    tags: ['billable', 'deep-work'],
  },
  {
    id: '3',
    project: 'Security Compliance',
    client: 'DataGuard LLC',
    description: 'ISO 27001 gap analysis',
    duration: '04:00:00',
    date: 'Yesterday',
    status: 'approved',
    tags: ['billable'],
  },
  {
    id: '4',
    project: 'Q4 Financial Audit',
    client: 'Acme Corp',
    description: 'Stakeholder interview preparation',
    duration: '01:45:00',
    date: 'Yesterday',
    status: 'approved',
    tags: ['billable', 'meeting'],
  },
  {
    id: '5',
    project: 'Internal Operations',
    client: 'Opexia',
    description: 'Team standup and sprint planning',
    duration: '01:00:00',
    date: 'Jul 18',
    status: 'rejected',
    tags: ['non-billable', 'meeting'],
  },
  {
    id: '6',
    project: 'ERP Integration',
    client: 'GlobalServ',
    description: 'SAP connector API development',
    duration: '05:30:00',
    date: 'Jul 17',
    status: 'invoiced',
    tags: ['billable', 'deep-work'],
  },
]

const statusConfig: Record<TimeEntryStatus, { bg: string; text: string; dot: string; label: string }> = {
  running: { bg: 'bg-brand-light', text: 'text-brand', dot: 'bg-brand animate-pulse-dot', label: 'Running' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Rejected' },
  invoiced: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Invoiced' },
}

function StatusBadge({ status }: { status: TimeEntryStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function TimeEntriesTable() {
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
          {mockTimeEntries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
              <td className="px-3 py-1.5 text-muted whitespace-nowrap">{entry.date}</td>
              <td className="px-3 py-1.5">
                <div className="text-dark-text font-medium">{entry.project}</div>
                <div className="text-xs text-muted">{entry.client}</div>
              </td>
              <td className="px-3 py-1.5 text-dark-text">{entry.description}</td>
              <td className="px-3 py-1.5">
                <div className="flex gap-1">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-full bg-brand-light text-brand px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">{entry.duration}</td>
              <td className="px-3 py-1.5"><StatusBadge status={entry.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
