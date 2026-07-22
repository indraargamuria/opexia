import { Link } from '@tanstack/react-router'
import { TimeTracker } from './TimeTracker'

export function TopHeader() {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-border flex items-center px-6">
      <div className="flex-1" />
      <TimeTracker />
      <div className="flex-1 flex justify-end">
        <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-75">
          <div className="text-right">
            <p className="text-sm font-medium text-dark-text">Jane Doe</p>
            <p className="text-xs text-muted">Manager</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-dark-accent flex items-center justify-center text-white text-xs font-medium">
            JD
          </div>
        </Link>
      </div>
    </header>
  )
}
