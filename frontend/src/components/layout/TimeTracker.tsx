import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Square } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface TimeTrackerState {
  isRunning: boolean
  elapsed: number
  project: string
  task: string
}

const mockProjects = [
  'Q4 Financial Audit',
  'Cloud Migration',
  'Security Compliance',
  'ERP Integration',
]

const mockTasks = [
  'Review & Analysis',
  'Development',
  'Documentation',
  'Meetings',
]

export function TimeTracker() {
  const [state, setState] = useState<TimeTrackerState>({
    isRunning: false,
    elapsed: 0,
    project: '',
    task: '',
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    if (!state.project) return
    setState((prev) => ({ ...prev, isRunning: true }))
    intervalRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: prev.elapsed + 1 }))
    }, 1000)
  }, [state.project])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setState((prev) => ({ ...prev, isRunning: false, elapsed: 0, project: '', task: '' }))
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="h-12 flex items-center gap-3 px-4 bg-white border border-border rounded-lg">
      {state.isRunning && (
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse-dot shrink-0" />
      )}

      {state.isRunning ? (
        <button
          onClick={stopTimer}
          className="bg-error text-white hover:bg-red-700 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-75 inline-flex items-center gap-2"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      ) : (
        <button
          onClick={startTimer}
          disabled={!state.project}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-75 inline-flex items-center gap-2"
        >
          <Play className="h-3.5 w-3.5" />
          Start
        </button>
      )}

      <span className="font-mono text-lg font-semibold text-dark-text tabular-nums">
        {formatDuration(state.elapsed)}
      </span>

      <select
        value={state.project}
        onChange={(e) => setState((prev) => ({ ...prev, project: e.target.value }))}
        disabled={state.isRunning}
        className="h-8 px-2 border border-border rounded-md text-sm bg-white min-w-[160px] text-dark-text disabled:opacity-60"
      >
        <option value="">Project</option>
        {mockProjects.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <select
        value={state.task}
        onChange={(e) => setState((prev) => ({ ...prev, task: e.target.value }))}
        disabled={state.isRunning}
        className="h-8 px-2 border border-border rounded-md text-sm bg-white min-w-[140px] text-dark-text disabled:opacity-60"
      >
        <option value="">Task</option>
        {mockTasks.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  )
}
