import { DeliveryDiningRoundedIcon, WarningAmberRoundedIcon } from '@vexorion/ui'
import {
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@vexorion/ui'
import { useState } from 'react'
import { useI18n } from '../../app/I18nContext'
import type { CartLine } from './types'

function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currencyCode} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

function parseMoneyInput(input: string) {
  const parsed = Number(input.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

type CartSummaryPanelProps = {
  cart: CartLine[]
  subtotal: number
  discountTotal: number
  grandTotal: number
  changeAmount: number
  currencyCode: string
  paymentAmount: number
  paymentMethod: string
  isDelivery: boolean
  isProcessing: boolean
  canCheckout: boolean
  stockByProduct: Record<string, number>
  onRemoveCartLine: (productId: string) => void
  onLineDiscountChange: (productId: string, discountAmount: number) => void
  onLineQtyChange: (productId: string, quantity: number) => void
  onPaymentAmountChange: (value: number) => void
  onPaymentMethodChange: (value: string) => void
  onDeliveryChange: (value: boolean) => void
  onCheckout: () => void
}

export function CartSummaryPanel({
  cart,
  subtotal,
  discountTotal,
  grandTotal,
  changeAmount,
  currencyCode,
  paymentAmount,
  paymentMethod,
  isDelivery,
  isProcessing,
  canCheckout,
  stockByProduct,
  onRemoveCartLine,
  onLineDiscountChange,
  onLineQtyChange,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onDeliveryChange,
  onCheckout,
}: CartSummaryPanelProps) {
  const { t } = useI18n()
  const [editingQty, setEditingQty] = useState<{ productId: string; value: string } | null>(null)

  const commitQtyEdit = (productId: string, rawValue: string) => {
    const qty = Math.max(1, Number(rawValue) || 1)
    onLineQtyChange(productId, qty)
    setEditingQty(null)
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('cart.title')}</Typography>
          <Chip label={t('cart.items', { count: cart.length })} />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('cart.product')}</TableCell>
              <TableCell align="right">{t('cart.qty')}</TableCell>
              <TableCell align="right">{t('cart.price')}</TableCell>
              <TableCell align="right">{t('cart.discount')}</TableCell>
              <TableCell align="right">{t('cart.total')}</TableCell>
              <TableCell align="right">{t('cart.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.map((line) => {
              const isLowStock = line.quantity > (stockByProduct[line.productId] ?? 0)
              return (
                <TableRow key={line.productId}>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      {isLowStock ? (
                        <Tooltip title={t('cart.lowStock')}>
                          <WarningAmberRoundedIcon fontSize="small" color="warning" />
                        </Tooltip>
                      ) : null}
                      {line.productName}
                    </Stack>
                  </TableCell>
                <TableCell align="right">
                  {editingQty?.productId === line.productId ? (
                    <TextField
                      type="number"
                      size="small"
                      value={editingQty.value}
                      autoFocus
                      onChange={(e) => setEditingQty({ productId: line.productId, value: e.target.value })}
                      onBlur={() => commitQtyEdit(line.productId, editingQty.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitQtyEdit(line.productId, editingQty.value)
                        if (e.key === 'Escape') setEditingQty(null)
                      }}
                      slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center', padding: '2px 4px' } } }}
                      sx={{ width: 64 }}
                    />
                  ) : (
                    <Box
                      component="span"
                      onClick={() => setEditingQty({ productId: line.productId, value: String(line.quantity) })}
                      sx={{ cursor: 'pointer', px: 0.75, borderRadius: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      {line.quantity}
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">{formatMoney(line.unitPrice, currencyCode)}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="text"
                    size="small"
                    value={line.discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    onChange={(event) => onLineDiscountChange(line.productId, parseMoneyInput(event.target.value))}
                    slotProps={{
                      htmlInput: {
                        inputMode: 'decimal',
                      },
                    }}
                    sx={{ width: 96 }}
                  />
                </TableCell>
                <TableCell align="right">{formatMoney(line.unitPrice * line.quantity - line.discountAmount, currencyCode)}</TableCell>
                <TableCell align="right">
                  <Button size="small" color="error" onClick={() => onRemoveCartLine(line.productId)}>
                    {t('cart.remove')}
                  </Button>
                </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Divider />

        <Stack spacing={1}>
          <Typography variant="body2">{t('cart.subtotal', { value: formatMoney(subtotal, currencyCode) })}</Typography>
          <Typography variant="body2">{t('cart.discount')}: {formatMoney(discountTotal, currencyCode)}</Typography>
          <Typography variant="h6">{t('cart.grandTotal', { value: formatMoney(grandTotal, currencyCode) })}</Typography>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <TextField
            type="number"
            label={t('cart.paymentAmount')}
            value={paymentAmount}
            onChange={(event) => onPaymentAmountChange(Number(event.target.value))}
            fullWidth
          />
          <TextField
            select
            label={t('cart.method')}
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="Cash">{t('cart.method.cash')}</MenuItem>
            <MenuItem value="Card">{t('cart.method.card')}</MenuItem>
            <MenuItem value="Transfer">{t('cart.method.transfer')}</MenuItem>
          </TextField>
        </Stack>

        <Typography variant="body2">{t('cart.change', { value: formatMoney(changeAmount, currencyCode) })}</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <DeliveryDiningRoundedIcon fontSize="small" color={isDelivery ? 'primary' : 'disabled'} />
          <Typography variant="body2" sx={{ mr: 'auto' }}>{t('cart.deliveryTransaction')}</Typography>
          <Switch checked={isDelivery} onChange={(_, checked) => onDeliveryChange(checked)} />
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {t('shortcut.hint')}
        </Typography>

        <Button variant="contained" size="large" onClick={onCheckout} disabled={isProcessing || cart.length === 0 || !canCheckout}>
          {isProcessing ? t('cart.processing') : t('cart.checkout')}
        </Button>
      </Stack>
    </Paper>
  )
}
