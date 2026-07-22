import { createRootRoute, Outlet, useMatches } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const matches = useMatches()
  const isLoginRoute = matches.some((m) => m.pathname === '/login')

  if (isLoginRoute) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-light-bg">
      <Sidebar />
      <div className="ml-64">
        <TopHeader />
        <main id="main" className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
