import { PrintRoundedIcon, ReceiptLongRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
    <VxDialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <VxDialogTitle>
        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ReceiptLongRoundedIcon color="primary" />
          <span>{t('receipt.title')}</span>
        </VxStack>
      </VxDialogTitle>

      <VxDialogContent dividers>
        {/* Header */}
        <VxStack spacing={0.5} sx={{ mb: 2 }}>
          <VxTypography variant="body2" color="text.secondary">
            {new Date(data.completedAt).toLocaleString()}
          </VxTypography>
          <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <VxTypography variant="body2">{data.customerLabel}</VxTypography>
            {data.isDelivery ? (
              <VxChip size="small" label={t('receipt.delivery')} color="primary" variant="outlined" />
            ) : null}
          </VxStack>
        </VxStack>

        {/* Line items */}
        {data.lines.length === 0 ? (
          <VxTypography variant="body2" color="text.secondary">
            {t('receipt.noLines')}
          </VxTypography>
        ) : (
          <VxBox sx={{ overflowX: 'auto', maxWidth: '100%' }}>
          <VxTable size="small" aria-label={t('receipt.title')} sx={{ minWidth: 560 }}>
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('cart.product')}</VxTableCell>
                <VxTableCell align="right">{t('cart.qty')}</VxTableCell>
                <VxTableCell align="right">{t('cart.price')}</VxTableCell>
                <VxTableCell align="right">{t('cart.discount')}</VxTableCell>
                <VxTableCell align="right">{t('cart.total')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {data.lines.map((line) => {
                const lineTotal = line.unitPrice * line.quantity - line.discountAmount
                return (
                  <VxTableRow key={line.productId}>
                    <VxTableCell>
                      <VxTypography variant="body2">{line.productName}</VxTypography>
                    </VxTableCell>
                    <VxTableCell align="right">
                      <VxTypography variant="body2">{line.quantity}</VxTypography>
                    </VxTableCell>
                    <VxTableCell align="right">
                      <VxTypography variant="body2">{fmt(line.unitPrice)}</VxTypography>
                    </VxTableCell>
                    <VxTableCell align="right">
                      <VxTypography variant="body2" color={line.discountAmount > 0 ? 'error' : 'text.secondary'}>
                        {line.discountAmount > 0 ? `-${fmt(line.discountAmount)}` : '–'}
                      </VxTypography>
                    </VxTableCell>
                    <VxTableCell align="right">
                      <VxTypography variant="body2" sx={{ fontWeight: 600 }}>
                        {fmt(lineTotal)}
                      </VxTypography>
                    </VxTableCell>
                  </VxTableRow>
                )
              })}
            </VxTableBody>
          </VxTable>
          </VxBox>
        )}

        <VxDivider sx={{ my: 2 }} />

        {/* Totals */}
        <VxStack spacing={0.5} sx={{ maxWidth: 280, ml: 'auto' }}>
          {subtotal !== grandTotal ? (
            <VxStack direction="row" sx={{ justifyContent: 'space-between' }}>
              <VxTypography variant="body2" color="text.secondary">{t('cart.subtotal', { value: '' }).replace(':', '').trim()}</VxTypography>
              <VxTypography variant="body2">{fmt(subtotal)}</VxTypography>
            </VxStack>
          ) : null}
          {discountTotal > 0 ? (
            <VxStack direction="row" sx={{ justifyContent: 'space-between' }}>
              <VxTypography variant="body2" color="text.secondary">{t('cart.discount')}</VxTypography>
              <VxTypography variant="body2" color="error">-{fmt(discountTotal)}</VxTypography>
            </VxStack>
          ) : null}
          <VxStack direction="row" sx={{ justifyContent: 'space-between' }}>
            <VxTypography variant="subtitle2">{t('cart.grandTotal', { value: '' }).replace(':', '').trim()}</VxTypography>
            <VxTypography variant="subtitle2">{fmt(grandTotal)}</VxTypography>
          </VxStack>
          <VxStack direction="row" sx={{ justifyContent: 'space-between' }}>
            <VxTypography component="span" variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {t('cart.method')}: <VxChip size="small" label={data.paymentMethod} />
            </VxTypography>
            <VxTypography variant="body2">{fmt(data.paymentAmount)}</VxTypography>
          </VxStack>
          {change > 0 ? (
            <VxStack direction="row" sx={{ justifyContent: 'space-between' }}>
              <VxTypography variant="body2" color="text.secondary">{t('cart.change', { value: '' }).replace(':', '').trim()}</VxTypography>
              <VxTypography variant="body2">{fmt(change)}</VxTypography>
            </VxStack>
          ) : null}
        </VxStack>

        <VxDivider sx={{ my: 2 }} />

        {/* Document references (Item 3) */}
        <VxStack spacing={0.5}>
          {refs.map((ref) => (
            <VxStack key={ref.label} direction="row" spacing={1}>
              <VxTypography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
                {ref.label}:
              </VxTypography>
              <VxTypography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {ref.value}
              </VxTypography>
            </VxStack>
          ))}
        </VxStack>
      </VxDialogContent>

      <VxDialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <VxButton onClick={onClose} sx={{ minHeight: 44 }}>{t('receipt.close')}</VxButton>
        <VxBox sx={{ flex: 1 }} />
        <VxButton
          variant="contained"
          startIcon={<PrintRoundedIcon />}
          onClick={() => printReceipt(data, t)}
          sx={{ minHeight: 44 }}
        >
          {t('receipt.print')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
