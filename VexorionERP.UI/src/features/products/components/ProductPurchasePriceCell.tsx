import { useEffect, useRef, useState } from 'react'
import { VxBox, VxCircularProgress, VxStack, VxTooltip, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import type { ProductSupplierLatestPurchasePriceResponse } from '../../../types/api'
import { getProductPurchasePriceHistory } from '../../../lib/api'

type PurchasePriceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: ProductSupplierLatestPurchasePriceResponse[] }
  | { status: 'error' }

type PurchasePriceTooltipContentProps = {
  state: PurchasePriceState
}

function PurchasePriceTooltipContent({ state }: PurchasePriceTooltipContentProps) {
  const { t } = useTranslation()

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', py: 0.5 }}>
        <VxCircularProgress size={12} sx={{ color: 'inherit' }} />
        <VxTypography variant="caption">{t('components.products.grid.purchasePriceTooltip.loading')}</VxTypography>
      </VxStack>
    )
  }

  if (state.status === 'error' || !state.data.length) {
    return <VxTypography variant="caption">{t('components.products.grid.purchasePriceTooltip.noHistory')}</VxTypography>
  }

  return (
    <VxStack spacing={0.5} sx={{ py: 0.25 }}>
      {state.data.map((entry) => (
        <VxBox key={entry.supplierId}>
          <VxStack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <VxTypography variant="caption" sx={{ fontWeight: 600 }}>{entry.supplierName}</VxTypography>
            <VxTypography variant="caption" sx={{ fontWeight: 700 }}>
              {entry.latestUnitCost.toFixed(2)} {entry.currencyCode}
            </VxTypography>
          </VxStack>
          <VxTypography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
            {t('components.products.grid.purchasePriceTooltip.lastOn', {
              date: new Date(entry.invoiceDate).toLocaleDateString(),
            })}
            {' · '}{entry.invoiceNumber}
          </VxTypography>
        </VxBox>
      ))}
    </VxStack>
  )
}

type ProductPurchasePriceCellProps = {
  productId: string
  standardCost: number
}

export default function ProductPurchasePriceCell({ productId, standardCost }: ProductPurchasePriceCellProps) {
  const { formatMoney } = useCurrency()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<PurchasePriceState>({ status: 'idle' })
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true
    getProductPurchasePriceHistory(productId)
      .then((data) => setState({ status: 'loaded', data }))
      .catch(() => setState({ status: 'error' }))
  }, [open, productId])

  const handleOpen = () => {
    setOpen(true)
    if (!fetchedRef.current) {
      setState({ status: 'loading' })
    }
  }

  return (
    <VxTooltip
      open={open}
      onOpen={handleOpen}
      onClose={() => setOpen(false)}
      title={<PurchasePriceTooltipContent state={state} />}
      arrow
      placement="left"
    >
      <VxTypography
        component="span"
        sx={{ cursor: 'default', borderBottom: '1px dashed currentColor' }}
      >
        ${formatMoney(standardCost)}
      </VxTypography>
    </VxTooltip>
  )
}
