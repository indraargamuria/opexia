import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      clientId: string
      name: string
      code: string
      description?: string
      status?: string
      budgetHours?: number
      budgetCost?: number
      startDate?: string
      endDate?: string
    }) => api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
