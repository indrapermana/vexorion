import { PrintRoundedIcon, ReceiptLongRoundedIcon } from '@vexorion/ui'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@vexorion/ui'
import { useI18n } from '../../app/I18nContext'
import { printReceipt } from '../../lib/printReceipt'

export type ReceiptLine = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  discountAmount: number
}

export type ReceiptData = {
  completedAt: string
  customerLabel: string
  currencyCode: string
  lines: ReceiptLine[]
  paymentAmount: number
  paymentMethod: string
  isDelivery: boolean
  orderId: string
  invoiceId: string
  shipmentId?: string
  paymentId?: string
}

type Props = {
  open: boolean
  data: ReceiptData | null
  onClose: () => void
}

export function ReceiptModal({ open, data, onClose }: Props) {
  const { t } = useI18n()

  if (!data) return null

  const subtotal = data.lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  )
  const discountTotal = data.lines.reduce((sum, line) => sum + line.discountAmount, 0)
  const grandTotal = Math.max(subtotal - discountTotal, 0)
  const change = Math.max(data.paymentAmount - grandTotal, 0)
  const fmt = (amount: number) => `${data.currencyCode} ${amount.toFixed(2)}`

  const refs: Array<{ label: string; value: string }> = [
    { label: t('receipt.order'), value: data.orderId },
    { label: t('receipt.invoice'), value: data.invoiceId },
    ...(data.shipmentId ? [{ label: t('receipt.shipment'), value: data.shipmentId }] : []),
    ...(data.paymentId ? [{ label: t('receipt.payment'), value: data.paymentId }] : []),
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ReceiptLongRoundedIcon color="primary" />
          <span>{t('receipt.title')}</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Header */}
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {new Date(data.completedAt).toLocaleString()}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2">{data.customerLabel}</Typography>
            {data.isDelivery ? (
              <Chip size="small" label="Delivery" color="primary" variant="outlined" />
            ) : null}
          </Stack>
        </Stack>

        {/* Line items */}
        {data.lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('receipt.noLines')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('cart.product')}</TableCell>
                <TableCell align="right">{t('cart.qty')}</TableCell>
                <TableCell align="right">{t('cart.price')}</TableCell>
                <TableCell align="right">{t('cart.discount')}</TableCell>
                <TableCell align="right">{t('cart.total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.lines.map((line) => {
                const lineTotal = line.unitPrice * line.quantity - line.discountAmount
                return (
                  <TableRow key={line.productId}>
                    <TableCell>
                      <Typography variant="body2">{line.productName}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{line.quantity}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{fmt(line.unitPrice)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={line.discountAmount > 0 ? 'error' : 'text.secondary'}>
                        {line.discountAmount > 0 ? `-${fmt(line.discountAmount)}` : '–'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fmt(lineTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Totals */}
        <Stack spacing={0.5} sx={{ maxWidth: 280, ml: 'auto' }}>
          {subtotal !== grandTotal ? (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{t('cart.subtotal', { value: '' }).replace(':', '').trim()}</Typography>
              <Typography variant="body2">{fmt(subtotal)}</Typography>
            </Stack>
          ) : null}
          {discountTotal > 0 ? (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{t('cart.discount')}</Typography>
              <Typography variant="body2" color="error">-{fmt(discountTotal)}</Typography>
            </Stack>
          ) : null}
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">{t('cart.grandTotal', { value: '' }).replace(':', '').trim()}</Typography>
            <Typography variant="subtitle2">{fmt(grandTotal)}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {t('cart.method')}: <Chip size="small" label={data.paymentMethod} />
            </Typography>
            <Typography variant="body2">{fmt(data.paymentAmount)}</Typography>
          </Stack>
          {change > 0 ? (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{t('cart.change', { value: '' }).replace(':', '').trim()}</Typography>
              <Typography variant="body2">{fmt(change)}</Typography>
            </Stack>
          ) : null}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Document references (Item 3) */}
        <Stack spacing={0.5}>
          {refs.map((ref) => (
            <Stack key={ref.label} direction="row" spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
                {ref.label}:
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {ref.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('receipt.close')}</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<PrintRoundedIcon />}
          onClick={() => printReceipt(data)}
        >
          {t('receipt.print')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
