import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTimeEntries() {
  return useQuery({
    queryKey: ['time-entries'],
    queryFn: () => api.timeEntries.list(),
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
      entryMethod?: string
      tagIds?: string[]
    }) => api.timeEntries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}
