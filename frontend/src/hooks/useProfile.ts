import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type ProfileUser } from '@/lib/api'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.users.me(),
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Pick<ProfileUser, 'name' | 'email' | 'hourlyRate' | 'timezone' | 'dateFormat' | 'weeklyStartDay'>>) =>
      api.users.updateMe(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.users.changePassword(data),
  })
}
