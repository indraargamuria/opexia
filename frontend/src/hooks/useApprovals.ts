import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useApproveTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; actorId: string }) => api.timeEntries.approve(args.id, args.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; actorId: string; rejectionReason: string }) =>
      api.timeEntries.reject(args.id, args.actorId, args.rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useApproveTimeEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { actorId: string; ids: string[] }) => api.timeEntries.approveBatch(args.actorId, args.ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
