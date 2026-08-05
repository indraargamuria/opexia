import { useQuery } from '@tanstack/react-query'
import { api, type WeeklyReport } from '@/lib/api'

export function useReportsMe(userId: string) {
  return useQuery<WeeklyReport>({
    queryKey: ['reports', 'me', userId],
    queryFn: () => api.reports.me(userId),
  })
}
