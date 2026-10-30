import { AddRoundedIcon, ArrowBackRoundedIcon, DeleteOutlineRoundedIcon, DeliveryDiningRoundedIcon, RemoveRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxDivider, VxIconButton, VxLinearProgress, VxPaper, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
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
  hasPendingAttempt: boolean
  canCheckout: boolean
  isOnline: boolean
  stockByProduct: Record<string, number>
  onBackToCatalog: () => void
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
  hasPendingAttempt,
  canCheckout,
  isOnline,
  stockByProduct,
  onBackToCatalog,
  onRemoveCartLine,
  onLineDiscountChange,
  onLineQtyChange,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onDeliveryChange,
  onCheckout,
}: CartSummaryPanelProps) {
  const { t } = useI18n()
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({})
  const isCash = paymentMethod === 'Cash'
  const isPaymentSufficient = cart.length > 0 && paymentAmount >= grandTotal
  const remainingAmount = Math.max(grandTotal - paymentAmount, 0)

  const commitQuantity = (productId: string) => {
    const rawValue = quantityDrafts[productId]
    if (rawValue === undefined) return
    onLineQtyChange(productId, Math.max(1, Math.floor(Number(rawValue) || 1)))
    setQuantityDrafts((current) => {
      const next = { ...current }
      delete next[productId]
      return next
    })
  }

  return (
    <VxPaper sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, maxWidth: '100%' }}>
      <VxStack spacing={1.5}>
        <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <VxTypography component="h2" variant="h6">{t('cart.title')}</VxTypography>
          <VxChip label={t('cart.items', { count: cart.length })} />
        </VxStack>

        {cart.length === 0 ? (
          <VxTypography role="status" color="text.secondary" sx={{ py: 2 }}>
            {t('cart.empty')}
          </VxTypography>
        ) : (
          <VxStack component="ul" role="list" aria-label={t('cart.itemsAria')} spacing={0} sx={{ p: 0, m: 0, listStyle: 'none' }}>
            {cart.map((line) => {
              const available = stockByProduct[line.productId] ?? 0
              const hasStockConflict = line.quantity > available
              const lineTotal = Math.max(line.unitPrice * line.quantity - line.discountAmount, 0)
              return (
                <VxBox
                  component="li"
                  role="listitem"
                  key={line.productId}
                  sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', minWidth: 0 }}
                >
                  <VxStack spacing={1}>
                    <VxStack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0 }}>
                      <VxBox sx={{ minWidth: 0 }}>
                        <VxTypography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>{line.productName}</VxTypography>
                        <VxTypography variant="caption" color="text.secondary">
                          {formatMoney(line.unitPrice, currencyCode)} {t('cart.each')}
                        </VxTypography>
                      </VxBox>
                      <VxTypography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
                        {formatMoney(lineTotal, currencyCode)}
                      </VxTypography>
                    </VxStack>

                    {hasStockConflict ? (
                      <VxChip
                        color="warning"
                        size="small"
                        label={t('cart.stockWarning', { requested: line.quantity, available })}
                        sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
                      />
                    ) : null}

                    <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                      <VxStack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                        <VxIconButton
                          size="small"
                          aria-label={`${t('catalog.decreaseQty')}: ${line.productName}`}
                          disabled={line.quantity <= 1}
                          onClick={() => onLineQtyChange(line.productId, line.quantity - 1)}
                          sx={{ minWidth: 44, minHeight: 44 }}
                        >
                          <RemoveRoundedIcon fontSize="small" />
                        </VxIconButton>
                        <VxTextField
                          type="number"
                          size="small"
                          value={quantityDrafts[line.productId] ?? String(line.quantity)}
                          onFocus={() => setQuantityDrafts((current) => ({ ...current, [line.productId]: String(line.quantity) }))}
                          onChange={(event) => setQuantityDrafts((current) => ({ ...current, [line.productId]: event.target.value }))}
                          onBlur={() => commitQuantity(line.productId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') commitQuantity(line.productId)
                            if (event.key === 'Escape') {
                              setQuantityDrafts((current) => {
                                const next = { ...current }
                                delete next[line.productId]
                                return next
                              })
                            }
                          }}
                          slotProps={{ htmlInput: { min: 1, step: 1, 'aria-label': `${t('cart.qty')}: ${line.productName}` } }}
                          sx={{ width: 72 }}
                        />
                        <VxIconButton
                          size="small"
                          aria-label={`${t('catalog.increaseQty')}: ${line.productName}`}
                          onClick={() => onLineQtyChange(line.productId, line.quantity + 1)}
                          sx={{ minWidth: 44, minHeight: 44 }}
                        >
                          <AddRoundedIcon fontSize="small" />
                        </VxIconButton>
                      </VxStack>

                      <VxTextField
                        type="number"
                        size="small"
                        label={t('cart.discount')}
                        value={line.discountAmount}
                        onChange={(event) => onLineDiscountChange(line.productId, parseMoneyInput(event.target.value))}
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            max: line.unitPrice * line.quantity,
                            step: 0.01,
                            'aria-label': `${t('cart.discount')}: ${line.productName}`,
                          },
                        }}
                        sx={{ width: 112 }}
                      />

                      <VxIconButton
                        size="small"
                        color="error"
                        aria-label={`${t('cart.remove')}: ${line.productName}`}
                        onClick={() => onRemoveCartLine(line.productId)}
                        sx={{ minWidth: 44, minHeight: 44 }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </VxIconButton>
                    </VxStack>
                  </VxStack>
                </VxBox>
              )
            })}
          </VxStack>
        )}

        <VxDivider />

        <VxStack spacing={1}>
          <VxTypography variant="body2">{t('cart.subtotal', { value: formatMoney(subtotal, currencyCode) })}</VxTypography>
          <VxTypography variant="body2">{t('cart.discount')}: {formatMoney(discountTotal, currencyCode)}</VxTypography>
          <VxTypography component="p" variant="h6">{t('cart.grandTotal', { value: formatMoney(grandTotal, currencyCode) })}</VxTypography>
        </VxStack>

        <VxBox sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
          <VxStack spacing={1.5}>
            <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
              <VxTypography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>{t('cart.paymentTitle')}</VxTypography>
              <VxBox sx={{ textAlign: 'right' }}>
                <VxTypography variant="caption" color="text.secondary">{t('cart.amountDue')}</VxTypography>
                <VxTypography variant="h5" sx={{ fontWeight: 800 }}>{formatMoney(grandTotal, currencyCode)}</VxTypography>
              </VxBox>
            </VxStack>

            <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} aria-label={t('cart.method')} role="group">
              {[
                ['Cash', t('cart.method.cash')],
                ['Card', t('cart.method.card')],
                ['Transfer', t('cart.method.transfer')],
              ].map(([value, label]) => (
                <VxButton
                  key={value}
                  variant={paymentMethod === value ? 'contained' : 'outlined'}
                  aria-pressed={paymentMethod === value}
                  onClick={() => onPaymentMethodChange(value)}
                  fullWidth
                  sx={{ minHeight: 44 }}
                >
                  {label}
                </VxButton>
              ))}
            </VxStack>

            {isCash ? (
              <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <VxTextField
                  type="number"
                  label={t('cart.amountReceived')}
                  value={paymentAmount}
                  onChange={(event) => onPaymentAmountChange(Math.max(0, Number(event.target.value) || 0))}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  fullWidth
                />
                <VxButton variant="outlined" onClick={() => onPaymentAmountChange(grandTotal)} sx={{ minHeight: 44 }}>
                  {t('cart.exactAmount')}
                </VxButton>
              </VxStack>
            ) : (
              <VxAlert severity="info">{t('cart.exactPayment')}</VxAlert>
            )}

            {isCash && !isPaymentSufficient && cart.length > 0 ? (
              <VxAlert severity="warning" role="alert">
                {t('cart.shortBy', { value: formatMoney(remainingAmount, currencyCode) })}
              </VxAlert>
            ) : null}

            {isPaymentSufficient ? (
              <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <VxTypography variant="body2" color="success.main">{t('cart.paymentReady')}</VxTypography>
                {isCash ? (
                  <VxBox sx={{ textAlign: 'right' }}>
                    <VxTypography variant="caption" color="text.secondary">{t('cart.changeDue')}</VxTypography>
                    <VxTypography variant="h6" color="success.main" sx={{ fontWeight: 800 }}>
                      {formatMoney(changeAmount, currencyCode)}
                    </VxTypography>
                  </VxBox>
                ) : null}
              </VxStack>
            ) : null}
          </VxStack>
        </VxBox>
        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <DeliveryDiningRoundedIcon fontSize="small" color={isDelivery ? 'primary' : 'disabled'} />
          <VxTypography variant="body2" sx={{ mr: 'auto' }}>{t('cart.deliveryTransaction')}</VxTypography>
          <VxSwitch
            checked={isDelivery}
            onChange={(_, checked) => onDeliveryChange(checked)}
            slotProps={{ input: { 'aria-label': t('cart.deliveryTransaction') } }}
          />
        </VxStack>

        <VxTypography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {t('shortcut.hint')}
        </VxTypography>

        {hasPendingAttempt ? (
          <VxAlert severity="warning" role="status">{t('cart.retryHint')}</VxAlert>
        ) : null}
        {isProcessing ? (
          <VxStack spacing={0.75} role="status" aria-live="polite">
            <VxLinearProgress />
            <VxTypography variant="body2" color="text.secondary">{t('cart.processingHint')}</VxTypography>
          </VxStack>
        ) : null}
        {!canCheckout && cart.length > 0 ? (
          <VxAlert severity="error">{t('cart.checkoutPermissionRequired')}</VxAlert>
        ) : null}
        {!isOnline && cart.length > 0 ? (
          <VxAlert severity="warning" role="status">{t('cart.offlineCheckout')}</VxAlert>
        ) : null}
        <VxButton variant="contained" size="large" onClick={onCheckout} disabled={isProcessing || !isPaymentSufficient || !canCheckout || !isOnline} sx={{ minHeight: 48 }}>
          {isProcessing ? t('cart.processing') : hasPendingAttempt ? t('cart.retrySameSale') : t('cart.checkout')}
        </VxButton>
        <VxButton
          variant="text"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onBackToCatalog}
          sx={{ display: { xs: 'inline-flex', lg: 'none' } }}
        >
          {t('cart.backToCatalog')}
        </VxButton>
      </VxStack>
    </VxPaper>
  )
}
