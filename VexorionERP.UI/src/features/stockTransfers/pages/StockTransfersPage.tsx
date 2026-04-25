import { useCallback, useEffect, useMemo, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
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
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
import LookupSelectField from '../../../components/LookupSelectField'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { useInventoryBalancesLookup, useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import {
  ApiError,
  createStockTransfer,
  createStockTransferLine,
  deleteStockTransfer,
  deleteStockTransferLine,
  getProduct,
  getStockTransfer,
  getStockTransfers,
  updateStockTransfer,
  updateStockTransferLine,
} from '../../../lib/api'
import type {
  StockTransferDetailsResponse,
  StockTransferLineDetailsResponse,
  StockTransferListItemResponse,
} from '../../../types/api'

type DialogMode = 'create' | 'edit'

type TransferGridRow = StockTransferListItemResponse & {
  sourceWarehouseName?: string
  destinationWarehouseName?: string
}

type TransferFormState = {
  transferNumber: string
  sourceWarehouseId: string
  destinationWarehouseId: string
  transferDate: string
  status: number
  notes: string
}

type TransferLineFormState = {
  productId: string
  quantity: string
  unitCost: string
}

const today = new Date().toISOString().slice(0, 10)

const defaultTransferForm: TransferFormState = {
  transferNumber: '',
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  transferDate: today,
  status: 1,
  notes: '',
}

const defaultLineForm: TransferLineFormState = {
  productId: '',
  quantity: '1',
  unitCost: '0',
}

const documentStatusOptions = [
  { value: 1, label: 'Draft' },
  { value: 2, label: 'Confirmed' },
  { value: 3, label: 'Partially processed' },
  { value: 4, label: 'Completed' },
  { value: 5, label: 'Cancelled' },
]

function getDocumentStatusLabel(status: number) {
  return documentStatusOptions.find((option) => option.value === status)?.label ?? `Status ${status}`
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function buildLineForm(line: StockTransferLineDetailsResponse | null): TransferLineFormState {
  if (!line) {
    return defaultLineForm
  }

  return {
    productId: line.productId,
    quantity: line.quantity.toString(),
    unitCost: line.unitCost.toString(),
  }
}

export default function StockTransfersPage() {
  const { isAuthenticated } = useAuth()
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const { items: products, error: productsError } = useProductsLookup(Boolean(isAuthenticated))
  const { items: balances, error: balancesError } = useInventoryBalancesLookup(Boolean(isAuthenticated))
  const [rows, setRows] = useState<StockTransferListItemResponse[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransferDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<DialogMode>('create')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorForm, setEditorForm] = useState<TransferFormState>(defaultTransferForm)
  const [deleteTarget, setDeleteTarget] = useState<TransferGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lineMode, setLineMode] = useState<DialogMode>('create')
  const [lineOpen, setLineOpen] = useState(false)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState<TransferLineFormState>(defaultLineForm)
  const [selectedLine, setSelectedLine] = useState<StockTransferLineDetailsResponse | null>(null)
  const [lineAutofillHint, setLineAutofillHint] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [transfers] = await Promise.all([getStockTransfers(), reloadWarehouses()])
      setRows(transfers)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load stock transfers.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadWarehouses])

  const loadDetails = useCallback(async (transferId: string) => {
    try {
      const detail = await getStockTransfer(transferId)
      setSelectedTransfer(detail)
      return detail
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load stock transfer details.')
      return null
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const sourceBalanceByProductId = useMemo(() => {
    if (!selectedTransfer) {
      return new Map<string, number>()
    }

    return new Map(
      balances
        .filter((balance) => balance.warehouseId === selectedTransfer.sourceWarehouseId)
        .map((balance) => [balance.productId, balance.quantityOnHand]),
    )
  }, [balances, selectedTransfer])
  const gridRows = useMemo<TransferGridRow[]>(() => rows.map((row) => ({
    ...row,
    sourceWarehouseName: warehouseNameById.get(row.sourceWarehouseId),
    destinationWarehouseName: warehouseNameById.get(row.destinationWarehouseId),
  })), [rows, warehouseNameById])

  const resetEditor = () => {
    setEditorError(null)
    setEditorForm(defaultTransferForm)
  }

  const openCreateDialog = () => {
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: TransferGridRow) => {
    setFeedback(null)
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError(null)

    try {
      const detail = await getStockTransfer(row.id)
      setSelectedTransfer(detail)
      setEditorForm({
        transferNumber: detail.transferNumber,
        sourceWarehouseId: detail.sourceWarehouseId,
        destinationWarehouseId: detail.destinationWarehouseId,
        transferDate: detail.transferDate,
        status: detail.status,
        notes: detail.notes ?? '',
      })
    } catch (loadError) {
      setEditorError(loadError instanceof ApiError ? loadError.message : 'Unable to load stock transfer details.')
    } finally {
      setEditorLoading(false)
    }
  }

  const saveEditor = async () => {
    setEditorError(null)

    if (!editorForm.transferNumber.trim() || !editorForm.sourceWarehouseId || !editorForm.destinationWarehouseId || !editorForm.transferDate) {
      setEditorError('Transfer number, source warehouse, destination warehouse, and date are required.')
      return
    }

    if (editorForm.sourceWarehouseId === editorForm.destinationWarehouseId) {
      setEditorError('Source and destination warehouses must be different.')
      return
    }

    try {
      const payload = {
        transferNumber: editorForm.transferNumber.trim(),
        sourceWarehouseId: editorForm.sourceWarehouseId,
        destinationWarehouseId: editorForm.destinationWarehouseId,
        transferDate: editorForm.transferDate,
        notes: optionalText(editorForm.notes),
      }

      const saved = editorMode === 'create'
        ? await createStockTransfer(payload)
        : await updateStockTransfer(selectedTransfer!.id, { ...payload, status: editorForm.status })

      setEditorOpen(false)
      resetEditor()
      setSelectedTransfer(saved)
      setFeedback(editorMode === 'create' ? `Stock transfer ${saved.transferNumber} created.` : `Stock transfer ${saved.transferNumber} updated.`)
      await loadRows()
    } catch (saveError) {
      setEditorError(saveError instanceof ApiError ? saveError.message : 'Unable to save stock transfer.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteStockTransfer(deleteTarget.id)
      if (selectedTransfer?.id === deleteTarget.id) {
        setSelectedTransfer(null)
      }
      setDeleteTarget(null)
      setFeedback(`Stock transfer ${deleteTarget.transferNumber} deleted.`)
      await loadRows()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete stock transfer.')
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateLine = () => {
    setLineMode('create')
    setSelectedLine(null)
    setLineForm(defaultLineForm)
    setLineError(null)
    setLineAutofillHint(null)
    setLineOpen(true)
  }

  const openEditLine = (line: StockTransferLineDetailsResponse) => {
    setLineMode('edit')
    setSelectedLine(line)
    setLineForm(buildLineForm(line))
    setLineError(null)
    setLineAutofillHint(null)
    setLineOpen(true)
  }

  const handleLineProductChange = async (productId: string) => {
    setLineForm((current) => ({ ...current, productId }))
    setLineAutofillHint(null)

    if (!productId || selectedLine?.productId === productId) {
      return
    }

    try {
      const product = await getProduct(productId)
      setLineForm((current) => ({ ...current, unitCost: product.standardCost.toString() }))
      setLineAutofillHint(`Unit cost auto-filled from product standard cost: $${product.standardCost.toFixed(2)}`)
    } catch (loadError) {
      setLineAutofillHint(loadError instanceof ApiError ? loadError.message : 'Unable to auto-fill product costing.')
    }
  }

  const saveLine = async () => {
    if (!selectedTransfer) {
      return
    }

    setLineError(null)
    const quantity = Number(lineForm.quantity)
    const unitCost = Number(lineForm.unitCost)

    if (!lineForm.productId || Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(unitCost) || unitCost < 0) {
      setLineError('Product, quantity greater than zero, and non-negative unit cost are required.')
      return
    }

    setLineSaving(true)

    try {
      const payload = {
        productId: lineForm.productId,
        quantity,
        unitCost,
      }

      if (lineMode === 'create') {
        await createStockTransferLine(selectedTransfer.id, payload)
      } else if (selectedLine) {
        await updateStockTransferLine(selectedTransfer.id, selectedLine.id, payload)
      }

      setLineOpen(false)
      setLineForm(defaultLineForm)
      setSelectedLine(null)
      setLineAutofillHint(null)
      setFeedback(lineMode === 'create' ? 'Transfer line created.' : 'Transfer line updated.')
      await loadDetails(selectedTransfer.id)
      await loadRows()
    } catch (saveError) {
      setLineError(saveError instanceof ApiError ? saveError.message : 'Unable to save transfer line.')
    } finally {
      setLineSaving(false)
    }
  }

  const deleteLine = async (lineId: string) => {
    if (!selectedTransfer) {
      return
    }

    setLineError(null)
    try {
      await deleteStockTransferLine(selectedTransfer.id, lineId)
      setFeedback('Transfer line deleted.')
      await loadDetails(selectedTransfer.id)
      await loadRows()
    } catch (deleteError) {
      setLineError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete transfer line.')
    }
  }

  if (!isAuthenticated) {
    return (
      <OrderWorkspace
        title="Stock Transfers"
        description="Warehouse-to-warehouse stock movements backed by `/api/stock-transfers`."
        createLabel="New transfer"
        onCreate={() => undefined}
        disableCreate
        metrics={[]}
        alerts={[{ severity: 'info', message: 'Sign in first. Stock transfers require inventory permissions.' }]}
        grid={null}
        linesPanel={null}
      />
    )
  }

  return (
    <OrderWorkspace
      title="Stock Transfers"
      description="Move stock between warehouses and complete the document to post outbound and inbound inventory movements together."
      createLabel="New transfer"
      onCreate={openCreateDialog}
      disableCreate={warehouses.length < 2}
      metrics={[
        { icon: <WarehouseRoundedIcon fontSize="small" />, label: 'Headers', value: rows.length },
        { icon: <CheckCircleRoundedIcon fontSize="small" />, label: 'Completed', value: rows.filter((row) => row.status === 4).length },
        { icon: <AutoGraphRoundedIcon fontSize="small" />, label: 'Active', value: rows.filter((row) => row.isActive).length },
      ]}
      alerts={[
        ...(warehouses.length < 2 ? [{ severity: 'warning' as const, message: 'Create at least two warehouses before creating stock transfers.' }] : []),
        ...(warehousesError ? [{ severity: 'warning' as const, message: warehousesError }] : []),
        ...(productsError ? [{ severity: 'warning' as const, message: productsError }] : []),
        ...(balancesError ? [{ severity: 'warning' as const, message: balancesError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
      ]}
      grid={
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Transfer #</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
                      <CircularProgress size={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && gridRows.map((row) => (
                <TableRow key={row.id} hover selected={selectedTransfer?.id === row.id}>
                  <TableCell>{row.transferNumber}</TableCell>
                  <TableCell>{row.sourceWarehouseName ?? row.sourceWarehouseId}</TableCell>
                  <TableCell>{row.destinationWarehouseName ?? row.destinationWarehouseId}</TableCell>
                  <TableCell>{row.transferDate}</TableCell>
                  <TableCell>{getDocumentStatusLabel(row.status)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<FormatListBulletedRoundedIcon />} onClick={() => void loadDetails(row.id)}>Lines</Button>
                    <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => void openEditDialog(row)}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setDeleteTarget(row)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && gridRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No stock transfers found.</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      }
      linesPanel={
        <Paper elevation={0} className="panel-card">
          {!selectedTransfer ? (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>Transfer lines</Typography>
              <Typography color="text.secondary">Pick a stock transfer from the grid to manage its lines.</Typography>
            </>
          ) : (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6">Transfer lines for {selectedTransfer.transferNumber}</Typography>
                  <Typography color="text.secondary">Each line reduces source stock and increases destination stock on completion.</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateLine} disabled={selectedTransfer.status !== 1 || products.length === 0}>Add line</Button>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <Chip icon={<WarehouseRoundedIcon />} label={`Source: ${warehouseNameById.get(selectedTransfer.sourceWarehouseId) ?? selectedTransfer.sourceWarehouseId}`} variant="outlined" color="primary" />
                <Chip icon={<WarehouseRoundedIcon />} label={`Destination: ${warehouseNameById.get(selectedTransfer.destinationWarehouseId) ?? selectedTransfer.destinationWarehouseId}`} variant="outlined" color="secondary" />
              </Stack>
              {selectedTransfer.status !== 1 ? <Alert severity="info" sx={{ mb: 2 }}>Lines are locked once the transfer leaves Draft status.</Alert> : null}
              {lineError ? <Alert severity="error" sx={{ mb: 2 }}>{lineError}</Alert> : null}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Source on hand</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit cost</TableCell>
                      <TableCell align="right">Extended</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTransfer.lines.map((line) => {
                      const product = productById.get(line.productId)
                      return (
                        <TableRow key={line.id} hover>
                          <TableCell>{product ? `${product.name} (${product.sku})` : line.productId}</TableCell>
                          <TableCell align="right">{(sourceBalanceByProductId.get(line.productId) ?? 0).toFixed(2)}</TableCell>
                          <TableCell align="right">{line.quantity.toFixed(2)}</TableCell>
                          <TableCell align="right">${line.unitCost.toFixed(2)}</TableCell>
                          <TableCell align="right">${(line.quantity * line.unitCost).toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditLine(line)} disabled={selectedTransfer.status !== 1}>Edit</Button>
                            <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void deleteLine(line.id)} disabled={selectedTransfer.status !== 1}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {selectedTransfer.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary">No lines yet.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      }
      editor={
        <Dialog open={editorOpen} onClose={editorLoading ? undefined : () => setEditorOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>{editorMode === 'create' ? 'Create stock transfer' : 'Edit stock transfer'}</DialogTitle>
          <DialogContent dividers>
            {editorLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                {editorError ? <Alert severity="error">{editorError}</Alert> : null}
                {editorMode === 'create' ? <Alert severity="info">New stock transfers start in Draft status. Add lines before completing them.</Alert> : null}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Transfer number" value={editorForm.transferNumber} onChange={(event) => setEditorForm((current) => ({ ...current, transferNumber: event.target.value }))} fullWidth />
                  <TextField label="Transfer date" type="date" value={editorForm.transferDate} onChange={(event) => setEditorForm((current) => ({ ...current, transferDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </Stack>
                <LookupSelectField label="Source warehouse" value={editorForm.sourceWarehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, sourceWarehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText="No warehouses available" />
                <LookupSelectField label="Destination warehouse" value={editorForm.destinationWarehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, destinationWarehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText="No warehouses available" />
                {editorMode === 'edit' ? (
                  <TextField select label="Status" value={editorForm.status} onChange={(event) => setEditorForm((current) => ({ ...current, status: Number(event.target.value) }))} fullWidth>
                    {documentStatusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                ) : null}
                <TextField label="Notes" value={editorForm.notes} onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditorOpen(false)} disabled={editorLoading}>Cancel</Button>
            <Button variant="contained" onClick={() => void saveEditor()} disabled={editorLoading || warehouses.length < 2}>{editorMode === 'create' ? 'Create transfer' : 'Save changes'}</Button>
          </DialogActions>
        </Dialog>
      }
      deleteDialog={
        <>
          <Dialog open={Boolean(deleteTarget)} onClose={isDeleting ? undefined : () => setDeleteTarget(null)} fullWidth maxWidth="xs">
            <DialogTitle>Delete stock transfer</DialogTitle>
            <DialogContent>
              <Typography color="text.secondary">{deleteTarget ? `Delete ${deleteTarget.transferNumber}? This action cannot be undone.` : 'Delete this stock transfer?'}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button color="error" variant="contained" onClick={() => void handleDelete()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={lineOpen} onClose={lineSaving ? undefined : () => setLineOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>{lineMode === 'create' ? 'Add transfer line' : 'Edit transfer line'}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                {!products.length ? <Alert severity="warning">Create products before adding transfer lines.</Alert> : null}
                {lineError ? <Alert severity="error">{lineError}</Alert> : null}
                <LookupSelectField label="Product" value={lineForm.productId} onChange={(value) => void handleLineProductChange(value)} options={products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))} disabled={!products.length} emptyText="No products available" />
                {lineAutofillHint ? <Typography variant="body2" color="text.secondary">{lineAutofillHint}</Typography> : null}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Quantity" type="number" value={lineForm.quantity} onChange={(event) => setLineForm((current) => ({ ...current, quantity: event.target.value }))} fullWidth />
                  <TextField label="Unit cost" type="number" value={lineForm.unitCost} onChange={(event) => setLineForm((current) => ({ ...current, unitCost: event.target.value }))} fullWidth />
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setLineOpen(false)} disabled={lineSaving}>Cancel</Button>
              <Button variant="contained" onClick={() => void saveLine()} disabled={lineSaving || !products.length}>{lineSaving ? 'Saving...' : lineMode === 'create' ? 'Add line' : 'Save line'}</Button>
            </DialogActions>
          </Dialog>
        </>
      }
    />
  )
}