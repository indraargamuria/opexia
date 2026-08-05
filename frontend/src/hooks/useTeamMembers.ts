import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  })
}

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

export function useUpdateTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      data: Partial<{ role?: string; billableRate?: number; projectId?: string }>
    }) => api.teamMembers.update(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teamMembers.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}
