import { VxAlert, VxStack, VxTypography } from '@vexorion/ui'
import { useI18n } from '../app/I18nContext'

type PosConnectivityStatusProps = {
  isOnline: boolean
}

export function PosConnectivityStatus({ isOnline }: PosConnectivityStatusProps) {
  const { t } = useI18n()

  if (isOnline) {
    return null
  }

  return (
    <VxAlert severity="warning" role="status" aria-live="polite">
      <VxStack spacing={0.25}>
        <VxTypography component="p" variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('connectivity.offlineTitle')}
        </VxTypography>
        <VxTypography component="p" variant="body2">
          {t('connectivity.offlineMessage')}
        </VxTypography>
      </VxStack>
    </VxAlert>
  )
}
