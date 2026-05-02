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

type CartSummaryPanelProps = {
  cart: CartLine[]
  subtotal: number
  discountTotal: number
  grandTotal: number
  changeAmount: number
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
                <TableCell align="right">{line.unitPrice.toFixed(2)}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={line.discountAmount}
                    onChange={(event) => onLineDiscountChange(line.productId, Number(event.target.value))}
                    sx={{ width: 96 }}
                  />
                </TableCell>
                <TableCell align="right">{(line.unitPrice * line.quantity - line.discountAmount).toFixed(2)}</TableCell>
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
          <Typography variant="body2">{t('cart.subtotal', { value: subtotal.toFixed(2) })}</Typography>
          <Typography variant="body2">{t('cart.discount')}: {discountTotal.toFixed(2)}</Typography>
          <Typography variant="h6">{t('cart.grandTotal', { value: grandTotal.toFixed(2) })}</Typography>
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

        <Typography variant="body2">{t('cart.change', { value: changeAmount.toFixed(2) })}</Typography>
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
