import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type WorkspaceSettings, type ApprovalPolicy, type ErpConfig } from '@/lib/api'

export function useWorkspaceSettings() {
  return useQuery({
    queryKey: ['settings', 'workspace'],
    queryFn: () => api.settings.workspace(),
  })
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Pick<WorkspaceSettings, 'name' | 'slug' | 'currency' | 'timezone'>>) =>
      api.settings.updateWorkspace(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'workspace'] })
    },
  })
}

export function useApprovalPolicy() {
  return useQuery({
    queryKey: ['settings', 'approval-policy'],
    queryFn: () => api.settings.approvalPolicy(),
  })
}

export function useUpdateApprovalPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Pick<ApprovalPolicy, 'approvalLevel' | 'manualEntryWindowDays' | 'maxTimerHours'>>) =>
      api.settings.updateApprovalPolicy(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'approval-policy'] })
      queryClient.invalidateQueries({ queryKey: ['timer'] })
    },
  })
}

export function useErpConfig() {
  return useQuery({
    queryKey: ['settings', 'erp-config'],
    queryFn: () => api.settings.erpConfig(),
  })
}

export function useUpdateErpConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Pick<ErpConfig, 'exportFormat' | 'costCenterMappingEnabled'>>) =>
      api.settings.updateErpConfig(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'erp-config'] })
    },
  })
}

export function useWipeWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.settings.wipe(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
