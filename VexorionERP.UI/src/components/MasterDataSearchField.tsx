import { VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type MasterDataSearchFieldProps = {
  value: string
  onChange: (value: string) => void
}

export default function MasterDataSearchField({ value, onChange }: MasterDataSearchFieldProps) {
  const { t } = useTranslation()
  return (
    <VxTextField
      size="small"
      label={t('common.labels.searchOrFilter')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ width: { xs: '100%', sm: 280 } }}
    />
  )
}