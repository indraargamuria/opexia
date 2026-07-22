import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Clock, Shield, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)

    setTimeout(() => {
      localStorage.setItem('opexia_token', 'mock_jwt_token_' + Date.now())
      localStorage.setItem('opexia_user', JSON.stringify({
        id: '1',
        name: 'Jane Doe',
        email: email,
        role: 'admin',
        initials: 'JD',
      }))
      setLoading(false)
      navigate({ to: '/' })
    }, 800)
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-dark-accent flex-col justify-between p-12">
        <div>
          <span className="text-2xl font-bold text-white tracking-tight">OPX</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-semibold text-white leading-tight">
            Intelligent Time
            <br />
            Orchestration
          </h1>
          <p className="text-white/60 text-base max-w-md leading-relaxed">
            Enterprise-grade project and time management. Every billed hour traceable, defensible, and ERP-exportable.
          </p>

          <div className="flex items-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-white/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-brand" />
              </div>
              <span className="text-sm text-white/70">Real-time capture</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-white/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-brand" />
              </div>
              <span className="text-sm text-white/70">Audit-ready</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-1 w-8 bg-brand rounded-full" />
          <div className="h-1 w-4 bg-white/20 rounded-full" />
          <div className="h-1 w-4 bg-white/20 rounded-full" />
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-light-bg flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <span className="text-xl font-bold text-dark-accent tracking-tight">OPX</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-dark-text">Sign in to Opexia</h2>
            <p className="text-sm text-muted">Enter your credentials to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-dark-text">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-dark-text">
                  Password
                </label>
                <a href="#" className="text-xs text-brand hover:text-brand-hover transition-colors duration-75">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75 w-full flex items-center justify-center gap-2 h-9"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-light-bg px-3 text-muted">or</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75 w-full h-9"
            >
              Continue with SSO
            </button>
          </div>

          <p className="text-xs text-muted text-center">
            Accounts are provisioned by your organization administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
