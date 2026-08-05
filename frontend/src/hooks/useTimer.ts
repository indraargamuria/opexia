import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useActiveTimer(userId: string | null) {
  return useQuery({
    queryKey: ['timer', 'current', userId],
    queryFn: () => api.timer.current(userId!),
    enabled: !!userId,
    refetchInterval: (query) => {
      const data = query.state.data as any
      return data?.status === 'running' ? 1000 : false
    },
  })
}

export function useStartTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { userId: string; projectId: string; description?: string }) =>
      api.timer.start(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timer', 'current', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}

export function useStopTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { userId: string }) => api.timer.stop(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timer', 'current', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}
