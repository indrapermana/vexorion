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
  useTranslation()
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
      else setSubmitError('Failed to create shipment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <VxDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <VxDialogTitle>Create Sales Shipment</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2}>
          {submitError && <VxAlert severity="error">{submitError}</VxAlert>}

          <VxStack direction="row" spacing={2}>
            <VxTextField
              label="Shipment number"
              value={shipmentNumber}
              onChange={e => setShipmentNumber(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <VxTextField
              label="Shipment date"
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
            label="Warehouse"
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
          />

          <VxTextField
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />

          <VxDivider />

          <VxTypography variant="subtitle2">Lines</VxTypography>

          {isLoadingLines ? (
            <VxBox sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <VxCircularProgress size={24} />
            </VxBox>
          ) : (
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>Product</VxTableCell>
                  <VxTableCell align="right">Ordered</VxTableCell>
                  <VxTableCell align="right">Unit Price</VxTableCell>
                  <VxTableCell align="right" sx={{ minWidth: 130 }}>Ship Qty</VxTableCell>
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
        <VxButton onClick={onClose} disabled={isSubmitting}>Cancel</VxButton>
        <VxButton variant="contained" onClick={handleSubmit} disabled={isSubmitting || isLoadingLines}>
          {isSubmitting ? <VxCircularProgress size={18} /> : 'Create Shipment'}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
