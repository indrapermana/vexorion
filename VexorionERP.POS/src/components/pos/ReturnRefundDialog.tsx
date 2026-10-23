import { useEffect, useMemo, useState } from 'react'
import { UndoRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxFormControl, VxInputLabel, VxMenuItem, VxSelect, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useI18n } from '../../app/I18nContext'
import { posLogger } from '../../lib/posLogger'
import {
  createCustomerPayment,
  createSalesInvoice,
  createSalesInvoiceLine,
  getSalesInvoiceLines,
  getSalesInvoices,
} from '../../lib/api'
import type {
  ProductListItemResponse,
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

export default function ReturnRefundDialog({
  open,
  onClose,
  products,
  currencyCode,
  cashierId,
  cashierName,
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
  const [reason, setReason] = useState<Reason>('return.reason.defective')
  const [otherReason, setOtherReason] = useState('')

  // --- Processing state ---
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [successCreditNoteId, setSuccessCreditNoteId] = useState<string | null>(null)

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      const tid = setTimeout(() => {
        setStep('search')
        setSearchQuery('')
        setSearchError(null)
        setFoundInvoice(null)
        setLines([])
        setReturnQtys({})
        setReason('return.reason.defective')
        setOtherReason('')
        setProcessError(null)
        setSuccessCreditNoteId(null)
      }, 300)
      return () => clearTimeout(tid)
    }
  }, [open])

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
        const invoiceLines = await getSalesInvoiceLines(match.id)
        const activeLines = invoiceLines.filter((l) => l.isActive && l.quantity > 0)
        setLines(activeLines)
        const initial: ReturnQty = {}
        activeLines.forEach((l) => {
          initial[l.id] = 0
        })
        setReturnQtys(initial)
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
    return sum + l.unitPrice * qty - proRataDiscount
  }, 0)

  // ---- Item 11 + 12: Process return — credit note + refund payment + audit ----
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

    setIsProcessing(true)
    try {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10)
      const creditNoteNotes = [
        t('return.creditNote').replace('{invoiceNumber}', foundInvoice.invoiceNumber),
        `Reason: ${effectiveReason}`,
        `Cashier: ${cashierName}`,
        now.toISOString(),
      ].join(' — ')

      // Step 1: Create credit note invoice
      const creditNote = await createSalesInvoice({
        invoiceNumber: `CR-${foundInvoice.invoiceNumber}-${now.getTime()}`,
        customerId: foundInvoice.customerId,
        invoiceDate: dateStr,
        dueDate: dateStr,
        currencyCode: foundInvoice.currencyCode,
        status: 2, // posted / approved
        notes: creditNoteNotes,
      })

      // Step 2: Create credit note lines (returned quantities)
      for (const line of returnLines) {
        const qty = returnQtys[line.id] ?? 0
        const proRataDiscount =
          line.quantity > 0 ? (line.discountAmount / line.quantity) * qty : 0
        await createSalesInvoiceLine(creditNote.id, {
          productId: line.productId,
          quantity: qty,
          unitPrice: line.unitPrice,
          discountAmount: proRataDiscount,
          taxAmount: 0,
        })
      }

      // Step 3: Create refund payment — negative amount credits back to customer
      const refundPayment = await createCustomerPayment({
        customerId: foundInvoice.customerId,
        salesInvoiceId: creditNote.id,
        amount: -refundTotal,
        currencyCode: foundInvoice.currencyCode,
        paymentDate: dateStr,
        notes: t('return.refundPayment').replace(
          '{invoiceNumber}',
          foundInvoice.invoiceNumber,
        ),
      })

      // Step 4: Structured audit trail
      posLogger.info('refund.success', {
        actorId: cashierId,
        actorName: cashierName,
        reason: effectiveReason,
        originalInvoiceId: foundInvoice.id,
        originalInvoiceNumber: foundInvoice.invoiceNumber,
        creditNoteId: creditNote.id,
        refundPaymentId: refundPayment.id,
        refundTotal,
        returnedLines: returnLines.map((l) => ({
          productId: l.productId,
          qty: returnQtys[l.id],
        })),
      })

      setSuccessCreditNoteId(creditNote.id)
      setStep('success')
    } catch (error) {
      setProcessError(error instanceof Error ? error.message : t('return.error'))
      posLogger.error('refund.failed', {
        actorId: cashierId,
        actorName: cashierName,
        originalInvoiceId: foundInvoice.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <VxDialog
      open={open}
      onClose={isProcessing ? undefined : onClose}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearch()
              }}
              autoFocus
              fullWidth
            />
            {searchError ? <VxAlert severity="warning" role="alert">{searchError}</VxAlert> : null}
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
                      <VxTableCell align="right">{t('return.unitPrice')}</VxTableCell>
                      <VxTableCell align="right">{t('return.qtyLabel')}</VxTableCell>
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
                          <VxTableCell align="right">
                            {line.unitPrice.toFixed(2)}
                          </VxTableCell>
                          <VxTableCell align="right" sx={{ width: 110 }}>
                            <VxTextField
                              type="number"
                              size="small"
                              value={returnQtys[line.id] ?? 0}
                              slotProps={{
                                htmlInput: { min: 0, max: line.quantity, step: 1 },
                              }}
                              onChange={(e) => {
                                const val = Math.min(
                                  line.quantity,
                                  Math.max(0, Number(e.target.value)),
                                )
                                setReturnQtys((prev) => ({ ...prev, [line.id]: val }))
                              }}
                              sx={{ width: 84 }}
                            />
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
        {step === 'success' && successCreditNoteId && (
          <VxAlert severity="success" role="status">
            {t('return.success').replace('{creditNoteId}', successCreditNoteId)}
          </VxAlert>
        )}
      </VxDialogContent>

      <VxDialogActions>
        {step === 'search' && (
          <>
            <VxButton onClick={onClose}>{t('common.cancel')}</VxButton>
            <VxButton
              variant="contained"
              onClick={() => void handleSearch()}
              disabled={!searchQuery.trim() || isSearching}
              startIcon={isSearching ? <VxCircularProgress size={16} /> : null}
            >
              {t('return.searchButton')}
            </VxButton>
          </>
        )}

        {step === 'review' && (
          <>
            <VxButton
              onClick={() => {
                setStep('search')
                setFoundInvoice(null)
                setLines([])
              }}
            >
              {t('return.back')}
            </VxButton>
            <VxButton onClick={onClose}>{t('common.cancel')}</VxButton>
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
              {isProcessing ? t('return.processing') : t('return.confirm')}
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
