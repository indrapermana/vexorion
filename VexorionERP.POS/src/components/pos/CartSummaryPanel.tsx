import { AddRoundedIcon, ArrowBackRoundedIcon, DeleteOutlineRoundedIcon, DeliveryDiningRoundedIcon, RemoveRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxDivider, VxIconButton, VxMenuItem, VxPaper, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
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
  canCheckout,
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

        <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
          <VxSwitch
            checked={isDelivery}
            onChange={(_, checked) => onDeliveryChange(checked)}
            slotProps={{ input: { 'aria-label': t('cart.deliveryTransaction') } }}
          />
        </VxStack>

        <VxTypography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          {t('shortcut.hint')}
        </VxTypography>

        <VxButton variant="contained" size="large" onClick={onCheckout} disabled={isProcessing || cart.length === 0 || !canCheckout}>
          {isProcessing ? t('cart.processing') : t('cart.checkout')}
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
