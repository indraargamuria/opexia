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
    onMutate: async ({ userId, projectId }) => {
      await queryClient.cancelQueries({ queryKey: ['timer', 'current', userId] })
      const previous = queryClient.getQueryData(['timer', 'current', userId])
      queryClient.setQueryData(['timer', 'current', userId], {
        id: `optimistic-${Date.now()}`,
        userId,
        projectId,
        startedAt: new Date().toISOString(),
        status: 'running',
        entryMethod: 'timer',
      })
      return { previous }
    },
    onError: (_err, variables, context: any) => {
      queryClient.setQueryData(['timer', 'current', variables.userId], context?.previous)
      queryClient.invalidateQueries({ queryKey: ['timer', 'current', variables.userId] })
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timer', 'current', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}

export function useStopTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { userId: string }) => api.timer.stop(data),
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: ['timer', 'current', userId] })
      const previous = queryClient.getQueryData(['timer', 'current', userId])
      queryClient.setQueryData(['timer', 'current', userId], null)
      return { previous }
    },
    onError: (_err, variables, context: any) => {
      queryClient.setQueryData(['timer', 'current', variables.userId], context?.previous)
      queryClient.invalidateQueries({ queryKey: ['timer', 'current', variables.userId] })
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timer', 'current', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}
