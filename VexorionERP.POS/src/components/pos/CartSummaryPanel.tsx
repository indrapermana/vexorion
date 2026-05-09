import { DeliveryDiningRoundedIcon, WarningAmberRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxDivider, VxMenuItem, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTooltip, VxTypography } from '@vexorion/ui'
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
    <VxPaper sx={{ p: 2 }}>
      <VxStack spacing={1.5}>
        <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <VxTypography variant="h6">{t('cart.title')}</VxTypography>
          <VxChip label={t('cart.items', { count: cart.length })} />
        </VxStack>

        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('cart.product')}</VxTableCell>
              <VxTableCell align="right">{t('cart.qty')}</VxTableCell>
              <VxTableCell align="right">{t('cart.price')}</VxTableCell>
              <VxTableCell align="right">{t('cart.discount')}</VxTableCell>
              <VxTableCell align="right">{t('cart.total')}</VxTableCell>
              <VxTableCell align="right">{t('cart.action')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {cart.map((line) => {
              const isLowStock = line.quantity > (stockByProduct[line.productId] ?? 0)
              return (
                <VxTableRow key={line.productId}>
                  <VxTableCell>
                    <VxStack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      {isLowStock ? (
                        <VxTooltip title={t('cart.lowStock')}>
                          <WarningAmberRoundedIcon fontSize="small" color="warning" />
                        </VxTooltip>
                      ) : null}
                      {line.productName}
                    </VxStack>
                  </VxTableCell>
                <VxTableCell align="right">
                  {editingQty?.productId === line.productId ? (
                    <VxTextField
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
                    <VxBox
                      component="span"
                      onClick={() => setEditingQty({ productId: line.productId, value: String(line.quantity) })}
                      sx={{ cursor: 'pointer', px: 0.75, borderRadius: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      {line.quantity}
                    </VxBox>
                  )}
                </VxTableCell>
                <VxTableCell align="right">{formatMoney(line.unitPrice, currencyCode)}</VxTableCell>
                <VxTableCell align="right">
                  <VxTextField
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
                </VxTableCell>
                <VxTableCell align="right">{formatMoney(line.unitPrice * line.quantity - line.discountAmount, currencyCode)}</VxTableCell>
                <VxTableCell align="right">
                  <VxButton size="small" color="error" onClick={() => onRemoveCartLine(line.productId)}>
                    {t('cart.remove')}
                  </VxButton>
                </VxTableCell>
                </VxTableRow>
              )
            })}
          </VxTableBody>
        </VxTable>

        <VxDivider />

        <VxStack spacing={1}>
          <VxTypography variant="body2">{t('cart.subtotal', { value: formatMoney(subtotal, currencyCode) })}</VxTypography>
          <VxTypography variant="body2">{t('cart.discount')}: {formatMoney(discountTotal, currencyCode)}</VxTypography>
          <VxTypography variant="h6">{t('cart.grandTotal', { value: formatMoney(grandTotal, currencyCode) })}</VxTypography>
        </VxStack>

        <VxStack direction="row" spacing={1.5}>
          <VxTextField
            type="number"
            label={t('cart.paymentAmount')}
            value={paymentAmount}
            onChange={(event) => onPaymentAmountChange(Number(event.target.value))}
            fullWidth
          />
          <VxTextField
            select
            label={t('cart.method')}
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <VxMenuItem value="Cash">{t('cart.method.cash')}</VxMenuItem>
            <VxMenuItem value="Card">{t('cart.method.card')}</VxMenuItem>
            <VxMenuItem value="Transfer">{t('cart.method.transfer')}</VxMenuItem>
          </VxTextField>
        </VxStack>

        <VxTypography variant="body2">{t('cart.change', { value: formatMoney(changeAmount, currencyCode) })}</VxTypography>
        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <DeliveryDiningRoundedIcon fontSize="small" color={isDelivery ? 'primary' : 'disabled'} />
          <VxTypography variant="body2" sx={{ mr: 'auto' }}>{t('cart.deliveryTransaction')}</VxTypography>
          <VxSwitch checked={isDelivery} onChange={(_, checked) => onDeliveryChange(checked)} />
        </VxStack>

        <VxTypography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {t('shortcut.hint')}
        </VxTypography>

        <VxButton variant="contained" size="large" onClick={onCheckout} disabled={isProcessing || cart.length === 0 || !canCheckout}>
          {isProcessing ? t('cart.processing') : t('cart.checkout')}
        </VxButton>
      </VxStack>
    </VxPaper>
  )
}
