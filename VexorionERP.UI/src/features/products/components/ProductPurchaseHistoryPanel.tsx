import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxCircularProgress, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { ApiError, getProductPurchasePriceHistoryEntries } from '../../../lib/api'
import type { ProductPurchasePriceHistoryEntryResponse } from '../../../types/api'
import { getIntlLocale } from '../../../i18n/translationConstant'

type ProductPurchaseHistoryPanelProps = {
  productId: string
}

const recentEntryLimit = 10

function getRecentStartDate() {
  const start = new Date()
  start.setUTCFullYear(start.getUTCFullYear() - 1)
  return start.toISOString().slice(0, 10)
}

export default function ProductPurchaseHistoryPanel({ productId }: ProductPurchaseHistoryPanelProps) {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState<ProductPurchasePriceHistoryEntryResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setEntries(await getProductPurchasePriceHistoryEntries(productId, getRecentStartDate()))
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('components.products.purchaseHistory.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [productId, t])

  useEffect(() => {
    void load()
  }, [load])

  if (isLoading) {
    return <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}><VxCircularProgress size={20} /><VxTypography>{t('components.products.purchaseHistory.loading')}</VxTypography></div>
  }

  if (error) {
    return <VxAlert severity="error" action={<VxButton color="inherit" size="small" onClick={() => void load()}>{t('common.retry')}</VxButton>}>{error}</VxAlert>
  }

  if (!entries.length) {
    return <VxTypography color="text.secondary" sx={{ px: 2, py: 3 }}>{t('components.products.purchaseHistory.empty')}</VxTypography>
  }

  const dateFormatter = new Intl.DateTimeFormat(getIntlLocale(i18n.resolvedLanguage), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
  const visibleEntries = entries.slice(0, recentEntryLimit)

  return (
    <VxStack>
      <VxTypography variant="caption" color="text.secondary" sx={{ px: 2, pt: 2, display: 'block' }}>{t('components.products.purchaseHistory.scope')}</VxTypography>
      <VxTableContainer>
        <VxTable size="small" sx={{ minWidth: 680 }}>
          <VxTableHead><VxTableRow>
            {['date', 'supplier', 'invoice', 'quantity', 'unitCost'].map((column) => <VxTableCell key={column}>{t(`components.products.purchaseHistory.columns.${column}`)}</VxTableCell>)}
          </VxTableRow></VxTableHead>
          <VxTableBody>
            {visibleEntries.map((entry) => (
              <VxTableRow key={entry.purchaseInvoiceLineId}>
                <VxTableCell>{dateFormatter.format(new Date(`${entry.invoiceDate}T00:00:00Z`))}</VxTableCell>
                <VxTableCell>{entry.supplierName}</VxTableCell>
                <VxTableCell>{entry.invoiceNumber}</VxTableCell>
                <VxTableCell>{entry.quantity}</VxTableCell>
                <VxTableCell align="right">{entry.unitCost.toLocaleString(getIntlLocale(i18n.resolvedLanguage), { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {entry.currencyCode}</VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      </VxTableContainer>
      {entries.length > recentEntryLimit ? <VxTypography variant="caption" color="text.secondary" sx={{ px: 2, pb: 2 }}>{t('components.products.purchaseHistory.showingRecent', { count: recentEntryLimit })}</VxTypography> : null}
    </VxStack>
  )
}