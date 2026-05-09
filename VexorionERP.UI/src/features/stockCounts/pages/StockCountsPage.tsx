import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, AutoGraphRoundedIcon, CheckCircleRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon } from '@vexorion/ui'
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
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import LookupSelectField from '../../../components/LookupSelectField'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { useInventoryBalancesLookup, useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import {
  ApiError,
  createStockCount,
  createStockCountLine,
  deleteStockCount,
  deleteStockCountLine,
  getStockCount,
  getStockCounts,
  updateStockCount,
  updateStockCountLine,
} from '../../../lib/api'
import type {
  StockCountDetailsResponse,
  StockCountLineDetailsResponse,
  StockCountListItemResponse,
} from '../../../types/api'

type DialogMode = 'create' | 'edit'

type CountGridRow = StockCountListItemResponse & {
  warehouseName?: string
}

type CountFormState = {
  countNumber: string
  warehouseId: string
  countDate: string
  status: number
  notes: string
}

type CountLineFormState = {
  productId: string
  systemQuantity: string
  countedQuantity: string
}

const today = new Date().toISOString().slice(0, 10)

const defaultCountForm: CountFormState = {
  countNumber: '',
  warehouseId: '',
  countDate: today,
  status: 1,
  notes: '',
}

const defaultLineForm: CountLineFormState = {
  productId: '',
  systemQuantity: '0',
  countedQuantity: '0',
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

function buildLineForm(line: StockCountLineDetailsResponse | null): CountLineFormState {
  if (!line) {
    return defaultLineForm
  }

  return {
    productId: line.productId,
    systemQuantity: line.systemQuantity.toString(),
    countedQuantity: line.countedQuantity.toString(),
  }
}

export default function StockCountsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const { items: products, error: productsError } = useProductsLookup(Boolean(isAuthenticated))
  const { items: balances, error: balancesError } = useInventoryBalancesLookup(Boolean(isAuthenticated))
  const [rows, setRows] = useState<StockCountListItemResponse[]>([])
  const [selectedCount, setSelectedCount] = useState<StockCountDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<DialogMode>('create')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorForm, setEditorForm] = useState<CountFormState>(defaultCountForm)
  const [deleteTarget, setDeleteTarget] = useState<CountGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lineMode, setLineMode] = useState<DialogMode>('create')
  const [lineOpen, setLineOpen] = useState(false)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState<CountLineFormState>(defaultLineForm)
  const [selectedLine, setSelectedLine] = useState<StockCountLineDetailsResponse | null>(null)
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false)
  const [statusActionLoading, setStatusActionLoading] = useState(false)

  const loadRows = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [counts] = await Promise.all([getStockCounts(), reloadWarehouses()])
      setRows(counts)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load stock counts.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadWarehouses])

  const loadDetails = useCallback(async (stockCountId: string) => {
    try {
      const detail = await getStockCount(stockCountId)
      setSelectedCount(detail)
      return detail
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load stock count details.')
      return null
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const balanceByProductId = useMemo(() => {
    if (!selectedCount) {
      return new Map<string, number>()
    }

    return new Map(
      balances
        .filter((balance) => balance.warehouseId === selectedCount.warehouseId)
        .map((balance) => [balance.productId, balance.quantityOnHand]),
    )
  }, [balances, selectedCount])

  const gridRows = useMemo<CountGridRow[]>(() => rows.map((row) => ({
    ...row,
    warehouseName: warehouseNameById.get(row.warehouseId),
  })), [rows, warehouseNameById])

  const resetEditor = () => {
    setEditorError(null)
    setEditorForm(defaultCountForm)
  }

  const openCreateDialog = () => {
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: CountGridRow) => {
    setFeedback(null)
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError(null)

    try {
      const detail = await getStockCount(row.id)
      setSelectedCount(detail)
      setEditorForm({
        countNumber: detail.countNumber,
        warehouseId: detail.warehouseId,
        countDate: detail.countDate,
        status: detail.status,
        notes: detail.notes ?? '',
      })
    } catch (loadError) {
      setEditorError(loadError instanceof ApiError ? loadError.message : 'Unable to load stock count for editing.')
    } finally {
      setEditorLoading(false)
    }
  }

  const closeEditorDialog = () => {
    if (editorLoading) {
      return
    }

    setEditorOpen(false)
    setEditorError(null)
  }

  const saveHeader = async () => {
    const warehouseId = editorForm.warehouseId
    if (!warehouseId) {
      setEditorError('Warehouse is required.')
      return
    }

    setEditorLoading(true)
    setEditorError(null)

    try {
      if (editorMode === 'create') {
        const created = await createStockCount({
          countNumber: editorForm.countNumber,
          warehouseId,
          countDate: editorForm.countDate,
          notes: optionalText(editorForm.notes),
        })
        setFeedback('Stock count created.')
        setEditorOpen(false)
        await loadRows()
        await loadDetails(created.id)
      } else if (selectedCount) {
        const updated = await updateStockCount(selectedCount.id, {
          countNumber: editorForm.countNumber,
          warehouseId,
          countDate: editorForm.countDate,
          status: editorForm.status,
          notes: optionalText(editorForm.notes),
        })
        setFeedback('Stock count updated.')
        setEditorOpen(false)
        await loadRows()
        setSelectedCount(updated)
      }
    } catch (saveError) {
      setEditorError(saveError instanceof ApiError ? saveError.message : 'Unable to save stock count.')
    } finally {
      setEditorLoading(false)
    }
  }

  const openDeleteDialog = (row: CountGridRow) => {
    setFeedback(null)
    setDeleteTarget(row)
  }

  const closeDeleteDialog = () => {
    if (isDeleting) {
      return
    }

    setDeleteTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await deleteStockCount(deleteTarget.id)
      if (selectedCount?.id === deleteTarget.id) {
        setSelectedCount(null)
      }
      setDeleteTarget(null)
      setFeedback('Stock count deleted.')
      await loadRows()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete stock count.')
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateLineDialog = () => {
    if (!selectedCount || selectedCount.status !== 1) {
      return
    }

    setLineMode('create')
    setLineError(null)
    setLineForm(defaultLineForm)
    setSelectedLine(null)
    setLineOpen(true)
  }

  const openEditLineDialog = (line: StockCountLineDetailsResponse) => {
    if (!selectedCount || selectedCount.status !== 1) {
      return
    }

    setLineMode('edit')
    setLineError(null)
    setLineForm(buildLineForm(line))
    setSelectedLine(line)
    setLineOpen(true)
  }

  const closeLineDialog = () => {
    if (lineSaving) {
      return
    }

    setLineOpen(false)
    setLineError(null)
  }

  const saveLine = async () => {
    if (!selectedCount) {
      return
    }

    const productId = lineForm.productId
    if (!productId) {
      setLineError('Product is required.')
      return
    }

    const systemQuantity = Number(lineForm.systemQuantity)
    const countedQuantity = Number(lineForm.countedQuantity)

    if (!Number.isFinite(systemQuantity) || !Number.isFinite(countedQuantity)) {
      setLineError('System quantity and counted quantity must be valid numbers.')
      return
    }

    if (systemQuantity < 0 || countedQuantity < 0) {
      setLineError('System quantity and counted quantity cannot be negative.')
      return
    }

    setLineSaving(true)
    setLineError(null)

    try {
      if (lineMode === 'create') {
        await createStockCountLine(selectedCount.id, {
          productId,
          systemQuantity,
          countedQuantity,
        })
        setFeedback('Stock count line added.')
      } else if (selectedLine) {
        await updateStockCountLine(selectedCount.id, selectedLine.id, {
          productId,
          systemQuantity,
          countedQuantity,
        })
        setFeedback('Stock count line updated.')
      }

      setLineOpen(false)
      await loadDetails(selectedCount.id)
    } catch (saveError) {
      setLineError(saveError instanceof ApiError ? saveError.message : 'Unable to save stock count line.')
    } finally {
      setLineSaving(false)
    }
  }

  const deleteLine = async (line: StockCountLineDetailsResponse) => {
    if (!selectedCount) {
      return
    }

    setLineSaving(true)
    setLineError(null)

    try {
      await deleteStockCountLine(selectedCount.id, line.id)
      setFeedback('Stock count line removed.')
      await loadDetails(selectedCount.id)
    } catch (deleteError) {
      setLineError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete stock count line.')
    } finally {
      setLineSaving(false)
    }
  }

  const updateSelectedCountStatus = async (status: number, successMessage: string) => {
    if (!selectedCount) {
      return
    }

    setStatusActionLoading(true)
    setError(null)

    try {
      const updated = await updateStockCount(selectedCount.id, {
        countNumber: selectedCount.countNumber,
        warehouseId: selectedCount.warehouseId,
        countDate: selectedCount.countDate,
        status,
        notes: selectedCount.notes ?? null,
      })

      setSelectedCount(updated)
      setFeedback(successMessage)
      await loadRows()
    } catch (statusError) {
      setError(statusError instanceof ApiError ? statusError.message : 'Unable to update stock count status.')
    } finally {
      setStatusActionLoading(false)
    }
  }

  const confirmPost = async () => {
    await updateSelectedCountStatus(4, 'Stock count posted.')
    setPostDialogOpen(false)
  }

  const confirmReverse = async () => {
    await updateSelectedCountStatus(5, 'Stock count reversed.')
    setReverseDialogOpen(false)
  }

  const alerts: Array<{ severity: 'warning' | 'error' | 'success' | 'info', message: string }> = []
  if (error) alerts.push({ severity: 'error', message: error })
  if (feedback) alerts.push({ severity: 'success', message: feedback })
  if (warehousesError) alerts.push({ severity: 'warning', message: warehousesError })
  if (productsError) alerts.push({ severity: 'warning', message: productsError })
  if (balancesError) alerts.push({ severity: 'warning', message: balancesError })

  const metrics = useMemo(() => {
    const total = rows.length
    const completed = rows.filter((row) => row.status === 4).length
    const active = rows.filter((row) => row.isActive).length

    return [
      { icon: <FormatListBulletedRoundedIcon color="primary" />, label: t('pages.stockCounts.metrics.totalCounts'), value: total },
      { icon: <CheckCircleRoundedIcon color="success" />, label: t('pages.stockCounts.metrics.completed'), value: completed },
      { icon: <AutoGraphRoundedIcon color="info" />, label: t('pages.stockCounts.metrics.active'), value: active },
    ]
  }, [rows, t])

  const canPost = Boolean(selectedCount && selectedCount.status === 1 && selectedCount.lines.length > 0)
  const canReverse = Boolean(selectedCount && selectedCount.status === 4)

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.stockCounts')}
      description={t('pages.stockCounts.description')}
      createLabel={t('pages.stockCounts.newButton')}
      onCreate={openCreateDialog}
      metrics={metrics}
      alerts={alerts}
      grid={(
        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Count number</TableCell>
                <TableCell>Warehouse</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">Loading stock counts...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : gridRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">No stock counts available.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                gridRows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    selected={selectedCount?.id === row.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      setFeedback(null)
                      void loadDetails(row.id)
                    }}
                  >
                    <TableCell>{row.countNumber}</TableCell>
                    <TableCell>{row.warehouseName ?? row.warehouseId}</TableCell>
                    <TableCell>{row.countDate}</TableCell>
                    <TableCell>
                      <Chip size="small" label={getDocumentStatusLabel(row.status)} color={row.status === 4 ? 'success' : row.status === 5 ? 'default' : 'primary'} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button size="small" startIcon={<EditRoundedIcon />} onClick={(event) => { event.stopPropagation(); void openEditDialog(row) }}>
                          Edit
                        </Button>
                        <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={(event) => { event.stopPropagation(); openDeleteDialog(row) }}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      linesPanel={(
        <Paper elevation={0} className="panel-card">
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', mb: 2 }} spacing={1.5}>
            <Box>
              <Typography variant="h6">Count lines</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCount
                  ? `Lines for ${selectedCount.countNumber} (${getDocumentStatusLabel(selectedCount.status)})`
                  : 'Select a stock count to manage lines.'}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" color="success" onClick={() => setPostDialogOpen(true)} disabled={!canPost || statusActionLoading}>
                Post
              </Button>
              <Button variant="outlined" color="warning" onClick={() => setReverseDialogOpen(true)} disabled={!canReverse || statusActionLoading}>
                Reverse
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={openCreateLineDialog}
                disabled={!selectedCount || selectedCount.status !== 1}
              >
                Add line
              </Button>
            </Stack>
          </Stack>

          {!selectedCount ? (
            <Alert severity="info">Choose a stock count from the list to view lines.</Alert>
          ) : selectedCount.lines.length === 0 ? (
            <Alert severity="warning">No lines yet. Add at least one line before completing the document.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">System qty</TableCell>
                    <TableCell align="right">Counted qty</TableCell>
                    <TableCell align="right">Variance</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedCount.lines.map((line) => {
                    const product = productById.get(line.productId)
                    const variance = line.countedQuantity - line.systemQuantity
                    return (
                      <TableRow key={line.id}>
                        <TableCell>{product ? `${product.sku} · ${product.name}` : line.productId}</TableCell>
                        <TableCell align="right">{line.systemQuantity.toFixed(2)}</TableCell>
                        <TableCell align="right">{line.countedQuantity.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ color: variance === 0 ? 'text.secondary' : variance > 0 ? 'success.main' : 'error.main' }}>
                          {variance.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button size="small" startIcon={<EditRoundedIcon />} disabled={selectedCount.status !== 1} onClick={() => openEditLineDialog(line)}>
                              Edit
                            </Button>
                            <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={selectedCount.status !== 1} onClick={() => void deleteLine(line)}>
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      editor={(
        <>
          <Dialog open={editorOpen} onClose={closeEditorDialog} fullWidth maxWidth="sm">
            <DialogTitle>{editorMode === 'create' ? 'Create stock count' : 'Edit stock count'}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {editorError ? <Alert severity="error">{editorError}</Alert> : null}
                <TextField
                  label="Count number"
                  value={editorForm.countNumber}
                  onChange={(event) => setEditorForm((current) => ({ ...current, countNumber: event.target.value }))}
                  disabled={editorLoading}
                  required
                  fullWidth
                />
                <LookupSelectField
                  label="Warehouse"
                  options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
                  value={editorForm.warehouseId}
                  onChange={(value) => setEditorForm((current) => ({ ...current, warehouseId: value }))}
                  disabled={editorLoading}
                />
                <TextField
                  label="Count date"
                  type="date"
                  value={editorForm.countDate}
                  onChange={(event) => setEditorForm((current) => ({ ...current, countDate: event.target.value }))}
                  disabled={editorLoading}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                  fullWidth
                />
                <TextField
                  select
                  label="Status"
                  value={editorForm.status}
                  onChange={(event) => setEditorForm((current) => ({ ...current, status: Number(event.target.value) }))}
                  disabled={editorLoading}
                  fullWidth
                >
                  {documentStatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Notes"
                  value={editorForm.notes}
                  onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))}
                  disabled={editorLoading}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeEditorDialog} disabled={editorLoading}>Cancel</Button>
              <Button onClick={() => void saveHeader()} disabled={editorLoading} variant="contained">
                {editorLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={lineOpen} onClose={closeLineDialog} fullWidth maxWidth="sm">
            <DialogTitle>{lineMode === 'create' ? 'Add stock count line' : 'Edit stock count line'}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {lineError ? <Alert severity="error">{lineError}</Alert> : null}
                <LookupSelectField
                  label="Product"
                  options={products.map((product) => ({ value: product.id, label: `${product.sku} · ${product.name}` }))}
                  value={lineForm.productId}
                  onChange={(value) => {
                    const suggestedSystem = balanceByProductId.get(value)
                    setLineForm((current) => ({
                      ...current,
                      productId: value,
                      systemQuantity: suggestedSystem !== undefined ? suggestedSystem.toString() : current.systemQuantity,
                    }))
                  }}
                  disabled={lineSaving}
                />
                <TextField
                  label="System quantity"
                  type="number"
                  value={lineForm.systemQuantity}
                  onChange={(event) => setLineForm((current) => ({ ...current, systemQuantity: event.target.value }))}
                  disabled={lineSaving}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  fullWidth
                />
                <TextField
                  label="Counted quantity"
                  type="number"
                  value={lineForm.countedQuantity}
                  onChange={(event) => setLineForm((current) => ({ ...current, countedQuantity: event.target.value }))}
                  disabled={lineSaving}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  fullWidth
                />
                <TextField
                  label="Variance"
                  value={(Number(lineForm.countedQuantity || 0) - Number(lineForm.systemQuantity || 0)).toFixed(2)}
                  slotProps={{ htmlInput: { readOnly: true } }}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeLineDialog} disabled={lineSaving}>Cancel</Button>
              <Button onClick={() => void saveLine()} disabled={lineSaving} variant="contained">
                {lineSaving ? 'Saving...' : 'Save line'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={postDialogOpen} onClose={() => setPostDialogOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>Post stock count</DialogTitle>
            <DialogContent>
              <Typography>
                Confirm posting this stock count to apply variance movements to inventory balances?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPostDialogOpen(false)} disabled={statusActionLoading}>Cancel</Button>
              <Button onClick={() => void confirmPost()} disabled={statusActionLoading} color="success" variant="contained">
                {statusActionLoading ? 'Posting...' : 'Post'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={reverseDialogOpen} onClose={() => setReverseDialogOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>Reverse stock count</DialogTitle>
            <DialogContent>
              <Typography>
                Confirm reversing this stock count to post compensating movements?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReverseDialogOpen(false)} disabled={statusActionLoading}>Cancel</Button>
              <Button onClick={() => void confirmReverse()} disabled={statusActionLoading} color="warning" variant="contained">
                {statusActionLoading ? 'Reversing...' : 'Reverse'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
      deleteDialog={(
        <Dialog open={Boolean(deleteTarget)} onClose={closeDeleteDialog} fullWidth maxWidth="xs">
          <DialogTitle>Delete stock count</DialogTitle>
          <DialogContent>
            <Typography>
              Delete {deleteTarget?.countNumber}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} disabled={isDeleting}>Cancel</Button>
            <Button onClick={() => void confirmDelete()} disabled={isDeleting} color="error" variant="contained">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    />
  )
}
