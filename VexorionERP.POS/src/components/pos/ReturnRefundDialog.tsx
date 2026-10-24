import { useEffect, useMemo, useRef, useState } from 'react'
import { UndoRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxFormControl, VxInputLabel, VxMenuItem, VxSelect, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useI18n } from '../../app/I18nContext'
import { posLogger } from '../../lib/posLogger'
import { ApiError, reportClientDiagnostic } from '../../lib/api/core'
import {
  getPosRefundEligibleLines,
  getSalesInvoiceLines,
  getSalesInvoices,
  refundSale,
} from '../../lib/api'
import type {
  ProductListItemResponse,
  PosRefundRequest,
  PosRefundResponse,
  SalesInvoiceLineListItemResponse,
  SalesInvoiceListItemResponse,
} from '../../types/api'

type Props = {
  open: boolean
  onClose: () => void
  products: ProductListItemResponse[]
  currencyCode: string
  cashierId: string
  cashierName: string
  shiftId: string
}

type Step = 'search' | 'review' | 'success'

/** lineId → qty to return */
type ReturnQty = Record<string, number>

const REASONS = [
  'return.reason.defective',
  'return.reason.wrongItem',
  'return.reason.changeOfMind',
  'return.reason.other',
] as const

type Reason = (typeof REASONS)[number]
const getPendingRefundStorageKey = (cashierId: string) => `vexorionerp.pos.pendingRefund.${cashierId}`

export default function ReturnRefundDialog({
  open,
  onClose,
  products,
  currencyCode,
  cashierId,
  cashierName,
  shiftId,
}: Props) {
  const { t } = useI18n()

  const [step, setStep] = useState<Step>('search')

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundInvoice, setFoundInvoice] = useState<SalesInvoiceListItemResponse | null>(null)

  // --- Review state ---
  const [lines, setLines] = useState<SalesInvoiceLineListItemResponse[]>([])
  const [isLoadingLines, setIsLoadingLines] = useState(false)
  const [returnQtys, setReturnQtys] = useState<ReturnQty>({})
  const [remainingQtys, setRemainingQtys] = useState<ReturnQty>({})
  const [canRestock, setCanRestock] = useState<Record<string, boolean>>({})
  const [returnToStock, setReturnToStock] = useState<Record<string, boolean>>({})
  const [reason, setReason] = useState<Reason>('return.reason.defective')
  const [otherReason, setOtherReason] = useState('')

  // --- Processing state ---
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [successResponse, setSuccessResponse] = useState<PosRefundResponse | null>(null)
  const [pendingRecovery, setPendingRecovery] = useState(false)
  const idempotencyKey = useRef<string | null>(null)
  const pendingRequest = useRef<PosRefundRequest | null>(null)

  // Reset all state when dialog closes
  useEffect(() => {
    if (open) {
      const pending = window.sessionStorage.getItem(getPendingRefundStorageKey(cashierId))
      if (pending) {
        try {
          const saved = JSON.parse(pending) as { request: PosRefundRequest; invoiceNumber: string }
          if (saved.request?.idempotencyKey && saved.request.salesInvoiceId && Array.isArray(saved.request.lines)) {
            pendingRequest.current = saved.request
            idempotencyKey.current = saved.request.idempotencyKey
            setSearchQuery(saved.invoiceNumber ?? '')
            setPendingRecovery(true)
            setHasAttempted(true)
          }
        } catch {
          window.sessionStorage.removeItem(getPendingRefundStorageKey(cashierId))
        }
      }
      return
    }

    if (!open) {
      const tid = setTimeout(() => {
        setStep('search')
        setSearchQuery('')
        setSearchError(null)
        setFoundInvoice(null)
        setLines([])
        setReturnQtys({})
        setRemainingQtys({})
        setCanRestock({})
        setReturnToStock({})
        setReason('return.reason.defective')
        setOtherReason('')
        setHasAttempted(false)
        setPendingRecovery(false)
        setProcessError(null)
        setSuccessResponse(null)
        idempotencyKey.current = null
        pendingRequest.current = null
      }, 300)
      return () => clearTimeout(tid)
    }
  }, [open, cashierId])

  const productMap = useMemo(() => {
    const m = new Map<string, ProductListItemResponse>()
    products.forEach((p) => m.set(p.id, p))
    return m
  }, [products])

  // ---- Item 9: Invoice Search ----
  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setIsSearching(true)
    setSearchError(null)
    setFoundInvoice(null)
    try {
      const result = await getSalesInvoices()
      const match = result.find(
        (inv) => inv.invoiceNumber.toLowerCase() === q.toLowerCase() && inv.isActive,
      )
      if (!match) {
        setSearchError(t('return.notFound').replace('{query}', q))
        return
      }
      setFoundInvoice(match)

      // ---- Item 10: Load invoice lines ----
      setIsLoadingLines(true)
      try {
        const [invoiceLines, eligible] = await Promise.all([
          getSalesInvoiceLines(match.id),
          getPosRefundEligibleLines(match.id),
        ])
        const activeLines = invoiceLines.filter((l) => l.isActive && l.quantity > 0)
        setLines(activeLines)
        const eligibleById = new Map(eligible.lines.map((line) => [line.salesInvoiceLineId, line]))
        const initial: ReturnQty = {}
        const remaining: ReturnQty = {}
        const restockable: Record<string, boolean> = {}
        const defaultRestock: Record<string, boolean> = {}
        activeLines.forEach((l) => {
          initial[l.id] = 0
          const eligibility = eligibleById.get(l.id)
          remaining[l.id] = eligibility?.quantityRemaining ?? 0
          restockable[l.id] = eligibility?.canReturnToStock ?? false
          defaultRestock[l.id] = eligibility?.canReturnToStock ?? false
        })
        setReturnQtys(initial)
        setRemainingQtys(remaining)
        setCanRestock(restockable)
        setReturnToStock(defaultRestock)
        setStep('review')
      } finally {
        setIsLoadingLines(false)
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t('return.error'))
    } finally {
      setIsSearching(false)
    }
  }

  // ---- Derived values for review step ----
  const effectiveReason: string =
    reason === 'return.reason.other' ? otherReason.trim() : t(reason)

  const returnLines = lines.filter((l) => (returnQtys[l.id] ?? 0) > 0)

  const refundTotal = returnLines.reduce((sum, l) => {
    const qty = returnQtys[l.id] ?? 0
    const proRataDiscount = l.quantity > 0 ? (l.discountAmount / l.quantity) * qty : 0
    const proRataTax = l.quantity > 0 ? ((l.taxAmount ?? 0) / l.quantity) * qty : 0
    return sum + l.unitPrice * qty - proRataDiscount + proRataTax
  }, 0)

  const submitRefund = async (request: PosRefundRequest) => {
    setIsProcessing(true)
    setHasAttempted(true)
    setProcessError(null)
    try {
      const result = await refundSale(request)
      window.sessionStorage.removeItem(getPendingRefundStorageKey(cashierId))
      pendingRequest.current = null
      setPendingRecovery(false)
      posLogger.info('refund.success', {
        actorId: cashierId,
        actorName: cashierName,
        reason: request.reason,
        originalInvoiceId: request.salesInvoiceId,
        creditNoteId: result.creditNoteId,
        refundId: result.refundId,
        refundAmount: result.refundAmount,
      })
      setSuccessResponse(result)
      setStep('success')
    } catch (error) {
      const definitiveFailure = error instanceof ApiError && error.status >= 400 && error.status < 500
      if (definitiveFailure) {
        window.sessionStorage.removeItem(getPendingRefundStorageKey(cashierId))
        pendingRequest.current = null
        idempotencyKey.current = null
        setPendingRecovery(false)
        setHasAttempted(false)
      } else {
        setPendingRecovery(true)
      }
      setProcessError(error instanceof ApiError ? error.message : t('return.unknownOutcome'))
      posLogger.error('refund.failed')
      if (!(error instanceof ApiError)) reportClientDiagnostic('operation.failed', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const retryPendingRefund = () => {
    if (pendingRequest.current) void submitRefund(pendingRequest.current)
  }

  const handleConfirm = async () => {
    if (!foundInvoice) return
    setProcessError(null)

    if (returnLines.length === 0) {
      setProcessError(t('return.noLinesSelected'))
      return
    }
    if (!effectiveReason) {
      setProcessError(t('return.reason') + ' is required.')
      return
    }

    idempotencyKey.current ??= crypto.randomUUID()
    const request: PosRefundRequest = {
      idempotencyKey: idempotencyKey.current,
      shiftId,
      salesInvoiceId: foundInvoice.id,
      reason: effectiveReason,
      lines: returnLines.map((line) => ({
        salesInvoiceLineId: line.id,
        quantity: returnQtys[line.id] ?? 0,
        returnToStock: returnToStock[line.id] ?? false,
      })),
    }
    pendingRequest.current = request
    try {
      window.sessionStorage.setItem(getPendingRefundStorageKey(cashierId), JSON.stringify({
        request,
        invoiceNumber: foundInvoice.invoiceNumber,
      }))
    } catch {
      pendingRequest.current = null
      idempotencyKey.current = null
      setProcessError(t('return.recoveryUnavailable'))
      return
    }
    await submitRefund(request)
  }

  return (
    <VxDialog
      open={open}
      onClose={isProcessing || pendingRecovery ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <VxDialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UndoRoundedIcon />
        {t('return.title')}
      </VxDialogTitle>

      <VxDialogContent dividers>
        {/* ---- Step: Search ---- */}
        {step === 'search' && (
          <VxStack spacing={2}>
            <VxTextField
              label={t('return.searchLabel')}
              placeholder={t('return.searchPlaceholder')}
              value={searchQuery}
              disabled={pendingRecovery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearch()
              }}
              autoFocus
              fullWidth
            />
            {pendingRecovery || searchError ? (
              <VxAlert severity={pendingRecovery ? 'error' : 'warning'} role="alert">
                {pendingRecovery ? t('return.unknownOutcome') : searchError}
              </VxAlert>
            ) : null}
          </VxStack>
        )}

        {/* ---- Step: Review (Item 10: partial line selection; Item 12: reason) ---- */}
        {step === 'review' && foundInvoice && (
          <VxStack spacing={2}>
            {/* Invoice summary card */}
            <VxBox sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <VxStack direction="row" spacing={4}>
                <VxBox>
                  <VxTypography variant="caption" color="text.secondary">
                    {t('return.invoice')}
                  </VxTypography>
                  <VxTypography sx={{ fontWeight: 600 }}>{foundInvoice.invoiceNumber}</VxTypography>
                </VxBox>
                <VxBox>
                  <VxTypography variant="caption" color="text.secondary">
                    {t('return.date')}
                  </VxTypography>
                  <VxTypography>{foundInvoice.invoiceDate}</VxTypography>
                </VxBox>
                <VxBox>
                  <VxTypography variant="caption" color="text.secondary">
                    {t('return.total')}
                  </VxTypography>
                  <VxTypography>
                    {currencyCode} {foundInvoice.grandTotal.toFixed(2)}
                  </VxTypography>
                </VxBox>
              </VxStack>
            </VxBox>

            {/* Invoice lines table */}
            <VxTypography component="h3" variant="subtitle2">{t('return.linesTitle')}</VxTypography>
            {isLoadingLines ? (
              <VxBox sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <VxCircularProgress size={28} />
              </VxBox>
            ) : (
              <VxBox sx={{ overflowX: 'auto' }}>
                <VxTable size="small" aria-label={t('return.linesTitle')}>
                  <VxTableHead>
                    <VxTableRow>
                      <VxTableCell>{t('return.product')}</VxTableCell>
                      <VxTableCell align="right">{t('return.qtySold')}</VxTableCell>
                      <VxTableCell align="right">{t('return.qtyRemaining')}</VxTableCell>
                      <VxTableCell align="right">{t('return.unitPrice')}</VxTableCell>
                      <VxTableCell align="right">{t('return.qtyLabel')}</VxTableCell>
                      <VxTableCell>{t('return.disposition')}</VxTableCell>
                    </VxTableRow>
                  </VxTableHead>
                  <VxTableBody>
                    {lines.map((line) => {
                      const product = productMap.get(line.productId)
                      const productLabel = product
                        ? `${product.sku} — ${product.name}`
                        : line.productId
                      return (
                        <VxTableRow key={line.id}>
                          <VxTableCell>{productLabel}</VxTableCell>
                          <VxTableCell align="right">{line.quantity}</VxTableCell>
                          <VxTableCell align="right">{remainingQtys[line.id] ?? 0}</VxTableCell>
                          <VxTableCell align="right">
                            {line.unitPrice.toFixed(2)}
                          </VxTableCell>
                          <VxTableCell align="right" sx={{ width: 110 }}>
                            <VxTextField
                              type="number"
                              size="small"
                              value={returnQtys[line.id] ?? 0}
                              disabled={hasAttempted || (remainingQtys[line.id] ?? 0) <= 0}
                              slotProps={{
                                htmlInput: { min: 0, max: remainingQtys[line.id] ?? 0, step: 1 },
                              }}
                              onChange={(e) => {
                                const val = Math.min(
                                  remainingQtys[line.id] ?? 0,
                                  Math.max(0, Number(e.target.value)),
                                )
                                setReturnQtys((prev) => ({ ...prev, [line.id]: val }))
                              }}
                              sx={{ width: 84 }}
                            />
                          </VxTableCell>
                          <VxTableCell>
                            <VxFormControl size="small" sx={{ minWidth: 130 }}>
                              <VxInputLabel>{t('return.disposition')}</VxInputLabel>
                              <VxSelect
                                value={returnToStock[line.id] ? 'stock' : 'writeoff'}
                                label={t('return.disposition')}
                                disabled={hasAttempted || (remainingQtys[line.id] ?? 0) <= 0}
                                onChange={(e) => setReturnToStock((prev) => ({
                                  ...prev,
                                  [line.id]: e.target.value === 'stock',
                                }))}
                              >
                                <VxMenuItem value="stock" disabled={!canRestock[line.id]}>{t('return.restock')}</VxMenuItem>
                                <VxMenuItem value="writeoff">{t('return.writeOff')}</VxMenuItem>
                              </VxSelect>
                            </VxFormControl>
                          </VxTableCell>
                        </VxTableRow>
                      )
                    })}
                  </VxTableBody>
                </VxTable>
              </VxBox>
            )}

            <VxDivider />

            {/* Item 12: Mandatory return reason */}
            <VxFormControl fullWidth>
              <VxInputLabel>{t('return.reason')}</VxInputLabel>
              <VxSelect
                value={reason}
                label={t('return.reason')}
                disabled={hasAttempted}
                onChange={(e) => setReason(e.target.value as Reason)}
              >
                {REASONS.map((r) => (
                  <VxMenuItem key={r} value={r}>
                    {t(r)}
                  </VxMenuItem>
                ))}
              </VxSelect>
            </VxFormControl>

            {reason === 'return.reason.other' && (
              <VxTextField
                label={t('return.reasonOther')}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                disabled={hasAttempted}
                fullWidth
                required
              />
            )}

            {/* Refund total summary chip */}
            {returnLines.length > 0 && (
              <VxBox
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(46,125,50,0.08)',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'success.light',
                }}
              >
                <VxStack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <VxTypography variant="subtitle2">{t('return.refundTotal')}</VxTypography>
                  <VxChip
                    label={`${currencyCode} ${refundTotal.toFixed(2)}`}
                    color="success"
                    size="small"
                  />
                </VxStack>
              </VxBox>
            )}

            {processError ? <VxAlert severity="error" role="alert">{processError}</VxAlert> : null}
          </VxStack>
        )}

        {/* ---- Step: Success ---- */}
        {step === 'success' && successResponse && (
          <VxStack spacing={1}>
            <VxAlert severity="success" role="status">
              {t('return.success').replace('{creditNoteId}', successResponse.creditNoteNumber)}
            </VxAlert>
            <VxTypography>{t('return.refundTotal')}: {currencyCode} {successResponse.totalCreditAmount.toFixed(2)}</VxTypography>
            <VxTypography>{t('return.cashRefund')}: {currencyCode} {successResponse.refundAmount.toFixed(2)}</VxTypography>
            <VxTypography>{t('return.invoiceCredit')}: {currencyCode} {successResponse.appliedCreditAmount.toFixed(2)}</VxTypography>
            {successResponse.paymentMethod ? (
              <VxTypography>{t('return.paymentMethod')}: {successResponse.paymentMethod}</VxTypography>
            ) : null}
          </VxStack>
        )}
      </VxDialogContent>

      <VxDialogActions>
        {step === 'search' && (
          <>
            <VxButton onClick={onClose} disabled={pendingRecovery}>{t('common.cancel')}</VxButton>
            {pendingRecovery ? (
              <VxButton
                variant="contained"
                onClick={retryPendingRefund}
                disabled={isProcessing}
                startIcon={isProcessing ? <VxCircularProgress size={16} /> : null}
              >
                {isProcessing ? t('return.processing') : t('return.retrySame')}
              </VxButton>
            ) : (
              <VxButton
                variant="contained"
                onClick={() => void handleSearch()}
                disabled={!searchQuery.trim() || isSearching}
                startIcon={isSearching ? <VxCircularProgress size={16} /> : null}
              >
                {t('return.searchButton')}
              </VxButton>
            )}
          </>
        )}

        {step === 'review' && (
          <>
            <VxButton
              disabled={hasAttempted}
              onClick={() => {
                setStep('search')
                setFoundInvoice(null)
                setLines([])
              }}
            >
              {t('return.back')}
            </VxButton>
            <VxButton onClick={onClose} disabled={isProcessing}>{t('common.cancel')}</VxButton>
            <VxButton
              variant="contained"
              color="warning"
              onClick={() => void handleConfirm()}
              disabled={
                isProcessing ||
                returnLines.length === 0 ||
                !effectiveReason ||
                isLoadingLines
              }
              startIcon={isProcessing ? <VxCircularProgress size={16} /> : null}
            >
              {isProcessing ? t('return.processing') : t(pendingRecovery ? 'return.retrySame' : 'return.confirm')}
            </VxButton>
          </>
        )}

        {step === 'success' && (
          <VxButton variant="contained" onClick={onClose}>
            {t('return.close')}
          </VxButton>
        )}
      </VxDialogActions>
    </VxDialog>
  )
}
