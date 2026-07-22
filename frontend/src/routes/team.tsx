import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/team')({
  component: Team,
})

type TeamRole = 'admin' | 'manager' | 'worker' | 'viewer'

interface TeamMember {
  id: string
  name: string
  email: string
  initials: string
  role: TeamRole
  hourlyRate: number
  projects: { name: string; code: string; allocation: number }[]
  weeklyHours: number
  status: 'active' | 'inactive'
}

const mockMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane.doe@opexia.com',
    initials: 'JD',
    role: 'admin',
    hourlyRate: 185,
    projects: [
      { name: 'Q4 Financial Audit', code: 'ACM-Q4FA', allocation: 40 },
      { name: 'Cloud Migration', code: 'TVI-CM25', allocation: 30 },
    ],
    weeklyHours: 38,
    status: 'active',
  },
  {
    id: '2',
    name: 'Marcus Chen',
    email: 'marcus.chen@opexia.com',
    initials: 'MC',
    role: 'manager',
    hourlyRate: 165,
    projects: [
      { name: 'Security Compliance Audit', code: 'DGL-SCA', allocation: 50 },
      { name: 'Annual Compliance Review', code: 'ACM-ACR', allocation: 30 },
    ],
    weeklyHours: 35,
    status: 'active',
  },
  {
    id: '3',
    name: 'Sarah Kim',
    email: 'sarah.kim@opexia.com',
    initials: 'SK',
    role: 'worker',
    hourlyRate: 140,
    projects: [
      { name: 'Cloud Migration', code: 'TVI-CM25', allocation: 60 },
      { name: 'ERP Integration', code: 'GS-ERPI', allocation: 20 },
    ],
    weeklyHours: 40,
    status: 'active',
  },
  {
    id: '4',
    name: 'David Okafor',
    email: 'david.okafor@opexia.com',
    initials: 'DO',
    role: 'worker',
    hourlyRate: 140,
    projects: [
      { name: 'Q4 Financial Audit', code: 'ACM-Q4FA', allocation: 45 },
      { name: 'Annual Compliance Review', code: 'ACM-ACR', allocation: 25 },
    ],
    weeklyHours: 32,
    status: 'active',
  },
  {
    id: '5',
    name: 'Elena Vasquez',
    email: 'elena.vasquez@opexia.com',
    initials: 'EV',
    role: 'worker',
    hourlyRate: 135,
    projects: [
      { name: 'Data Pipeline Overhaul', code: 'NF-DPO', allocation: 70 },
    ],
    weeklyHours: 28,
    status: 'active',
  },
  {
    id: '6',
    name: 'Tom Bradley',
    email: 'tom.bradley@opexia.com',
    initials: 'TB',
    role: 'viewer',
    hourlyRate: 0,
    projects: [],
    weeklyHours: 0,
    status: 'inactive',
  },
]

const roleConfig: Record<TeamRole, { bg: string; text: string; label: string }> = {
  admin: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Admin' },
  manager: { bg: 'bg-brand-light', text: 'text-brand', label: 'Manager' },
  worker: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Worker' },
  viewer: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Viewer' },
}

function RoleBadge({ role }: { role: TeamRole }) {
  const config = roleConfig[role]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function Team() {
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
            <p className="text-2xl font-semibold text-dark-text mt-1">6</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Active</p>
            <p className="text-2xl font-semibold text-success mt-1">5</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Avg Utilization</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">82%</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Weekly Hours</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">173h</p>
          </div>
        </div>
      </div>

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
            {mockMembers.map((member) => (
              <tr key={member.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9 cursor-pointer">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-dark-accent flex items-center justify-center text-white text-[10px] font-medium shrink-0">
                      {member.initials}
                    </div>
                    <div>
                      <div className="text-dark-text font-medium">{member.name}</div>
                      <div className="text-xs text-muted">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5"><RoleBadge role={member.role} /></td>
                <td className="px-3 py-1.5 text-muted whitespace-nowrap">{member.hourlyRate > 0 ? `$${member.hourlyRate}/h` : '—'}</td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-col gap-0.5">
                    {member.projects.map((p) => (
                      <span key={p.code} className="text-xs text-dark-text">{p.name} <span className="text-muted">({p.allocation}%)</span></span>
                    ))}
                    {member.projects.length === 0 && <span className="text-xs text-muted">—</span>}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text whitespace-nowrap">{member.weeklyHours}h</td>
                <td className="px-3 py-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {member.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
