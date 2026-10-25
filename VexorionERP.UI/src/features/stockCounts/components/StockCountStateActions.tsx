import { AddRoundedIcon } from '@vexorion/ui'
import { VxButton, VxStack } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type Props = { canManage: boolean; canPost: boolean; canReverse: boolean; canAddLine: boolean; loading: boolean; onPost: () => void; onReverse: () => void; onAddLine: () => void }

export default function StockCountStateActions({ canManage, canPost, canReverse, canAddLine, loading, onPost, onReverse, onAddLine }: Props) {
  const { t } = useTranslation()
  if (!canManage) return null
  return <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={1}><VxButton variant="contained" color="success" onClick={onPost} disabled={!canPost || loading}>{t('pages.stockCounts.linePanel.post')}</VxButton><VxButton variant="outlined" color="warning" onClick={onReverse} disabled={!canReverse || loading}>{t('pages.stockCounts.linePanel.reverse')}</VxButton><VxButton variant="outlined" startIcon={<AddRoundedIcon />} onClick={onAddLine} disabled={!canAddLine}>{t('pages.stockCounts.linePanel.add')}</VxButton></VxStack>
}
