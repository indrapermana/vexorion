import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@vexorion/ui'
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Sales Shipment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Stack direction="row" spacing={2}>
            <TextField
              label="Shipment number"
              value={shipmentNumber}
              onChange={e => setShipmentNumber(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Shipment date"
              type="date"
              value={shipmentDate}
              onChange={e => setShipmentDate(e.target.value)}
              required
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <LookupSelectField
            label="Warehouse"
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />

          <Divider />

          <Typography variant="subtitle2">Lines</Typography>

          {isLoadingLines ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Ordered</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right" sx={{ minWidth: 130 }}>Ship Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderLines.map(line => (
                  <TableRow key={line.salesOrderLineId}>
                    <TableCell>{line.productName || line.productId}</TableCell>
                    <TableCell align="right">{line.orderedQty}</TableCell>
                    <TableCell align="right">{formatMoney(line.unitPrice)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        value={line.shippedQuantity}
                        onChange={e => handleQtyChange(line.salesOrderLineId, e.target.value)}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting || isLoadingLines}>
          {isSubmitting ? <CircularProgress size={18} /> : 'Create Shipment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
