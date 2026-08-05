import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTimeEntries(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: () => api.timeEntries.list(params),
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      userId: string
      projectId: string
      description?: string
      startedAt?: string
      durationMinutes?: number
      entryMethod?: string
      tagIds?: string[]
    }) => api.timeEntries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      data: Partial<{
        projectId: string
        description?: string
        startedAt?: string
        endedAt?: string
        durationMinutes?: number
        tagIds?: string[]
      }>
    }) => api.timeEntries.update(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}
