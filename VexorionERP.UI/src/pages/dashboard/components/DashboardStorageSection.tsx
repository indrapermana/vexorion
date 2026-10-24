import { VxChip, VxGrid, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import type { TFunction } from 'i18next'
import type { StorageTopConsumersResponse, StorageUsageSummaryResponse } from '../../../types/api'
import DashboardQuerySection, { type DashboardQueryState } from './DashboardQuerySection'

type DashboardStorageSectionProps = {
  t: TFunction
  summary: StorageUsageSummaryResponse | null
  topConsumers: StorageTopConsumersResponse | null
  summaryQuery?: DashboardQueryState
  topConsumersQuery?: DashboardQueryState
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function getThresholdLabel(t: TFunction, thresholdStatus: StorageUsageSummaryResponse['thresholdStatus']) {
  if (thresholdStatus === 'hardBlock' || thresholdStatus === 3) return t('dashboard.storage.status.hardBlock', { defaultValue: 'Hard block' })
  if (thresholdStatus === 'softBlock' || thresholdStatus === 2) return t('dashboard.storage.status.softBlock', { defaultValue: 'Soft block' })
  if (thresholdStatus === 'warning' || thresholdStatus === 1) return t('dashboard.storage.status.warning', { defaultValue: 'Warning' })
  return t('dashboard.storage.status.normal', { defaultValue: 'Normal' })
}

function getThresholdColor(thresholdStatus: StorageUsageSummaryResponse['thresholdStatus']) {
  if (thresholdStatus === 'hardBlock' || thresholdStatus === 3) return 'error' as const
  if (thresholdStatus === 'softBlock' || thresholdStatus === 2) return 'warning' as const
  if (thresholdStatus === 'warning' || thresholdStatus === 1) return 'warning' as const
  return 'success' as const
}

export default function DashboardStorageSection({ t, summary, topConsumers, summaryQuery, topConsumersQuery }: DashboardStorageSectionProps) {
  const usedBytes = summary?.usedBytes ?? 0
  const maxBytes = summary?.maxStorageBytes ?? 0
  const usedPercent = summary?.usedPercent ?? 0

  const summaryCard = (
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxStack spacing={1.5}>
            <VxTypography component="h2" variant="h6">{t('dashboard.storage.title', { defaultValue: 'Storage & quota' })}</VxTypography>
            <VxTypography variant="body2" color="text.secondary">
              {t('dashboard.storage.subtitle', { defaultValue: 'Tenant-level storage usage and plan limits.' })}
            </VxTypography>

            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <VxChip
                label={`${usedPercent}% ${t('dashboard.storage.used', { defaultValue: 'used' })}`}
                color={usedPercent >= 100 ? 'error' : usedPercent >= 80 ? 'warning' : 'success'}
                size="small"
              />
              <VxChip
                label={getThresholdLabel(t, summary?.thresholdStatus ?? 'normal')}
                color={getThresholdColor(summary?.thresholdStatus ?? 'normal')}
                size="small"
                variant="outlined"
              />
            </VxStack>

            <VxTypography variant="body2">
              {t('dashboard.storage.usageLine', {
                defaultValue: '{{used}} of {{max}}',
                used: formatBytes(usedBytes),
                max: maxBytes > 0 ? formatBytes(maxBytes) : t('dashboard.storage.unlimited', { defaultValue: 'Unlimited' }),
              })}
            </VxTypography>

            <VxTypography variant="caption" color="text.secondary">
              {t('dashboard.storage.planLine', {
                defaultValue: 'Plan: {{plan}}',
                plan: summary?.planName ?? summary?.planCode ?? t('dashboard.storage.noPlan', { defaultValue: 'No active plan' }),
              })}
            </VxTypography>

            <VxTypography variant="caption" color="text.secondary">
              {t('dashboard.storage.lastCalculated', {
                defaultValue: 'Last calculated: {{value}}',
                value: summary?.lastCalculatedAtUtc ? new Date(summary.lastCalculatedAtUtc).toLocaleString() : '-',
              })}
            </VxTypography>

          </VxStack>
        </VxPaper>
  )
  const consumersCard = (
        <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2 }}>
          <VxStack spacing={2}>
            <VxTypography component="h3" variant="h6">{t('dashboard.storage.topConsumers', { defaultValue: 'Top consumers' })}</VxTypography>

            <VxStack spacing={1}>
              <VxTypography component="h4" variant="subtitle2">{t('dashboard.storage.topProjects', { defaultValue: 'Top projects' })}</VxTypography>
              {(topConsumers?.topProjects ?? []).slice(0, 3).map((item) => (
                <VxStack key={item.projectId} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <VxTypography variant="body2">{item.projectName}</VxTypography>
                  <VxTypography variant="body2" color="text.secondary">{formatBytes(item.totalBytes)}</VxTypography>
                </VxStack>
              ))}
              {!topConsumers?.topProjects?.length ? (
                <VxTypography variant="caption" color="text.secondary">
                  {t('dashboard.storage.noProjectData', { defaultValue: 'No project document usage yet.' })}
                </VxTypography>
              ) : null}
            </VxStack>

            <VxStack spacing={1}>
              <VxTypography component="h4" variant="subtitle2">{t('dashboard.storage.topDocuments', { defaultValue: 'Top documents' })}</VxTypography>
              {(topConsumers?.topDocuments ?? []).slice(0, 3).map((item) => (
                <VxStack key={item.projectDocumentId} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <VxTypography variant="body2">{item.title || item.fileName}</VxTypography>
                  <VxTypography variant="body2" color="text.secondary">{formatBytes(item.fileSizeBytes)}</VxTypography>
                </VxStack>
              ))}
              {!topConsumers?.topDocuments?.length ? (
                <VxTypography variant="caption" color="text.secondary">
                  {t('dashboard.storage.noDocumentData', { defaultValue: 'No documents uploaded yet.' })}
                </VxTypography>
              ) : null}
            </VxStack>
          </VxStack>
        </VxPaper>
  )
  return (
    <VxGrid container spacing={2}>
      <VxGrid size={{ xs: 12, lg: 5 }}>
        {summaryQuery ? <DashboardQuerySection label={t('dashboard.query.storageSummary')} query={summaryQuery} minHeight={240}>{summaryCard}</DashboardQuerySection> : summaryCard}
      </VxGrid>
      <VxGrid size={{ xs: 12, lg: 7 }}>
        {topConsumersQuery ? <DashboardQuerySection label={t('dashboard.storage.topConsumers')} query={topConsumersQuery} minHeight={240}>{consumersCard}</DashboardQuerySection> : consumersCard}
      </VxGrid>
    </VxGrid>
  )
}
