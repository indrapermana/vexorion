import { useEffect, useMemo, useState } from 'react'
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
} from '@mui/material'
import { ApiError, createPurchaseReceipt, getPurchaseOrderLines } from '../../../lib/api'
import { useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import LookupSelectField from '../../../components/LookupSelectField'
import type { PurchaseReceiptDetailsResponse } from '../../../types/api'
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
  const { items: products } = useProductsLookup(open)
  const [orderLines, setOrderLines] = useState<LineEntry[]>([])
  const [isLoadingLines, setIsLoadingLines] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setReceiptNumber('')
    setWarehouseId(warehouses[0]?.id ?? '')
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setSubmitError(null)

    void (async () => {
      setIsLoadingLines(true)
      try {
        const lines = await getPurchaseOrderLines(purchaseOrderId)
        setOrderLines(
          lines.filter(l => l.isActive).map(l => ({
            purchaseOrderLineId: l.id,
            productId: l.productId,
            productName: '',
            orderedQty: l.quantity,
            unitCost: l.unitCost,
            receivedQuantity: '',
          }))
        )
      } catch {
        setOrderLines([])
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
      else setSubmitError('Failed to create receipt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Purchase Receipt</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Stack direction="row" spacing={2}>
            <TextField
              label="Receipt number"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Receipt date"
              type="date"
              value={receiptDate}
              onChange={e => setReceiptDate(e.target.value)}
              required
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
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
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right" sx={{ minWidth: 130 }}>Receive Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderLines.map(line => (
                  <TableRow key={line.purchaseOrderLineId}>
                    <TableCell>{line.productName || line.productId}</TableCell>
                    <TableCell align="right">{line.orderedQty}</TableCell>
                    <TableCell align="right">${line.unitCost.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        value={line.receivedQuantity}
                        onChange={e => handleQtyChange(line.purchaseOrderLineId, e.target.value)}
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
          {isSubmitting ? <CircularProgress size={18} /> : 'Create Receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
