import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      color?: string
      erpCode?: string
    }) => api.tags.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}
