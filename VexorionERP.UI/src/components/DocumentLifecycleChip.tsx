import { VxChip, VxTooltip } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type DocumentLifecycleChipProps = {
  kind: 'order' | 'invoice' | 'shipment' | 'receipt'
  status: number
  label: string
  color: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

export default function DocumentLifecycleChip({ kind, status, label, color }: DocumentLifecycleChipProps) {
  const { t } = useTranslation()
  const explanation = t(`orderWorkflow.lifecycle.${kind}.${status}`, { defaultValue: t('orderWorkflow.lifecycle.unknown') })
  const statusLabel = t(`orderWorkflow.lifecycle.${kind}StatusLabels.${status}`, { defaultValue: label })
  return (
    <VxTooltip title={explanation} enterDelay={300}>
      <span>
        <VxChip size="small" color={color} label={statusLabel} variant="outlined" aria-label={`${statusLabel}. ${explanation}`} />
      </span>
    </VxTooltip>
  )
}