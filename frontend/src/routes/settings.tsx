import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { routeGuard } from '@/lib/routeGuard'
import {
  useWorkspaceSettings,
  useUpdateWorkspaceSettings,
  useApprovalPolicy,
  useUpdateApprovalPolicy,
  useErpConfig,
  useUpdateErpConfig,
  useWipeWorkspace,
} from '@/hooks'
import type { ApprovalLevel, ExportFormat } from '@/lib/api'

export const Route = createFileRoute('/settings')({
  beforeLoad: routeGuard('/settings'),
  component: Settings,
})

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full'

const navItems = [
  { href: '#workspace', label: 'Workspace' },
  { href: '#approval-policy', label: 'Approval Policy' },
  { href: '#erp', label: 'ERP Integration' },
  { href: '#danger-zone', label: 'Danger Zone' },
]

const approvalOptions: { value: ApprovalLevel; label: string }[] = [
  { value: 'all', label: 'All entries before invoicing' },
  { value: 'billable', label: 'Only billable entries' },
  { value: 'manual', label: 'Manual entries only' },
  { value: 'disabled', label: 'Disabled (auto-approve)' },
]

const exportOptions: { value: ExportFormat; label: string }[] = [
  { value: 'sap', label: 'SAP Standard Format' },
  { value: 'oracle', label: 'Oracle Financials' },
  { value: 'workday', label: 'Workday CSV' },
  { value: 'custom', label: 'Custom CSV' },
]

const commonTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function useSettingsForm<T, F>(data: T | undefined, initial: F) {
  const [form, setState] = useState<F>(initial)
  const dirty = useRef(false)
  const setForm = (next: F | ((prev: F) => F)) => {
    dirty.current = true
    setState(next as F)
  }
  useEffect(() => {
    if (data && !dirty.current) {
      setState(data as unknown as F)
    }
  }, [data])
  return [form, setForm] as const
}

function SettingsSection({ id, title, description, children, footer }: {
  id: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <section id={id} className="rounded-lg border border-border bg-white p-6 space-y-6 scroll-mt-4">
      <div>
        <h2 className="text-lg font-semibold text-dark-text">{title}</h2>
        <p className="text-sm text-muted mt-1">{description}</p>
      </div>
      <div className="space-y-4 max-w-lg">{children}</div>
      {footer}
    </section>
  )
}

function SaveBar({ onSave, saving, error, saved }: {
  onSave: (e: FormEvent) => void
  saving: boolean
  error: string | null
  saved: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {error && <p className="text-sm text-error flex-1">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Saved</p>}
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

function WorkspaceSection() {
  const { data } = useWorkspaceSettings()
  const update = useUpdateWorkspaceSettings()
  const [form, setForm] = useSettingsForm(data, {
    name: '',
    slug: '',
    currency: 'USD',
    timezone: 'UTC',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({
      name: form.name,
      slug: form.slug,
      currency: form.currency,
      timezone: form.timezone,
    }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      },
    })
  }

  return (
    <SettingsSection
      id="workspace"
      title="Workspace"
      description="Manage your organization workspace settings."
      footer={
        <SaveBar
          onSave={handleSave}
          saving={update.isPending}
          error={update.isError ? (update.error as Error).message : null}
          saved={saved}
        />
      }
    >
      <div className="space-y-2">
        <label htmlFor="ws-name" className="text-sm font-medium text-dark-text">Organization Name</label>
        <input
          id="ws-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
          placeholder="Acme Consulting"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="ws-slug" className="text-sm font-medium text-dark-text">Workspace Slug</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted whitespace-nowrap">app.opexia.com/</span>
          <input
            id="ws-slug"
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className={inputClass}
            placeholder="acme-consulting"
          />
        </div>
        <p className="text-xs text-muted">Lowercase letters, numbers, and hyphens (2–50 characters).</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="ws-currency" className="text-sm font-medium text-dark-text">Default Currency</label>
        <select
          id="ws-currency"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
          className={inputClass}
        >
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="CAD">CAD - Canadian Dollar</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="ws-timezone" className="text-sm font-medium text-dark-text">Timezone</label>
        <input
          id="ws-timezone"
          type="text"
          list="timezone-options"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          className={inputClass}
          placeholder="UTC"
        />
        <datalist id="timezone-options">
          {commonTimezones.map((tz) => <option key={tz} value={tz} />)}
        </datalist>
        <p className="text-xs text-muted">Used as the default for reports and manual entry windows.</p>
      </div>
    </SettingsSection>
  )
}

function ApprovalPolicySection() {
  const { data } = useApprovalPolicy()
  const update = useUpdateApprovalPolicy()
  const [form, setForm] = useSettingsForm(data, {
    approvalLevel: 'all' as ApprovalLevel,
    manualEntryWindowDays: 7,
    maxTimerHours: 12,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({
      approvalLevel: form.approvalLevel,
      manualEntryWindowDays: form.manualEntryWindowDays,
      maxTimerHours: form.maxTimerHours,
    }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      },
    })
  }

  return (
    <SettingsSection
      id="approval-policy"
      title="Approval Policy"
      description="Configure how time entries are reviewed and approved."
      footer={
        <SaveBar
          onSave={handleSave}
          saving={update.isPending}
          error={update.isError ? (update.error as Error).message : null}
          saved={saved}
        />
      }
    >
      <div className="space-y-2">
        <label htmlFor="ap-level" className="text-sm font-medium text-dark-text">Approval Required</label>
        <select
          id="ap-level"
          value={form.approvalLevel}
          onChange={(e) => setForm({ ...form, approvalLevel: e.target.value as ApprovalLevel })}
          className={inputClass}
        >
          {approvalOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="ap-window" className="text-sm font-medium text-dark-text">Manual Entry Window</label>
        <input
          id="ap-window"
          type="number"
          min={0}
          max={90}
          value={form.manualEntryWindowDays}
          onChange={(e) => setForm({ ...form, manualEntryWindowDays: Number(e.target.value) })}
          className={inputClass}
        />
        <p className="text-xs text-muted">How far back manual time entries are allowed (days, 0–90).</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="ap-max-hours" className="text-sm font-medium text-dark-text">Max Timer Duration</label>
        <input
          id="ap-max-hours"
          type="number"
          min={1}
          max={24}
          value={form.maxTimerHours}
          onChange={(e) => setForm({ ...form, maxTimerHours: Number(e.target.value) })}
          className={inputClass}
        />
        <p className="text-xs text-muted">Running timers auto-stop after this many hours (1–24).</p>
      </div>
    </SettingsSection>
  )
}

function ErpSection() {
  const { data } = useErpConfig()
  const update = useUpdateErpConfig()
  const [form, setForm] = useSettingsForm(data, {
    exportFormat: 'sap' as ExportFormat,
    costCenterMappingEnabled: true,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({
      exportFormat: form.exportFormat,
      costCenterMappingEnabled: form.costCenterMappingEnabled,
    }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      },
    })
  }

  return (
    <SettingsSection
      id="erp"
      title="ERP Integration"
      description="Configure export mappings for your ERP system."
      footer={
        <SaveBar
          onSave={handleSave}
          saving={update.isPending}
          error={update.isError ? (update.error as Error).message : null}
          saved={saved}
        />
      }
    >
      <div className="space-y-2">
        <label htmlFor="erp-format" className="text-sm font-medium text-dark-text">Export Format</label>
        <select
          id="erp-format"
          value={form.exportFormat}
          onChange={(e) => setForm({ ...form, exportFormat: e.target.value as ExportFormat })}
          className={inputClass}
        >
          {exportOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <div>
          <label htmlFor="cc-mapping" className="text-sm font-medium text-dark-text">Cost Center Mapping</label>
          <p className="text-xs text-muted">Tag ERP codes are automatically mapped during export.</p>
        </div>
        <input
          id="cc-mapping"
          type="checkbox"
          checked={form.costCenterMappingEnabled}
          onChange={(e) => setForm({ ...form, costCenterMappingEnabled: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-brand"
        />
      </div>
    </SettingsSection>
  )
}

function DangerZone() {
  const { data } = useWorkspaceSettings()
  const wipe = useWipeWorkspace()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')

  const handleWipe = () => {
    if (typed.trim() !== data?.slug) return
    wipe.mutate(undefined, {
      onSuccess: () => {
        navigate({ to: '/login' })
      },
    })
  }

  return (
    <SettingsSection
      id="danger-zone"
      title="Danger Zone"
      description="Irreversible actions for this workspace."
      footer={
        confirming && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Type <span className="font-mono text-dark-text">{data?.slug}</span> to confirm permanent deletion.
            </p>
            <input
              id="dz-confirm"
              type="text"
              aria-label="Confirmation text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={inputClass}
              placeholder={data?.slug}
            />
            {wipe.isError && <p className="text-sm text-error">{(wipe.error as Error).message}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setConfirming(false); setTyped('') }}
                className="px-4 py-2 rounded-md text-sm font-medium text-dark-text hover:bg-white/10 transition-colors duration-75"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                disabled={wipe.isPending || typed.trim() !== data?.slug}
                className="bg-error text-white hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
              >
                {wipe.isPending ? 'Deleting…' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="flex items-center justify-between rounded-md border border-error/30 bg-red-50 p-4">
        <div>
          <p className="text-sm font-medium text-dark-text">Delete Workspace</p>
          <p className="text-xs text-muted mt-0.5">Permanently delete this workspace and all associated data.</p>
        </div>
        <button
          onClick={() => setConfirming(true)}
          className="bg-error text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
        >
          Delete
        </button>
      </div>
    </SettingsSection>
  )
}

function Settings() {
  const [active, setActive] = useState('workspace')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">Settings</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setActive(item.href.slice(1))}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-75 ${
                  active === item.href.slice(1)
                    ? 'bg-brand text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="col-span-9 space-y-6">
          <WorkspaceSection />
          <ApprovalPolicySection />
          <ErpSection />
          <DangerZone />
        </div>
      </div>
    </div>
  )
}
