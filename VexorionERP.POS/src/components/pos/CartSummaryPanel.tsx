import DeliveryDiningRoundedIcon from '@mui/icons-material/DeliveryDiningRounded'
import {
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
  Typography,
} from '@mui/material'
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
  onRemoveCartLine: (productId: string) => void
  onLineDiscountChange: (productId: string, discountAmount: number) => void
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
  onRemoveCartLine,
  onLineDiscountChange,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onDeliveryChange,
  onCheckout,
}: CartSummaryPanelProps) {
  const { t } = useI18n()

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
            {cart.map((line) => (
              <TableRow key={line.productId}>
                <TableCell>{line.productName}</TableCell>
                <TableCell align="right">{line.quantity}</TableCell>
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
            ))}
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

        <Button variant="contained" size="large" onClick={onCheckout} disabled={isProcessing || cart.length === 0}>
          {isProcessing ? t('cart.processing') : t('cart.checkout')}
        </Button>
      </Stack>
    </Paper>
  )
}
