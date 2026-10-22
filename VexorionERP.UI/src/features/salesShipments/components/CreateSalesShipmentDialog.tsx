import { useEffect, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxDivider, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { ApiError, createSalesShipment, getSalesOrderLines } from '../../../lib/api'
import { useProductsLookup } from '../../../hooks/useLookups'
import LookupSelectField from '../../../components/LookupSelectField'
import type { SalesShipmentEditorDialogProps } from '../../../types/ui'

type LineEntry = {
  salesOrderLineId: string
  productId: string
  productName: string
  orderedQty: number
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

  useEffect(() => {
    if (!open) return
    setShipmentNumber('')
    setWarehouseId(warehouses[0]?.id ?? '')
    setShipmentDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setSubmitError(null)

    void (async () => {
      setIsLoadingLines(true)
      try {
        const lines = await getSalesOrderLines(salesOrderId)
        setOrderLines(
          lines.filter(l => l.isActive).map(l => ({
            salesOrderLineId: l.id,
            productId: l.productId,
            productName: '',
            orderedQty: l.quantity,
            unitPrice: l.unitPrice,
            shippedQuantity: '',
          }))
        )
      } catch {
        setOrderLines([])
      } finally {
        setIsLoadingLines(false)
      }
    })()
  }, [open, salesOrderId, warehouses])

  useEffect(() => {
    if (!products.length) return
    setOrderLines(prev => prev.map(l => ({
      ...l,
      productName: products.find(p => p.id === l.productId)?.name ?? l.productId,
    })))
  }, [products])

  const handleQtyChange = (lineId: string, value: string) => {
    setOrderLines(prev => prev.map(l => l.salesOrderLineId === lineId ? { ...l, shippedQuantity: value } : l))
  }

  const handleSubmit = async () => {
    setSubmitError(null)
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
    <VxDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <VxDialogTitle>{t('pages.salesShipments.editor.title')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2}>
          {submitError && <VxAlert severity="error">{submitError}</VxAlert>}

          <VxStack direction="row" spacing={2}>
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
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.salesShipments.editor.product')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.ordered')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.salesShipments.editor.unitPrice')}</VxTableCell>
                  <VxTableCell align="right" sx={{ minWidth: 130 }}>{t('pages.salesShipments.editor.shipQuantity')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {orderLines.map(line => (
                  <VxTableRow key={line.salesOrderLineId}>
                    <VxTableCell>{line.productName || line.productId}</VxTableCell>
                    <VxTableCell align="right">{line.orderedQty}</VxTableCell>
                    <VxTableCell align="right">{formatMoney(line.unitPrice)}</VxTableCell>
                    <VxTableCell align="right">
                      <VxTextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        value={line.shippedQuantity}
                        onChange={e => handleQtyChange(line.salesOrderLineId, e.target.value)}
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
        <VxButton onClick={onClose} disabled={isSubmitting}>{t('pages.salesShipments.editor.cancel')}</VxButton>
        <VxButton variant="contained" onClick={handleSubmit} disabled={isSubmitting || isLoadingLines}>
          {isSubmitting ? <VxCircularProgress size={18} /> : t('pages.salesShipments.editor.create')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
