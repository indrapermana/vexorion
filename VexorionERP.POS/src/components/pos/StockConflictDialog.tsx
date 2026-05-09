import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxList, VxListItem, VxListItemText, VxTypography } from '@vexorion/ui'
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
    <VxDialog open={open} maxWidth="sm" fullWidth>
      <VxDialogTitle>{t('stock.conflictTitle')}</VxDialogTitle>
      <VxDialogContent>
        <VxTypography variant="body2" sx={{ mb: 1 }}>
          {t('stock.conflictMessage')}
        </VxTypography>
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
      <VxDialogActions>
        <VxButton onClick={onCancel} color="inherit">
          {t('stock.conflictCancel')}
        </VxButton>
        <VxButton onClick={onAdjust} variant="contained">
          {t('stock.conflictAdjust')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
