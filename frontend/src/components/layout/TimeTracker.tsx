import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Square } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { useProjects, useActiveTimer, useStartTimer, useStopTimer } from '@/hooks'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export function TimeTracker() {
  const { data: projects = [] } = useProjects()
  const { data: activeTimer } = useActiveTimer(DEMO_USER_ID)
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()

  const [selectedProject, setSelectedProject] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [autoStopped, setAutoStopped] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasRunningRef = useRef(false)
  const stoppedManuallyRef = useRef(false)

  const isRunning = (activeTimer as any)?.status === 'running'
  const runningProjectId = (activeTimer as any)?.projectId

  useEffect(() => {
    if (wasRunningRef.current && !isRunning && !stoppedManuallyRef.current) {
      setAutoStopped(true)
    }
    if (isRunning) {
      setAutoStopped(false)
      setActionError(null)
    }
    wasRunningRef.current = isRunning
  }, [isRunning])

  useEffect(() => {
    if (isRunning && (activeTimer as any)?.startedAt) {
      const start = new Date((activeTimer as any).startedAt).getTime()
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setElapsed(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, activeTimer])

  const handleStart = useCallback(() => {
    if (!selectedProject) return
    stoppedManuallyRef.current = false
    setAutoStopped(false)
    setActionError(null)
    startTimer.mutate(
      { userId: DEMO_USER_ID, projectId: selectedProject },
      { onError: () => setActionError('Failed to start timer') },
    )
  }, [selectedProject, startTimer])

  const handleStop = useCallback(() => {
    stoppedManuallyRef.current = true
    setActionError(null)
    stopTimer.mutate(
      { userId: DEMO_USER_ID },
      { onError: () => setActionError('Failed to stop timer') },
    )
  }, [stopTimer])

  return (
    <div className="h-12 flex items-center gap-3 px-4 bg-white border border-border rounded-lg">
      {isRunning && (
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse-dot shrink-0" />
      )}

      {autoStopped && !isRunning && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
          Timer auto-stopped after the 12h limit
        </span>
      )}

      {isRunning ? (
        <button
          onClick={handleStop}
          disabled={stopTimer.isPending}
          className="bg-error text-white hover:bg-red-700 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-75 inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Square className="h-3.5 w-3.5" />
          {stopTimer.isPending ? 'Stopping...' : 'Stop'}
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={!selectedProject || startTimer.isPending}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-75 inline-flex items-center gap-2"
        >
          <Play className="h-3.5 w-3.5" />
          {startTimer.isPending ? 'Starting...' : 'Start'}
        </button>
      )}

      <span className="font-mono text-lg font-semibold text-dark-text tabular-nums">
        {formatDuration(elapsed)}
      </span>

      <select
        value={isRunning ? runningProjectId ?? '' : selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
        disabled={isRunning}
        className="h-8 px-2 border border-border rounded-md text-sm bg-white min-w-[160px] text-dark-text disabled:opacity-60"
      >
        <option value="">Project</option>
        {(projects as any[]).map((p: any) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {actionError && (
        <span className="text-xs text-error whitespace-nowrap">{actionError}</span>
      )}
    </div>
  )
}
