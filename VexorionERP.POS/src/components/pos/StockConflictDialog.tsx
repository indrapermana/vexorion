import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography } from '@vexorion/ui'
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
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>{t('stock.conflictTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t('stock.conflictMessage')}
        </Typography>
        <List dense>
          {insufficientItems.map((item) => {
            const productName = cart.find((line) => line.productId === item.productId)?.productName ?? item.productId
            const label = t('stock.conflictItem', {
              productName,
              requested: item.requested,
              available: item.available,
            })
            return (
              <ListItem key={item.productId} disablePadding>
                  <ListItemText
                    primary={label}
                    slotProps={{ primary: { color: 'error', variant: 'body2' } as React.ComponentProps<typeof Typography> }}
                  />
              </ListItem>
            )
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {t('stock.conflictCancel')}
        </Button>
        <Button onClick={onAdjust} variant="contained">
          {t('stock.conflictAdjust')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
