import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { TimeTracker } from './TimeTracker'

export function TopHeader() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    localStorage.removeItem('opexia_token')
    localStorage.removeItem('opexia_user')
    navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-border flex items-center px-6">
      <div className="flex-1" />
      <TimeTracker />
      <div className="flex-1 flex justify-end">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 hover:bg-highlight rounded-md px-2 py-1.5 transition-colors duration-75"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-dark-text">Jane Doe</p>
              <p className="text-xs text-muted">Manager</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-dark-accent flex items-center justify-center text-white text-xs font-medium">
              JD
            </div>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-white shadow-sm py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-dark-text">Jane Doe</p>
                <p className="text-xs text-muted">jane.doe@opexia.com</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-highlight transition-colors duration-75"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-red-50 transition-colors duration-75 w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
