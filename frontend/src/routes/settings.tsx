import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">Settings</h1>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <nav className="space-y-1">
            <a href="#workspace" className="block px-3 py-2 rounded-md text-sm font-medium bg-brand text-white">Workspace</a>
            <a href="#notifications" className="block px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-75">Notifications</a>
            <a href="#billing" className="block px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-75">Billing</a>
            <a href="#security" className="block px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-75">Security</a>
          </nav>
        </div>

        <div className="col-span-9 space-y-6">
          <section id="workspace" className="rounded-lg border border-border bg-white p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-text">Workspace</h2>
              <p className="text-sm text-muted mt-1">Manage your organization workspace settings.</p>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Organization Name</label>
                <input type="text" defaultValue="Opexia Consulting" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Workspace Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">app.opexia.com/</span>
                  <input type="text" defaultValue="opexia-consulting" className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Default Currency</label>
                <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
                  <option>USD - US Dollar</option>
                  <option>EUR - Euro</option>
                  <option>GBP - British Pound</option>
                  <option>CAD - Canadian Dollar</option>
                </select>
              </div>
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
            </div>
            <div className="flex justify-end">
              <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Save Changes</button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-text">Approval Policy</h2>
              <p className="text-sm text-muted mt-1">Configure how time entries are reviewed and approved.</p>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Approval Required</label>
                <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
                  <option>All entries before invoicing</option>
                  <option>Only billable entries</option>
                  <option>Manual entries only</option>
                  <option>Disabled (auto-approve)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Manual Entry Window</label>
                <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
                  <option>Current business day only</option>
                  <option>Up to 1 business day ago</option>
                  <option>Up to 3 business days ago</option>
                  <option>Up to 7 business days ago</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Max Timer Duration</label>
                <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
                  <option>8 hours</option>
                  <option>12 hours (default)</option>
                  <option>24 hours (admin override)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Save Changes</button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-text">ERP Integration</h2>
              <p className="text-sm text-muted mt-1">Configure export mappings for your ERP system.</p>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Export Format</label>
                <select className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full">
                  <option>SAP Standard Format</option>
                  <option>Oracle Financials</option>
                  <option>Workday CSV</option>
                  <option>Custom CSV</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-dark-text">Cost Center Mapping</label>
                <p className="text-xs text-muted">Tag ERP codes are automatically mapped during export. Configure tag-level ERP codes in the Tags page.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Save Changes</button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-text">Danger Zone</h2>
              <p className="text-sm text-muted mt-1">Irreversible actions for this workspace.</p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-error/30 bg-red-50 p-4">
              <div>
                <p className="text-sm font-medium text-dark-text">Delete Workspace</p>
                <p className="text-xs text-muted mt-0.5">Permanently delete this workspace and all associated data.</p>
              </div>
              <button className="bg-error text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">Delete</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
