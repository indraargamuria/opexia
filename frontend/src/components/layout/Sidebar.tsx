import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Tags,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/tags', label: 'Tags', icon: Tags },
]

const bottomItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-64 bg-dark-accent px-3 py-4 flex flex-col">
      <div className="mb-8 px-3">
        <span className="text-xl font-bold text-white tracking-tight">OPEXIA</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-75 ${
                isActive
                  ? 'bg-brand text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-white/50'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1">
        {bottomItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-75 ${
                isActive
                  ? 'bg-brand text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-white/50'}`} />
              {item.label}
            </Link>
          )
        })}

        <div className="border-t border-white/10 mt-2 pt-3 px-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-medium">
            JD
          </div>
          <div className="text-sm">
            <p className="text-white font-medium">Jane Doe</p>
            <p className="text-white/50 text-xs">Manager</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
