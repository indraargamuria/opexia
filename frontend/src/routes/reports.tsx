import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reports')({
  component: Reports,
})

interface ProjectSummary {
  id: string
  project: string
  client: string
  totalHours: number
  billableHours: number
  budgetHours: number
  utilization: number
  totalCost: number
  status: string
}

const mockSummaries: ProjectSummary[] = [
  { id: '1', project: 'Q4 Financial Audit', client: 'Acme Corp', totalHours: 187, billableHours: 172, budgetHours: 320, utilization: 58, totalCost: 34595, status: 'active' },
  { id: '2', project: 'Cloud Migration', client: 'TechVault Inc', totalHours: 312, billableHours: 298, budgetHours: 480, utilization: 65, totalCost: 49920, status: 'active' },
  { id: '3', project: 'Security Compliance Audit', client: 'DataGuard LLC', totalHours: 156, billableHours: 148, budgetHours: 200, utilization: 78, totalCost: 25740, status: 'active' },
  { id: '4', project: 'ERP Integration', client: 'GlobalServ', totalHours: 578, billableHours: 564, budgetHours: 600, utilization: 96, totalCost: 80920, status: 'completed' },
  { id: '5', project: 'Annual Compliance Review', client: 'Acme Corp', totalHours: 64, billableHours: 60, budgetHours: 160, utilization: 40, totalCost: 11840, status: 'active' },
]

const mockTeamUtilization = [
  { name: 'Jane Doe', hoursLogged: 38, target: 40, utilization: 95 },
  { name: 'Marcus Chen', hoursLogged: 35, target: 40, utilization: 88 },
  { name: 'Sarah Kim', hoursLogged: 40, target: 40, utilization: 100 },
  { name: 'David Okafor', hoursLogged: 32, target: 40, utilization: 80 },
  { name: 'Elena Vasquez', hoursLogged: 28, target: 40, utilization: 70 },
]

function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Reports</h1>
        <div className="flex items-center gap-2">
          <select className="h-9 px-3 border border-border rounded-md text-sm bg-white text-dark-text">
            <option>This Week</option>
            <option>This Month</option>
            <option>This Quarter</option>
            <option>Custom Range</option>
          </select>
          <button className="bg-dark-accent text-white hover:bg-dark-accent-hover px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
            Export Excel
          </button>
          <button className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Hours</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">1,297h</p>
            <p className="text-xs text-muted mt-1">Across 5 projects</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Billable Hours</p>
            <p className="text-2xl font-semibold text-success mt-1">1,242h</p>
            <p className="text-xs text-muted mt-1">95.8% billable rate</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">$203,015</p>
            <p className="text-xs text-muted mt-1">Avg $156.52/h</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Avg Utilization</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">87%</p>
            <p className="text-xs text-success mt-1">Above 85% target</p>
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
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Billable</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Budget</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Cost</th>
                </tr>
              </thead>
              <tbody>
                {mockSummaries.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                    <td className="px-3 py-1.5">
                      <div className="text-dark-text font-medium">{row.project}</div>
                      <div className="text-xs text-muted">{row.client}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text">{row.totalHours}h</td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text">{row.billableHours}h</td>
                    <td className="px-3 py-1.5 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted-bg rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.utilization >= 100 ? 'bg-error' : row.utilization >= 90 ? 'bg-warning' : 'bg-brand'}`}
                            style={{ width: `${Math.min(row.utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap">{row.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">${row.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
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
                {mockTeamUtilization.map((member) => (
                  <tr key={member.name} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                    <td className="px-3 py-1.5">
                      <div className="text-dark-text font-medium">{member.name}</div>
                      <div className="text-xs text-muted">{member.hoursLogged}h / {member.target}h</div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`font-mono text-sm font-medium ${member.utilization >= 90 ? 'text-success' : member.utilization >= 75 ? 'text-warning' : 'text-error'}`}>
                        {member.utilization}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
