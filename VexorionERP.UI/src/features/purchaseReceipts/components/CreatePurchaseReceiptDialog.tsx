import { useEffect, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { ApiError, createPurchaseReceipt, getPurchaseOrderLines } from '../../../lib/api'
import { useProductsLookup } from '../../../hooks/useLookups'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import LookupSelectField from '../../../components/LookupSelectField'
import type { PurchaseReceiptEditorDialogProps } from '../../../types/ui'

type LineEntry = {
  purchaseOrderLineId: string
  productId: string
  productName: string
  orderedQty: number
  unitCost: number
  receivedQuantity: string
}

export default function CreatePurchaseReceiptDialog({ open, purchaseOrderId, warehouses, onClose, onSaved }: PurchaseReceiptEditorDialogProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { items: products } = useProductsLookup(open)
  const [orderLines, setOrderLines] = useState<LineEntry[]>([])
  const [isLoadingLines, setIsLoadingLines] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null)
  const currentFormSnapshot = JSON.stringify({
    receiptNumber,
    warehouseId,
    receiptDate,
    notes,
    lines: orderLines.map(({ purchaseOrderLineId, receivedQuantity }) => ({ purchaseOrderLineId, receivedQuantity })),
  })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(
    open && initialFormSnapshot !== null && currentFormSnapshot !== initialFormSnapshot,
    isSubmitting || isLoadingLines,
    onClose,
    () => {
      setReceiptNumber('')
      setWarehouseId(warehouses[0]?.id ?? '')
      setReceiptDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setOrderLines((lines) => lines.map((line) => ({ ...line, receivedQuantity: '' })))
    },
  )

  useEffect(() => {
    if (!open) return
    setReceiptNumber('')
    setWarehouseId(warehouses[0]?.id ?? '')
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setSubmitError(null)
    setInitialFormSnapshot(null)

    void (async () => {
      setIsLoadingLines(true)
      try {
        const lines = await getPurchaseOrderLines(purchaseOrderId)
        const nextOrderLines = lines.filter(l => l.isActive).map(l => ({
            purchaseOrderLineId: l.id,
            productId: l.productId,
            productName: '',
            orderedQty: l.quantity,
            unitCost: l.unitCost,
            receivedQuantity: '',
          }))
        setOrderLines(nextOrderLines)
        setInitialFormSnapshot(JSON.stringify({
          receiptNumber: '',
          warehouseId: warehouses[0]?.id ?? '',
          receiptDate: new Date().toISOString().slice(0, 10),
          notes: '',
          lines: nextOrderLines.map(({ purchaseOrderLineId, receivedQuantity }) => ({ purchaseOrderLineId, receivedQuantity })),
        }))
      } catch {
        setOrderLines([])
        setInitialFormSnapshot(JSON.stringify({
          receiptNumber: '',
          warehouseId: warehouses[0]?.id ?? '',
          receiptDate: new Date().toISOString().slice(0, 10),
          notes: '',
          lines: [],
        }))
      } finally {
        setIsLoadingLines(false)
      }
    })()
  }, [open, purchaseOrderId, warehouses])

  // Enrich product names after products load
  useEffect(() => {
    if (!products.length) return
    setOrderLines(prev => prev.map(l => ({
      ...l,
      productName: products.find(p => p.id === l.productId)?.name ?? l.productId,
    })))
  }, [products])

  const handleQtyChange = (lineId: string, value: string) => {
    setOrderLines(prev => prev.map(l => l.purchaseOrderLineId === lineId ? { ...l, receivedQuantity: value } : l))
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    const linesToSubmit = orderLines
      .filter(l => l.receivedQuantity.trim() !== '' && Number(l.receivedQuantity) > 0)
    if (linesToSubmit.length === 0) {
      setSubmitError('Enter received quantity for at least one line.')
      return
    }
    if (!warehouseId) {
      setSubmitError('Please select a warehouse.')
      return
    }
    if (!receiptNumber.trim()) {
      setSubmitError('Receipt number is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createPurchaseReceipt({
        receiptNumber: receiptNumber.trim(),
        purchaseOrderId,
        warehouseId,
        receiptDate,
        notes: notes.trim() || null,
        lines: linesToSubmit.map(l => ({
          purchaseOrderLineId: l.purchaseOrderLineId,
          productId: l.productId,
          receivedQuantity: Number(l.receivedQuantity),
          unitCost: l.unitCost,
        })),
      })
      onSaved(result)
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message)
      else setSubmitError(t('pages.purchaseReceipts.editor.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <VxDialog open={open} onClose={requestClose} maxWidth="md" fullWidth>
      <VxDialogTitle>{t('pages.purchaseReceipts.editor.title')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2}>
          {submitError && <VxAlert severity="error">{submitError}</VxAlert>}

          <VxStack direction="row" spacing={2}>
            <VxTextField
              label={t('pages.purchaseReceipts.editor.number')}
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <VxTextField
              label={t('pages.purchaseReceipts.editor.date')}
              type="date"
              value={receiptDate}
              onChange={e => setReceiptDate(e.target.value)}
              required
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </VxStack>

          <LookupSelectField
            label={t('pages.purchaseReceipts.editor.warehouse')}
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            emptyText={t('pages.purchaseReceipts.editor.noWarehouses')}
            requiredText={t('common.required')}
          />

          <VxTextField
            label={t('pages.purchaseReceipts.editor.notes')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />

          <VxDivider />

          <VxTypography variant="subtitle2">{t('pages.purchaseReceipts.editor.lines')}</VxTypography>

          {isLoadingLines ? (
            <VxBox sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <VxCircularProgress size={24} />
            </VxBox>
          ) : (
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.purchaseReceipts.editor.product')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.purchaseReceipts.editor.ordered')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.purchaseReceipts.editor.unitCost')}</VxTableCell>
                  <VxTableCell align="right" sx={{ minWidth: 130 }}>{t('pages.purchaseReceipts.editor.receiveQuantity')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {orderLines.map(line => (
                  <VxTableRow key={line.purchaseOrderLineId}>
                    <VxTableCell>{line.productName || line.productId}</VxTableCell>
                    <VxTableCell align="right">{line.orderedQty}</VxTableCell>
                    <VxTableCell align="right">{formatMoney(line.unitCost)}</VxTableCell>
                    <VxTableCell align="right">
                      <VxTextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        value={line.receivedQuantity}
                        onChange={e => handleQtyChange(line.purchaseOrderLineId, e.target.value)}
                        sx={{ width: 110 }}
                      />
                    </VxTableCell>
                  </VxTableRow>
                ))}
              </VxTableBody>
            </VxTable>
          )}
        </VxStack>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('pages.purchaseReceipts.editor.cancel')}</VxButton>
        <VxButton variant="contained" onClick={handleSubmit} disabled={isSubmitting || isLoadingLines}>
          {isSubmitting ? <VxCircularProgress size={18} /> : t('pages.purchaseReceipts.editor.create')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}
