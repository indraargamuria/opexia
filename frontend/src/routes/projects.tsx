import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useProjects, useCreateProject, useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks'
import { isValidClientCode } from '@/lib/validation'

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

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

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
  const [showNewProject, setShowNewProject] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Projects</h1>
        <button
          onClick={() => setShowNewProject(true)}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
        >
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
                <tr key={project.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
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

      <ClientsSection />

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </div>
  )
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { data: clients = [] } = useClients()
  const createProject = useCreateProject()
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('planning')
  const [budgetHours, setBudgetHours] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!clientId || !name || !code) return
    createProject.mutate(
      {
        clientId,
        name,
        code,
        status,
        budgetHours: budgetHours ? Number(budgetHours) : undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-border bg-white p-6 w-full max-w-lg space-y-4"
      >
        <h2 className="text-lg font-semibold text-dark-text">New Project</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-text">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${inputClass} w-full mt-1`}>
              <option value="">Select client</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-dark-text">Project name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q4 Audit" className={`${inputClass} w-full mt-1`} />
          </div>
          <div>
            <label className="text-sm font-medium text-dark-text">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="q4-audit" className={`${inputClass} w-full mt-1`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-text">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-full mt-1`}>
                {Object.entries(projectStatusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text">Budget hours</label>
              <input value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} type="number" min="0" placeholder="120" className={`${inputClass} w-full mt-1`} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!clientId || !name || !code || createProject.isPending}
            className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
          >
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ClientsSection() {
  const { data: clients = [], isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [billingRate, setBillingRate] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !code) return
    if (!isValidClientCode(code)) {
      setCodeError('Code must be alphanumeric plus hyphens only')
      return
    }
    setCodeError(null)
    createClient.mutate(
      { name, code, billingRate: billingRate ? Number(billingRate) : undefined },
      {
        onSuccess: () => {
          setName('')
          setCode('')
          setBillingRate('')
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-dark-text">Clients</h2>
        <span className="text-xs text-muted">{clients.length} total</span>
      </div>

      <form onSubmit={handleAdd} className="px-4 py-3 flex items-center gap-3 border-b border-border bg-light-bg">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className={`${inputClass} flex-1`} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. acme-co)" className={`${inputClass} w-44 font-mono text-xs`} />
        <input value={billingRate} onChange={(e) => setBillingRate(e.target.value)} type="number" min="0" placeholder="Rate $/h" className={`${inputClass} w-28`} />
        <button
          type="submit"
          disabled={!name || !code || createClient.isPending}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
        >
          Add Client
        </button>
      </form>
      {codeError && <p className="px-4 pt-2 text-xs text-error">{codeError}</p>}

      {isLoading ? (
        <TableSkeleton rows={3} cols={5} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-light-bg border-b border-border">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Client</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Code</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Rate</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client: any) => (
              <tr key={client.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                <td className="px-3 py-1.5 font-medium text-dark-text">{client.name}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-muted">{client.code}</td>
                <td className="px-3 py-1.5 text-right text-dark-text whitespace-nowrap">{client.billingRate != null ? `$${client.billingRate}/h` : '—'}</td>
                <td className="px-3 py-1.5">
                  {client.isActive ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-medium">Inactive</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => updateClient.mutate({ id: client.id, patch: { isActive: !client.isActive } })}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-border text-xs font-medium text-dark-text hover:bg-highlight transition-colors duration-75"
                    >
                      {client.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => deleteClient.mutate(client.id)}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-error text-white hover:bg-red-700 text-xs font-medium transition-colors duration-75"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
