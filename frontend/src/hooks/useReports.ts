import { useQuery } from '@tanstack/react-query'
import { api, type WeeklyReport, type PeriodParams, type ClientReport, type TeamReport } from '@/lib/api'

export function useReportsMe(userId: string) {
  return useQuery<WeeklyReport>({
    queryKey: ['reports', 'me', userId],
    queryFn: () => api.reports.me(userId),
  })
}

export function useClientReport(clientId: string | null, params: PeriodParams) {
  return useQuery<ClientReport>({
    queryKey: ['reports', 'client', clientId, params.dateFrom, params.dateTo],
    queryFn: () => api.reports.client(clientId!, params),
    enabled: !!clientId,
  })
}

export function useTeamReport(params: PeriodParams) {
  return useQuery<TeamReport>({
    queryKey: ['reports', 'team', params.dateFrom, params.dateTo],
    queryFn: () => api.reports.team(params),
  })
}

export interface ReportsOverview {
  clients: { id: string; name: string }[]
  byProject: (ClientReport['byProject'][number] & { clientId: string; clientName: string })[]
  totals: { minutes: number; cost: number; count: number }
  team: TeamReport
}

export function useReportsOverview(params: PeriodParams) {
  return useQuery<ReportsOverview>({
    queryKey: ['reports', 'overview', params.dateFrom, params.dateTo],
    queryFn: async () => {
      const clients = (await api.clients.list()) as { id: string; name: string }[]
      const clientReports = await Promise.all(clients.map((c) => api.reports.client(c.id, params)))
      const team = await api.reports.team(params)
      const byProject = clientReports.flatMap((r) =>
        r.byProject.map((p) => ({ ...p, clientId: r.clientId, clientName: r.client.name })),
      )
      const totals = clientReports.reduce(
        (acc, r) => ({
          minutes: acc.minutes + r.totals.minutes,
          cost: acc.cost + r.totals.cost,
          count: acc.count + r.totals.count,
        }),
        { minutes: 0, cost: 0, count: 0 },
      )
      return { clients, byProject, totals, team }
    },
  })
}
