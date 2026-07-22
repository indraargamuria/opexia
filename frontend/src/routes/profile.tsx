import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profile')({
  component: Profile,
})

function Profile() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">Profile</h1>
        <p className="text-sm text-muted mt-1">Manage your personal account settings.</p>
      </div>

      <section className="rounded-lg border border-border bg-white p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-dark-accent flex items-center justify-center text-white text-xl font-medium">
            JD
          </div>
          <div>
            <p className="text-lg font-semibold text-dark-text">Jane Doe</p>
            <p className="text-sm text-muted">jane.doe@opexia.com</p>
            <p className="text-xs text-muted mt-1">Admin &middot; Member since Oct 2024</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-dark-text">Personal Information</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-text">First Name</label>
              <input type="text" defaultValue="Jane" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-text">Last Name</label>
              <input type="text" defaultValue="Doe" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Email</label>
            <input type="email" defaultValue="jane.doe@opexia.com" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Role</label>
            <input type="text" defaultValue="Admin" disabled className="h-9 px-3 rounded-md border border-border bg-muted-bg text-sm text-muted w-full cursor-not-allowed" />
            <p className="text-xs text-muted">Role changes require an administrator.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Default Hourly Rate</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">$</span>
              <input type="text" defaultValue="185.00" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-32" />
              <span className="text-sm text-muted">/ hour</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Save Changes</button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-dark-text">Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Timezone</label>
            <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
              <option>America/New_York (EST)</option>
              <option>America/Chicago (CST)</option>
              <option>America/Denver (MST)</option>
              <option>America/Los_Angeles (PST)</option>
              <option>UTC</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Date Format</label>
            <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Weekly Start Day</label>
            <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
              <option>Monday</option>
              <option>Sunday</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Save Preferences</button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-dark-text">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-dark-text">Change Password</label>
            <input type="password" placeholder="Current password" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full max-w-md" />
            <input type="password" placeholder="New password" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full max-w-md" />
            <input type="password" placeholder="Confirm new password" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full max-w-md" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-text">Two-Factor Authentication</p>
                <p className="text-xs text-muted">Add an extra layer of security to your account.</p>
              </div>
              <button className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Enable</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Update Password</button>
        </div>
      </section>
    </div>
  )
}
