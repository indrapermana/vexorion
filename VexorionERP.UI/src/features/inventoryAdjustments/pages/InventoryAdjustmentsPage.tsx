import { useCallback, useEffect, useMemo, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
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
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import LookupSelectField from '../../../components/LookupSelectField'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { useInventoryBalancesLookup, useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import {
  ApiError,
  createInventoryAdjustment,
  createInventoryAdjustmentLine,
  deleteInventoryAdjustment,
  deleteInventoryAdjustmentLine,
  getInventoryAdjustment,
  getInventoryAdjustments,
  getProduct,
  updateInventoryAdjustment,
  updateInventoryAdjustmentLine,
} from '../../../lib/api'
import type {
  InventoryAdjustmentDetailsResponse,
  InventoryAdjustmentLineDetailsResponse,
  InventoryAdjustmentListItemResponse,
} from '../../../types/api'

type DialogMode = 'create' | 'edit'

type AdjustmentGridRow = InventoryAdjustmentListItemResponse & {
  warehouseName?: string
}

type AdjustmentFormState = {
  adjustmentNumber: string
  warehouseId: string
  adjustmentDate: string
  status: number
  reason: string
  notes: string
}

type AdjustmentLineFormState = {
  productId: string
  quantityDelta: string
  unitCost: string
  reason: string
}

const today = new Date().toISOString().slice(0, 10)

const defaultAdjustmentForm: AdjustmentFormState = {
  adjustmentNumber: '',
  warehouseId: '',
  adjustmentDate: today,
  status: 1,
  reason: '',
  notes: '',
}

const defaultLineForm: AdjustmentLineFormState = {
  productId: '',
  quantityDelta: '0',
  unitCost: '0',
  reason: '',
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

function buildLineForm(line: InventoryAdjustmentLineDetailsResponse | null): AdjustmentLineFormState {
  if (!line) {
    return defaultLineForm
  }

  return {
    productId: line.productId,
    quantityDelta: line.quantityDelta.toString(),
    unitCost: line.unitCost.toString(),
    reason: line.reason ?? '',
  }
}

export default function InventoryAdjustmentsPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated } = useAuth()
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const { items: products, error: productsError } = useProductsLookup(Boolean(isAuthenticated))
  const { items: balances, error: balancesError } = useInventoryBalancesLookup(Boolean(isAuthenticated))
  const [rows, setRows] = useState<InventoryAdjustmentListItemResponse[]>([])
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustmentDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<DialogMode>('create')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorForm, setEditorForm] = useState<AdjustmentFormState>(defaultAdjustmentForm)
  const [deleteTarget, setDeleteTarget] = useState<AdjustmentGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lineMode, setLineMode] = useState<DialogMode>('create')
  const [lineOpen, setLineOpen] = useState(false)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState<AdjustmentLineFormState>(defaultLineForm)
  const [selectedLine, setSelectedLine] = useState<InventoryAdjustmentLineDetailsResponse | null>(null)
  const [lineAutofillHint, setLineAutofillHint] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [adjustments] = await Promise.all([getInventoryAdjustments(), reloadWarehouses()])
      setRows(adjustments)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load inventory adjustments.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadWarehouses])

  const loadDetails = useCallback(async (adjustmentId: string) => {
    try {
      const detail = await getInventoryAdjustment(adjustmentId)
      setSelectedAdjustment(detail)
      return detail
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load inventory adjustment details.')
      return null
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const balanceByProductId = useMemo(() => {
    if (!selectedAdjustment) {
      return new Map<string, number>()
    }

    return new Map(
      balances
        .filter((balance) => balance.warehouseId === selectedAdjustment.warehouseId)
        .map((balance) => [balance.productId, balance.quantityOnHand]),
    )
  }, [balances, selectedAdjustment])
  const gridRows = useMemo<AdjustmentGridRow[]>(() => rows.map((row) => ({
    ...row,
    warehouseName: warehouseNameById.get(row.warehouseId),
  })), [rows, warehouseNameById])

  const resetEditor = () => {
    setEditorError(null)
    setEditorForm(defaultAdjustmentForm)
  }

  const openCreateDialog = () => {
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: AdjustmentGridRow) => {
    setFeedback(null)
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError(null)

    try {
      const detail = await getInventoryAdjustment(row.id)
      setSelectedAdjustment(detail)
      setEditorForm({
        adjustmentNumber: detail.adjustmentNumber,
        warehouseId: detail.warehouseId,
        adjustmentDate: detail.adjustmentDate,
        status: detail.status,
        reason: detail.reason,
        notes: detail.notes ?? '',
      })
    } catch (loadError) {
      setEditorError(loadError instanceof ApiError ? loadError.message : 'Unable to load inventory adjustment details.')
    } finally {
      setEditorLoading(false)
    }
  }

  const saveEditor = async () => {
    setEditorError(null)

    if (!editorForm.adjustmentNumber.trim() || !editorForm.warehouseId || !editorForm.adjustmentDate || !editorForm.reason.trim()) {
      setEditorError('Adjustment number, warehouse, date, and reason are required.')
      return
    }

    try {
      const payload = {
        adjustmentNumber: editorForm.adjustmentNumber.trim(),
        warehouseId: editorForm.warehouseId,
        adjustmentDate: editorForm.adjustmentDate,
        reason: editorForm.reason.trim(),
        notes: optionalText(editorForm.notes),
      }

      const saved = editorMode === 'create'
        ? await createInventoryAdjustment(payload)
        : await updateInventoryAdjustment(selectedAdjustment!.id, { ...payload, status: editorForm.status })

      setEditorOpen(false)
      resetEditor()
      setSelectedAdjustment(saved)
      setFeedback(editorMode === 'create' ? `Inventory adjustment ${saved.adjustmentNumber} created.` : `Inventory adjustment ${saved.adjustmentNumber} updated.`)
      await loadRows()
    } catch (saveError) {
      setEditorError(saveError instanceof ApiError ? saveError.message : 'Unable to save inventory adjustment.')
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
      await deleteInventoryAdjustment(deleteTarget.id)
      if (selectedAdjustment?.id === deleteTarget.id) {
        setSelectedAdjustment(null)
      }
      setDeleteTarget(null)
      setFeedback(`Inventory adjustment ${deleteTarget.adjustmentNumber} deleted.`)
      await loadRows()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete inventory adjustment.')
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

  const openEditLine = (line: InventoryAdjustmentLineDetailsResponse) => {
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
      setLineAutofillHint(`Unit cost auto-filled from product standard cost: ${formatMoney(product.standardCost)}`)
    } catch (loadError) {
      setLineAutofillHint(loadError instanceof ApiError ? loadError.message : 'Unable to auto-fill product costing.')
    }
  }

  const saveLine = async () => {
    if (!selectedAdjustment) {
      return
    }

    setLineError(null)
    const quantityDelta = Number(lineForm.quantityDelta)
    const unitCost = Number(lineForm.unitCost)

    if (!lineForm.productId || Number.isNaN(quantityDelta) || quantityDelta === 0 || Number.isNaN(unitCost) || unitCost < 0) {
      setLineError('Product, non-zero quantity delta, and non-negative unit cost are required.')
      return
    }

    setLineSaving(true)

    try {
      const payload = {
        productId: lineForm.productId,
        quantityDelta,
        unitCost,
        reason: optionalText(lineForm.reason),
      }

      if (lineMode === 'create') {
        await createInventoryAdjustmentLine(selectedAdjustment.id, payload)
      } else if (selectedLine) {
        await updateInventoryAdjustmentLine(selectedAdjustment.id, selectedLine.id, payload)
      }

      setLineOpen(false)
      setLineForm(defaultLineForm)
      setSelectedLine(null)
      setLineAutofillHint(null)
      setFeedback(lineMode === 'create' ? 'Adjustment line created.' : 'Adjustment line updated.')
      await loadDetails(selectedAdjustment.id)
      await loadRows()
    } catch (saveError) {
      setLineError(saveError instanceof ApiError ? saveError.message : 'Unable to save adjustment line.')
    } finally {
      setLineSaving(false)
    }
  }

  const deleteLine = async (lineId: string) => {
    if (!selectedAdjustment) {
      return
    }

    setLineError(null)
    try {
      await deleteInventoryAdjustmentLine(selectedAdjustment.id, lineId)
      setFeedback('Adjustment line deleted.')
      await loadDetails(selectedAdjustment.id)
      await loadRows()
    } catch (deleteError) {
      setLineError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete adjustment line.')
    }
  }

  if (!isAuthenticated) {
    return (
      <OrderWorkspace
        title={t('nav.routeTitles.inventoryAdjustments')}
        description={t('pages.inventoryAdjustments.descriptionShort')}
        createLabel={t('pages.inventoryAdjustments.newButton')}
        onCreate={() => undefined}
        disableCreate
        metrics={[]}
        alerts={[{ severity: 'info', message: t('pages.inventoryAdjustments.signInRequired') }]}
        grid={null}
        linesPanel={null}
      />
    )
  }

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.inventoryAdjustments')}
      description={t('pages.inventoryAdjustments.description')}
      createLabel={t('pages.inventoryAdjustments.newButton')}
      onCreate={openCreateDialog}
      disableCreate={warehouses.length === 0}
      metrics={[
        { icon: <Inventory2RoundedIcon fontSize="small" />, label: t('pages.inventoryAdjustments.metrics.headers'), value: rows.length },
        { icon: <CheckCircleRoundedIcon fontSize="small" />, label: t('pages.inventoryAdjustments.metrics.completed'), value: rows.filter((row) => row.status === 4).length },
        { icon: <AutoGraphRoundedIcon fontSize="small" />, label: t('pages.inventoryAdjustments.metrics.active'), value: rows.filter((row) => row.isActive).length },
      ]}
      alerts={[
        ...(!warehouses.length ? [{ severity: 'warning' as const, message: t('pages.inventoryAdjustments.createWarehouseFirst') }] : []),
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
                <TableCell>Adjustment #</TableCell>
                <TableCell>Warehouse</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
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
                <TableRow key={row.id} hover selected={selectedAdjustment?.id === row.id}>
                  <TableCell>{row.adjustmentNumber}</TableCell>
                  <TableCell>{row.warehouseName ?? row.warehouseId}</TableCell>
                  <TableCell>{row.adjustmentDate}</TableCell>
                  <TableCell>{getDocumentStatusLabel(row.status)}</TableCell>
                  <TableCell>{row.reason}</TableCell>
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
                    <Typography color="text.secondary">No inventory adjustments found.</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      }
      linesPanel={
        <Paper elevation={0} className="panel-card">
          {!selectedAdjustment ? (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>Adjustment lines</Typography>
              <Typography color="text.secondary">Pick an inventory adjustment from the grid to manage its lines.</Typography>
            </>
          ) : (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6">Adjustment lines for {selectedAdjustment.adjustmentNumber}</Typography>
                  <Typography color="text.secondary">Positive deltas increase stock. Negative deltas reduce stock.</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateLine} disabled={selectedAdjustment.status !== 1 || products.length === 0}>Add line</Button>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <Chip icon={<Inventory2RoundedIcon />} label={`Status: ${getDocumentStatusLabel(selectedAdjustment.status)}`} variant="outlined" color={selectedAdjustment.status === 4 ? 'success' : 'default'} />
                <Chip icon={<AutoGraphRoundedIcon />} label={`Warehouse: ${warehouseNameById.get(selectedAdjustment.warehouseId) ?? selectedAdjustment.warehouseId}`} variant="outlined" color="primary" />
              </Stack>
              {selectedAdjustment.status !== 1 ? <Alert severity="info" sx={{ mb: 2 }}>Lines are locked once the document leaves Draft status.</Alert> : null}
              {lineError ? <Alert severity="error" sx={{ mb: 2 }}>{lineError}</Alert> : null}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">On hand</TableCell>
                      <TableCell align="right">Delta</TableCell>
                      <TableCell align="right">Unit cost</TableCell>
                      <TableCell align="right">Extended</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedAdjustment.lines.map((line) => {
                      const product = productById.get(line.productId)
                      return (
                        <TableRow key={line.id} hover>
                          <TableCell>{product ? `${product.name} (${product.sku})` : line.productId}</TableCell>
                          <TableCell align="right">{(balanceByProductId.get(line.productId) ?? 0).toFixed(2)}</TableCell>
                          <TableCell align="right">{line.quantityDelta.toFixed(2)}</TableCell>
                          <TableCell align="right">${line.unitCost.toFixed(2)}</TableCell>
                          <TableCell align="right">${(line.quantityDelta * line.unitCost).toFixed(2)}</TableCell>
                          <TableCell>{line.reason ?? '-'}</TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditLine(line)} disabled={selectedAdjustment.status !== 1}>Edit</Button>
                            <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void deleteLine(line.id)} disabled={selectedAdjustment.status !== 1}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {selectedAdjustment.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
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
          <DialogTitle>{editorMode === 'create' ? 'Create inventory adjustment' : 'Edit inventory adjustment'}</DialogTitle>
          <DialogContent dividers>
            {editorLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                {editorError ? <Alert severity="error">{editorError}</Alert> : null}
                {editorMode === 'create' ? <Alert severity="info">New inventory adjustments start in Draft status. Add lines before completing them.</Alert> : null}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Adjustment number" value={editorForm.adjustmentNumber} onChange={(event) => setEditorForm((current) => ({ ...current, adjustmentNumber: event.target.value }))} fullWidth />
                  <TextField label="Adjustment date" type="date" value={editorForm.adjustmentDate} onChange={(event) => setEditorForm((current) => ({ ...current, adjustmentDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </Stack>
                <LookupSelectField label="Warehouse" value={editorForm.warehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, warehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText="No warehouses available" />
                <TextField label="Reason" value={editorForm.reason} onChange={(event) => setEditorForm((current) => ({ ...current, reason: event.target.value }))} fullWidth />
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
            <Button variant="contained" onClick={() => void saveEditor()} disabled={editorLoading || warehouses.length === 0}>{editorMode === 'create' ? 'Create adjustment' : 'Save changes'}</Button>
          </DialogActions>
        </Dialog>
      }
      deleteDialog={
        <>
          <Dialog open={Boolean(deleteTarget)} onClose={isDeleting ? undefined : () => setDeleteTarget(null)} fullWidth maxWidth="xs">
            <DialogTitle>Delete inventory adjustment</DialogTitle>
            <DialogContent>
              <Typography color="text.secondary">{deleteTarget ? `Delete ${deleteTarget.adjustmentNumber}? This action cannot be undone.` : 'Delete this inventory adjustment?'}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button color="error" variant="contained" onClick={() => void handleDelete()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={lineOpen} onClose={lineSaving ? undefined : () => setLineOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>{lineMode === 'create' ? 'Add adjustment line' : 'Edit adjustment line'}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                {!products.length ? <Alert severity="warning">Create products before adding adjustment lines.</Alert> : null}
                {lineError ? <Alert severity="error">{lineError}</Alert> : null}
                <LookupSelectField label="Product" value={lineForm.productId} onChange={(value) => void handleLineProductChange(value)} options={products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))} disabled={!products.length} emptyText="No products available" />
                {lineAutofillHint ? <Typography variant="body2" color="text.secondary">{lineAutofillHint}</Typography> : null}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Quantity delta" type="number" value={lineForm.quantityDelta} onChange={(event) => setLineForm((current) => ({ ...current, quantityDelta: event.target.value }))} helperText="Positive increases stock. Negative decreases stock." fullWidth />
                  <TextField label="Unit cost" type="number" value={lineForm.unitCost} onChange={(event) => setLineForm((current) => ({ ...current, unitCost: event.target.value }))} fullWidth />
                </Stack>
                <TextField label="Line reason" value={lineForm.reason} onChange={(event) => setLineForm((current) => ({ ...current, reason: event.target.value }))} fullWidth />
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