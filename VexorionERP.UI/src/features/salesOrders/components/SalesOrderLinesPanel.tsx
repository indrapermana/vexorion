import { useMemo, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
import { Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { ApiError, createSalesOrderLine, deleteSalesOrderLine, updateSalesOrderLine } from '../../../lib/api'
import { useInventoryBalancesLookup, useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import type { SalesOrderLineListItemResponse } from '../../../types/api'
import type { SalesOrderGridRow, SalesOrderLineFormValues } from '../../../types/ui'
import SalesOrderLineEditorDialog from './SalesOrderLineEditorDialog'

type SalesOrderLinesPanelProps = {
  order: SalesOrderGridRow | null
  lines: SalesOrderLineListItemResponse[]
  isLoading: boolean
  error: string | null
  onRefresh: () => Promise<void>
}

export default function SalesOrderLinesPanel({ order, lines, isLoading, error, onRefresh }: SalesOrderLinesPanelProps) {
  const { items: products, error: productsError } = useProductsLookup(Boolean(order))
  const { items: warehouses, error: warehousesError } = useWarehousesLookup(Boolean(order))
  const { items: balances, error: balancesError } = useInventoryBalancesLookup(Boolean(order))
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedLine, setSelectedLine] = useState<SalesOrderLineListItemResponse | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const balanceByProductId = useMemo(() => {
    if (!order?.warehouseId) {
      return new Map<string, number>()
    }

    return new Map(
      balances
        .filter((balance) => balance.warehouseId === order.warehouseId)
        .map((balance) => [balance.productId, balance.quantityAvailable]),
    )
  }, [balances, order?.warehouseId])
  const warehouseName = useMemo(() => warehouses.find((warehouse) => warehouse.id === order?.warehouseId)?.name, [order?.warehouseId, warehouses])

  if (!order) {
    return (
      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Order lines</Typography>
        <Typography color="text.secondary">Pick an order from the grid to manage its lines.</Typography>
      </Paper>
    )
  }

  const openCreate = () => {
    setMutationError(null)
    setDialogMode('create')
    setSelectedLine(null)
    setIsEditorOpen(true)
  }

  const openEdit = (line: SalesOrderLineListItemResponse) => {
    setMutationError(null)
    setDialogMode('edit')
    setSelectedLine(line)
    setIsEditorOpen(true)
  }

  const handleSave = async (mode: 'create' | 'edit', values: SalesOrderLineFormValues) => {
    if (!order) return
    setMutationError(null)
    setFeedback(null)

    const payload = {
      productId: values.productId,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      discountAmount: values.discountAmount,
    }

    try {
      if (mode === 'create') {
        await createSalesOrderLine(order.id, payload)
      } else if (selectedLine) {
        await updateSalesOrderLine(order.id, selectedLine.id, { ...payload, isActive: values.isActive })
      }
      setFeedback(mode === 'create' ? 'Sales order line created.' : 'Sales order line updated.')
      setIsEditorOpen(false)
      await onRefresh()
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : 'Unable to save sales order line.')
    }
  }

  const handleDelete = async (lineId: string) => {
    try {
      setMutationError(null)
      setFeedback(null)
      await deleteSalesOrderLine(order.id, lineId)
      setFeedback('Sales order line deleted.')
      await onRefresh()
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : 'Unable to delete sales order line.')
    }
  }

  return (
    <Paper elevation={0} className="panel-card">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6">Order lines for {order.orderNumber}</Typography>
          <Typography color="text.secondary">Attach products to this order header and keep totals visible.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!products.length}>Add line</Button>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <Chip icon={<WarehouseRoundedIcon />} label={warehouseName ? `Fulfillment warehouse: ${warehouseName}` : `Fulfillment warehouse: ${order.warehouseId}`} color="primary" variant="outlined" />
        <Typography color="text.secondary">Availability is calculated from the warehouse assigned on the sales order header.</Typography>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {productsError ? <Alert severity="warning" sx={{ mb: 2 }}>{productsError}</Alert> : null}
      {warehousesError ? <Alert severity="warning" sx={{ mb: 2 }}>{warehousesError}</Alert> : null}
      {balancesError ? <Alert severity="warning" sx={{ mb: 2 }}>{balancesError}</Alert> : null}
      {mutationError ? <Alert severity="error" sx={{ mb: 2 }}>{mutationError}</Alert> : null}
      {feedback ? <Alert severity="success" sx={{ mb: 2 }}>{feedback}</Alert> : null}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit price</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Line total</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => {
              const product = productById.get(line.productId)
              return (
                <TableRow key={line.id} hover>
                  <TableCell>{product ? `${product.name} (${product.sku})` : line.productId}</TableCell>
                  <TableCell align="right">{order.warehouseId ? (balanceByProductId.get(line.productId) ?? 0).toFixed(2) : '-'}</TableCell>
                  <TableCell align="right">{line.quantity}</TableCell>
                  <TableCell align="right">${line.unitPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">${line.discountAmount.toFixed(2)}</TableCell>
                  <TableCell align="right">${line.lineTotal.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(line)}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void handleDelete(line.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {!isLoading && lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}><Typography color="text.secondary">No lines yet.</Typography></TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <SalesOrderLineEditorDialog open={isEditorOpen} mode={dialogMode} line={selectedLine} products={products} onClose={() => setIsEditorOpen(false)} onSaved={handleSave} />
    </Paper>
  )
}