import { VxMenuItem, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type LookupOption = {
  value: string
  label: string
}

type LookupSelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: LookupOption[]
  error?: boolean
  helperText?: string
  disabled?: boolean
  emptyText?: string
  requiredText?: string
}

export default function LookupSelectField({
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  disabled,
  emptyText,
  requiredText,
}: LookupSelectFieldProps) {
  const { t } = useTranslation()
  return (
    <VxTextField
      fullWidth
      select
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      helperText={helperText ?? (options.length ? requiredText ?? t('common.required') : emptyText ?? t('common.noOptionsAvailable'))}
      disabled={disabled}
    >
      {options.map((option) => (
        <VxMenuItem key={option.value} value={option.value}>
          {option.label}
        </VxMenuItem>
      ))}
    </VxTextField>
  )
}