import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects')({
  component: Projects,
})

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

interface Project {
  id: string
  name: string
  code: string
  client: string
  status: ProjectStatus
  budgetHours: number
  loggedHours: number
  startDate: string
  endDate: string
}

const mockProjects: Project[] = [
  { id: '1', name: 'Q4 Financial Audit', code: 'ACM-Q4FA', client: 'Acme Corp', status: 'active', budgetHours: 320, loggedHours: 187, startDate: 'Oct 1, 2025', endDate: 'Dec 31, 2025' },
  { id: '2', name: 'Cloud Migration', code: 'TVI-CM25', client: 'TechVault Inc', status: 'active', budgetHours: 480, loggedHours: 312, startDate: 'Sep 15, 2025', endDate: 'Mar 15, 2026' },
  { id: '3', name: 'Security Compliance Audit', code: 'DGL-SCA', client: 'DataGuard LLC', status: 'active', budgetHours: 200, loggedHours: 156, startDate: 'Nov 1, 2025', endDate: 'Jan 31, 2026' },
  { id: '4', name: 'ERP Integration', code: 'GS-ERPI', client: 'GlobalServ', status: 'completed', budgetHours: 600, loggedHours: 578, startDate: 'Jun 1, 2025', endDate: 'Oct 30, 2025' },
  { id: '5', name: 'Mobile App Redesign', code: 'PXL-MAR', client: 'PixelWorks', status: 'planning', budgetHours: 240, loggedHours: 0, startDate: 'Jan 15, 2026', endDate: 'Apr 30, 2026' },
  { id: '6', name: 'Data Pipeline Overhaul', code: 'NF-DPO', client: 'NextFlow', status: 'on_hold', budgetHours: 350, loggedHours: 89, startDate: 'Aug 1, 2025', endDate: 'Feb 28, 2026' },
  { id: '7', name: 'Annual Compliance Review', code: 'ACM-ACR', client: 'Acme Corp', status: 'active', budgetHours: 160, loggedHours: 64, startDate: 'Dec 1, 2025', endDate: 'Feb 28, 2026' },
  { id: '8', name: 'Network Infrastructure', code: 'TVI-NI', client: 'TechVault Inc', status: 'completed', budgetHours: 280, loggedHours: 265, startDate: 'Jul 1, 2025', endDate: 'Nov 15, 2025' },
]

const projectStatusConfig: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Planning' },
  active: { bg: 'bg-brand-light', text: 'text-brand', label: 'Active' },
  on_hold: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'On Hold' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Archived' },
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = projectStatusConfig[status]
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

function Projects() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Projects</h1>
        <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
          New Project
        </button>
      </div>

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
            {mockProjects.map((project) => (
              <tr key={project.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9 cursor-pointer">
                <td className="px-3 py-1.5 font-medium text-dark-text">{project.name}</td>
                <td className="px-3 py-1.5 text-muted">{project.client}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-muted">{project.code}</td>
                <td className="px-3 py-1.5"><ProjectStatusBadge status={project.status} /></td>
                <td className="px-3 py-1.5 min-w-[180px]">
                  <BudgetBar logged={project.loggedHours} budget={project.budgetHours} />
                </td>
                <td className="px-3 py-1.5 text-muted whitespace-nowrap text-xs">{project.startDate} — {project.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
