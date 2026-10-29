import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxList, VxListItem, VxListItemText, VxTypography } from '@vexorion/ui'
import React from 'react'
import { useI18n } from '../../app/I18nContext'
import type { PosStockInsufficientItem } from '../../types/api'
import type { CartLine } from './types'

type StockConflictDialogProps = {
  open: boolean
  insufficientItems: PosStockInsufficientItem[]
  cart: CartLine[]
  onAdjust: () => void
  onCancel: () => void
}

export function StockConflictDialog({ open, insufficientItems, cart, onAdjust, onCancel }: StockConflictDialogProps) {
  const { t } = useI18n()

  return (
    <VxDialog open={open} maxWidth="sm" fullWidth scroll="paper" aria-describedby="stock-conflict-consequence">
      <VxDialogTitle>{t('stock.conflictTitle')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxTypography variant="body2" sx={{ mb: 1 }}>
          {t('stock.conflictMessage')}
        </VxTypography>
        <VxAlert id="stock-conflict-consequence" severity="warning" sx={{ mb: 1.5 }}>
          {t('stock.conflictConsequence')}
        </VxAlert>
        <VxList dense>
          {insufficientItems.map((item) => {
            const productName = cart.find((line) => line.productId === item.productId)?.productName ?? item.productId
            const label = t('stock.conflictItem', {
              productName,
              requested: item.requested,
              available: item.available,
            })
            return (
              <VxListItem key={item.productId} disablePadding>
                  <VxListItemText
                    primary={label}
                    slotProps={{ primary: { color: 'error', variant: 'body2' } as React.ComponentProps<typeof VxTypography> }}
                  />
              </VxListItem>
            )
          })}
        </VxList>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <VxButton onClick={onCancel} color="inherit" sx={{ minHeight: 44 }}>
          {t('stock.conflictCancel')}
        </VxButton>
        <VxButton onClick={onAdjust} variant="contained" sx={{ minHeight: 44 }}>
          {t('stock.conflictAdjust')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
