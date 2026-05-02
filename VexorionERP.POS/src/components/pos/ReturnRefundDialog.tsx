import { useEffect, useMemo, useState } from 'react'
import UndoRoundedIcon from '@mui/icons-material/UndoRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
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
    } catch {
      setSearchError(t('return.error'))
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
    } catch {
      setProcessError(t('return.error'))
      posLogger.error('refund.failed', {
        actorId: cashierId,
        actorName: cashierName,
        originalInvoiceId: foundInvoice.id,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={step === 'success' ? onClose : undefined}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UndoRoundedIcon />
        {t('return.title')}
      </DialogTitle>

      <DialogContent dividers>
        {/* ---- Step: Search ---- */}
        {step === 'search' && (
          <Stack spacing={2}>
            <TextField
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
            {searchError ? <Alert severity="warning">{searchError}</Alert> : null}
          </Stack>
        )}

        {/* ---- Step: Review (Item 10: partial line selection; Item 12: reason) ---- */}
        {step === 'review' && foundInvoice && (
          <Stack spacing={2}>
            {/* Invoice summary card */}
            <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('return.invoice')}
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{foundInvoice.invoiceNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('return.date')}
                  </Typography>
                  <Typography>{foundInvoice.invoiceDate}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('return.total')}
                  </Typography>
                  <Typography>
                    {currencyCode} {foundInvoice.grandTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Invoice lines table */}
            <Typography variant="subtitle2">{t('return.linesTitle')}</Typography>
            {isLoadingLines ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('return.product')}</TableCell>
                      <TableCell align="right">{t('return.qtySold')}</TableCell>
                      <TableCell align="right">{t('return.unitPrice')}</TableCell>
                      <TableCell align="right">{t('return.qtyLabel')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line) => {
                      const product = productMap.get(line.productId)
                      const productLabel = product
                        ? `${product.sku} — ${product.name}`
                        : line.productId
                      return (
                        <TableRow key={line.id}>
                          <TableCell>{productLabel}</TableCell>
                          <TableCell align="right">{line.quantity}</TableCell>
                          <TableCell align="right">
                            {line.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ width: 110 }}>
                            <TextField
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
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Divider />

            {/* Item 12: Mandatory return reason */}
            <FormControl fullWidth>
              <InputLabel>{t('return.reason')}</InputLabel>
              <Select
                value={reason}
                label={t('return.reason')}
                onChange={(e) => setReason(e.target.value as Reason)}
              >
                {REASONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(r)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {reason === 'return.reason.other' && (
              <TextField
                label={t('return.reasonOther')}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                fullWidth
                required
              />
            )}

            {/* Refund total summary chip */}
            {returnLines.length > 0 && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(46,125,50,0.08)',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'success.light',
                }}
              >
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="subtitle2">{t('return.refundTotal')}</Typography>
                  <Chip
                    label={`${currencyCode} ${refundTotal.toFixed(2)}`}
                    color="success"
                    size="small"
                  />
                </Stack>
              </Box>
            )}

            {processError ? <Alert severity="error">{processError}</Alert> : null}
          </Stack>
        )}

        {/* ---- Step: Success ---- */}
        {step === 'success' && successCreditNoteId && (
          <Alert severity="success">
            {t('return.success').replace('{creditNoteId}', successCreditNoteId)}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'search' && (
          <>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              variant="contained"
              onClick={() => void handleSearch()}
              disabled={!searchQuery.trim() || isSearching}
              startIcon={isSearching ? <CircularProgress size={16} /> : null}
            >
              {t('return.searchButton')}
            </Button>
          </>
        )}

        {step === 'review' && (
          <>
            <Button
              onClick={() => {
                setStep('search')
                setFoundInvoice(null)
                setLines([])
              }}
            >
              {t('return.back')}
            </Button>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => void handleConfirm()}
              disabled={
                isProcessing ||
                returnLines.length === 0 ||
                !effectiveReason ||
                isLoadingLines
              }
              startIcon={isProcessing ? <CircularProgress size={16} /> : null}
            >
              {isProcessing ? t('return.processing') : t('return.confirm')}
            </Button>
          </>
        )}

        {step === 'success' && (
          <Button variant="contained" onClick={onClose}>
            {t('return.close')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
