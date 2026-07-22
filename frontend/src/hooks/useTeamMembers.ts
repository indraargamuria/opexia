import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.teamMembers.list(),
  })
}

export function useAssignTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      userId: string
      projectId: string
      role?: string
      billableRate?: number
    }) => api.teamMembers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}
