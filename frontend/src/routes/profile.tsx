import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { routeGuard } from '@/lib/routeGuard'
import { useMe, useUpdateMe, useChangePassword } from '@/hooks'
import type { ProfileUser } from '@/lib/api'

export const Route = createFileRoute('/profile')({
  beforeLoad: routeGuard('/profile'),
  component: Profile,
})

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full'

const disabledInputClass =
  'h-9 px-3 rounded-md border border-border bg-muted-bg text-sm text-muted w-full cursor-not-allowed'

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

const dateFormatOptions = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY' },
]

function useAsyncForm<T, F>(data: T | undefined, initial: F) {
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

function formatMemberSince(dateStr: string | undefined) {
  if (!dateStr) return 'Member'
  const d = new Date(dateStr)
  return `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function SaveBar({ onSave, saving, error, saved, label = 'Save Changes' }: {
  onSave: (e: FormEvent) => void
  saving: boolean
  error: string | null
  saved: boolean
  label?: string
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
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

function PersonalInfoSection({ user }: { user: ProfileUser }) {
  const update = useUpdateMe()
  const [form, setForm] = useAsyncForm(user, { name: '', hourlyRate: '' })
  const [saved, setSaved] = useState(false)

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({
      name: form.name.trim(),
      hourlyRate: form.hourlyRate === '' ? null : Number(form.hourlyRate),
    }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      },
    })
  }

  return (
    <section className="rounded-lg border border-border bg-white p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-dark-text">Personal Information</h2>
        <p className="text-sm text-muted mt-1">Your display name and default billing rate.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-sm font-medium text-dark-text">Full Name</label>
          <input
            id="profile-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-email" className="text-sm font-medium text-dark-text">Email</label>
          <input id="profile-email" type="email" value={user.email} disabled className={disabledInputClass} />
          <p className="text-xs text-muted">Contact your administrator to change your email.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-role" className="text-sm font-medium text-dark-text">Role</label>
          <input id="profile-role" type="text" value={user.role} disabled className={disabledInputClass} />
          <p className="text-xs text-muted">Role changes require an administrator.</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-rate" className="text-sm font-medium text-dark-text">Default Hourly Rate</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">$</span>
            <input
              id="profile-rate"
              type="number"
              min={0}
              step="0.01"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-32"
              placeholder="185.00"
            />
            <span className="text-sm text-muted">/ hour</span>
          </div>
        </div>
      </div>
      <SaveBar
        onSave={handleSave}
        saving={update.isPending}
        error={update.isError ? (update.error as Error).message : null}
        saved={saved}
      />
    </section>
  )
}

function PreferencesSection({ user }: { user: ProfileUser }) {
  const update = useUpdateMe()
  const [form, setForm] = useAsyncForm(user, {
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    weeklyStartDay: 'monday',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    update.mutate({
      timezone: form.timezone,
      dateFormat: form.dateFormat,
      weeklyStartDay: form.weeklyStartDay,
    }, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      },
    })
  }

  return (
    <section className="rounded-lg border border-border bg-white p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-dark-text">Preferences</h2>
        <p className="text-sm text-muted mt-1">Defaults used for reports and time entries.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="pref-timezone" className="text-sm font-medium text-dark-text">Timezone</label>
          <input
            id="pref-timezone"
            type="text"
            list="profile-timezone-options"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className={inputClass}
            placeholder="UTC"
          />
          <datalist id="profile-timezone-options">
            {commonTimezones.map((tz) => <option key={tz} value={tz} />)}
          </datalist>
        </div>
        <div className="space-y-2">
          <label htmlFor="pref-date-format" className="text-sm font-medium text-dark-text">Date Format</label>
          <select
            id="pref-date-format"
            value={form.dateFormat}
            onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
            className={inputClass}
          >
            {dateFormatOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="pref-week-start" className="text-sm font-medium text-dark-text">Weekly Start Day</label>
          <select
            id="pref-week-start"
            value={form.weeklyStartDay}
            onChange={(e) => setForm({ ...form, weeklyStartDay: e.target.value })}
            className={inputClass}
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
      </div>
      <SaveBar
        onSave={handleSave}
        saving={update.isPending}
        error={update.isError ? (update.error as Error).message : null}
        saved={saved}
        label="Save Preferences"
      />
    </section>
  )
}

function SecuritySection() {
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.')
      return
    }
    changePassword.mutate({ currentPassword, newPassword }, {
      onSuccess: () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      },
      onError: (err) => setFormError((err as Error).message),
    })
  }

  return (
    <section className="rounded-lg border border-border bg-white p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-dark-text">Security</h2>
        <p className="text-sm text-muted mt-1">Manage your password and account security.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="pwd-current" className="text-sm font-medium text-dark-text">Current Password</label>
          <input
            id="pwd-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full max-w-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="pwd-new" className="text-sm font-medium text-dark-text">New Password</label>
          <input
            id="pwd-new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full max-w-md"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="pwd-confirm" className="text-sm font-medium text-dark-text">Confirm New Password</label>
          <input
            id="pwd-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full max-w-md"
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-dark-text">Two-Factor Authentication</p>
            <p className="text-xs text-muted">Add an extra layer of security to your account.</p>
          </div>
          <button
            disabled
            className="border border-border bg-muted-bg text-muted px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
          >
            Enable
          </button>
        </div>
        <p className="text-xs text-muted">Two-factor authentication is not available yet.</p>
      </div>
      <SaveBar
        onSave={handleSave}
        saving={changePassword.isPending}
        error={formError}
        saved={saved}
        label="Update Password"
      />
    </section>
  )
}

function Profile() {
  const { data: user } = useMe()

  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">Profile</h1>
        <p className="text-sm text-muted mt-1">Manage your personal account settings.</p>
      </div>

      <section className="rounded-lg border border-border bg-white p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-dark-accent flex items-center justify-center text-white text-xl font-medium">
            {initials(user.name)}
          </div>
          <div>
            <p className="text-lg font-semibold text-dark-text">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <p className="text-xs text-muted mt-1">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} &middot; {formatMemberSince(user.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <PersonalInfoSection user={user} />
      <PreferencesSection user={user} />
      <SecuritySection />
    </div>
  )
}
