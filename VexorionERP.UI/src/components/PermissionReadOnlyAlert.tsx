import { VxAlert } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type PermissionReadOnlyAlertProps = {
  requiredPermission: string
}

export default function PermissionReadOnlyAlert({ requiredPermission }: PermissionReadOnlyAlertProps) {
  const { t } = useTranslation()

  return (
    <VxAlert severity="info">
      {t('authorization.readOnly', { requiredPermission })}
    </VxAlert>
  )
}
