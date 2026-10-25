import { useEffect, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { ApiError, createSalesShipment, getSalesOrderLines } from '../../../lib/api'
import { useProductsLookup } from '../../../hooks/useLookups'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import LookupSelectField from '../../../components/LookupSelectField'
import type { SalesShipmentEditorDialogProps } from '../../../types/ui'

type LineEntry = {
  salesOrderLineId: string
  productId: string
  orderedQty: number
  processedQty: number
  remainingQty: number
  unitPrice: number
  shippedQuantity: string
}

export default function CreateSalesShipmentDialog({ open, salesOrderId, warehouses, onClose, onSaved }: SalesShipmentEditorDialogProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { items: products } = useProductsLookup(open)
  const [orderLines, setOrderLines] = useState<LineEntry[]>([])
  const [isLoadingLines, setIsLoadingLines] = useState(false)
  const [shipmentNumber, setShipmentNumber] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null)
  const currentFormSnapshot = JSON.stringify({
    shipmentNumber,
    warehouseId,
    shipmentDate,
    notes,
    lines: orderLines.map(({ salesOrderLineId, shippedQuantity }) => ({ salesOrderLineId, shippedQuantity })),
  })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(
    open && initialFormSnapshot !== null && currentFormSnapshot !== initialFormSnapshot,
    isSubmitting || isLoadingLines,
    onClose,
    () => {
      setShipmentNumber('')
      setWarehouseId(warehouses[0]?.id ?? '')
      setShipmentDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setOrderLines((lines) => lines.map((line) => ({ ...line, shippedQuantity: '' })))
    },
  )

  useEffect(() => {
    if (!open) return
    setShipmentNumber('')
    setWarehouseId(warehouses[0]?.id ?? '')
    setShipmentDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setSubmitError(null)
    setInitialFormSnapshot(null)

    void (async () => {
      setIsLoadingLines(true)
      try {
        const lines = await getSalesOrderLines(salesOrderId)
        const nextOrderLines = lines.filter(l => l.isActive).map(l => ({
            salesOrderLineId: l.id,
            productId: l.productId,
            orderedQty: l.quantity,
            processedQty: l.shippedQuantity ?? 0,
            remainingQty: Math.max(l.remainingQuantity ?? l.quantity - (l.shippedQuantity ?? 0), 0),
            unitPrice: l.unitPrice,
            shippedQuantity: '',
          }))
        setOrderLines(nextOrderLines)
        setInitialFormSnapshot(JSON.stringify({
          shipmentNumber: '',
          warehouseId: warehouses[0]?.id ?? '',
          shipmentDate: new Date().toISOString().slice(0, 10),
          notes: '',
          lines: nextOrderLines.map(({ salesOrderLineId, shippedQuantity }) => ({ salesOrderLineId, shippedQuantity })),
        }))
      } catch {
        setOrderLines([])
        setInitialFormSnapshot(JSON.stringify({
          shipmentNumber: '',
          warehouseId: warehouses[0]?.id ?? '',
          shipmentDate: new Date().toISOString().slice(0, 10),
          notes: '',
          lines: [],
        }))
      } finally {
        setIsLoadingLines(false)
      }
    })()
  }, [open, salesOrderId, warehouses])

  const handleQtyChange = (lineId: string, value: string) => {
    setOrderLines(prev => prev.map(l => l.salesOrderLineId === lineId ? { ...l, shippedQuantity: value } : l))
  }

  const hasQuantityExceedingRemaining = orderLines.some(line => (
    line.shippedQuantity.trim() !== '' && Number(line.shippedQuantity) > line.remainingQty
  ))

  const handleSubmit = async () => {
    setSubmitError(null)
    if (hasQuantityExceedingRemaining) {
      setSubmitError(t('pages.salesShipments.editor.quantityExceedsRemaining'))
      return
    }
    const linesToSubmit = orderLines.filter(l => l.shippedQuantity.trim() !== '' && Number(l.shippedQuantity) > 0)
    if (linesToSubmit.length === 0) {
      setSubmitError('Enter shipped quantity for at least one line.')
      return
    }
    if (!warehouseId) {
      setSubmitError('Please select a warehouse.')
      return
    }
    if (!shipmentNumber.trim()) {
      setSubmitError('Shipment number is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createSalesShipment({
        shipmentNumber: shipmentNumber.trim(),
        salesOrderId,
        warehouseId,
        shipmentDate,
        notes: notes.trim() || null,
        lines: linesToSubmit.map(l => ({
          salesOrderLineId: l.salesOrderLineId,
          productId: l.productId,
          shippedQuantity: Number(l.shippedQuantity),
          unitPrice: l.unitPrice,
        })),
      })
      onSaved(result)
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message)
      else setSubmitError(t('pages.salesShipments.editor.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <VxDialog open={open} onClose={requestClose} maxWidth="md" fullWidth>
      <VxDialogTitle>{t('pages.salesShipments.editor.title')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2}>
          {submitError && <VxAlert severity="error">{submitError}</VxAlert>}

          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <VxTextField
              label={t('pages.salesShipments.editor.number')}
              value={shipmentNumber}
              onChange={e => setShipmentNumber(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <VxTextField
              label={t('pages.salesShipments.editor.date')}
              type="date"
              value={shipmentDate}
              onChange={e => setShipmentDate(e.target.value)}
              required
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </VxStack>

          <LookupSelectField
            label={t('pages.salesShipments.editor.warehouse')}
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            emptyText={t('pages.salesShipments.editor.noWarehouses')}
            requiredText={t('common.required')}
          />

          <VxTextField
            label={t('pages.salesShipments.editor.notes')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />

          <VxDivider />

          <VxTypography variant="subtitle2">{t('pages.salesShipments.editor.lines')}</VxTypography>

          {isLoadingLines ? (
            <VxBox sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <VxCircularProgress size={24} />
            </VxBox>
          ) : (
            <VxTableContainer sx={{ maxWidth: '100%' }}>
            <VxTable size="small" sx={{ minWidth: 760 }}>
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.salesShipments.editor.product')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.ordered')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.processed')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.remaining')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.unitPrice')}</VxTableCell>
                  <VxTableCell align="right" sx={{ minWidth: 130 }}>{t('pages.salesShipments.editor.shipQuantity')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.resulting')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {orderLines.map((line, index) => {
                  const productName = products.find(product => product.id === line.productId)?.name ?? line.productId
                  return (
                  <VxTableRow key={line.salesOrderLineId}>
                    <VxTableCell>{productName}</VxTableCell>
                    <VxTableCell align="right">{line.orderedQty}</VxTableCell>
                    <VxTableCell align="right">{line.processedQty}</VxTableCell>
                    <VxTableCell align="right">{line.remainingQty}</VxTableCell>
                    <VxTableCell align="right">{formatMoney(line.unitPrice)}</VxTableCell>
                    <VxTableCell align="right">
                      <VxTextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, max: line.remainingQty, step: 0.01, inputMode: 'decimal', 'aria-label': t('pages.salesShipments.editor.enterQuantityFor', { product: productName, line: index + 1 }) } }}
                        value={line.shippedQuantity}
                        onChange={e => handleQtyChange(line.salesOrderLineId, e.target.value)}
                        error={line.shippedQuantity.trim() !== '' && Number(line.shippedQuantity) > line.remainingQty}
                        disabled={line.remainingQty <= 0}
                        sx={{ width: 110 }}
                      />
                    </VxTableCell>
                    <VxTableCell align="right">{line.processedQty + (Number(line.shippedQuantity) || 0)}</VxTableCell>
                  </VxTableRow>
                  )
                })}
              </VxTableBody>
            </VxTable>
            </VxTableContainer>
          )}
        </VxStack>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('pages.salesShipments.editor.cancel')}</VxButton>
        <VxButton variant="contained" onClick={handleSubmit} disabled={isSubmitting || isLoadingLines}>
          {isSubmitting ? <VxCircularProgress size={18} /> : t('pages.salesShipments.editor.create')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}
