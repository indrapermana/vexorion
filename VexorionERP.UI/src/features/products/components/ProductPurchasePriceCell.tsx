import { useEffect, useRef, useState } from 'react'
import { Box, CircularProgress, Stack, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 0.5 }}>
        <CircularProgress size={12} sx={{ color: 'inherit' }} />
        <Typography variant="caption">{t('components.products.grid.purchasePriceTooltip.loading')}</Typography>
      </Stack>
    )
  }

  if (state.status === 'error' || !state.data.length) {
    return <Typography variant="caption">{t('components.products.grid.purchasePriceTooltip.noHistory')}</Typography>
  }

  return (
    <Stack spacing={0.5} sx={{ py: 0.25 }}>
      {state.data.map((entry) => (
        <Box key={entry.supplierId}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{entry.supplierName}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {entry.latestUnitCost.toFixed(2)} {entry.currencyCode}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
            {t('components.products.grid.purchasePriceTooltip.lastOn', {
              date: new Date(entry.invoiceDate).toLocaleDateString(),
            })}
            {' · '}{entry.invoiceNumber}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

type ProductPurchasePriceCellProps = {
  productId: string
  standardCost: number
}

export default function ProductPurchasePriceCell({ productId, standardCost }: ProductPurchasePriceCellProps) {
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
    <Tooltip
      open={open}
      onOpen={handleOpen}
      onClose={() => setOpen(false)}
      title={<PurchasePriceTooltipContent state={state} />}
      arrow
      placement="left"
    >
      <Typography
        component="span"
        sx={{ cursor: 'default', borderBottom: '1px dashed currentColor' }}
      >
        ${standardCost.toFixed(2)}
      </Typography>
    </Tooltip>
  )
}
