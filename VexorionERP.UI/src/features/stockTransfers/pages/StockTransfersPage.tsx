import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, AutoGraphRoundedIcon, CheckCircleRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon, WarehouseRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import { useCurrency } from '../../../app/CurrencyContext'
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
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.inventory.manage) ?? false
  const canViewProducts = user?.permissions.includes(Permissions.products.view) ?? false
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const { items: products, error: productsError } = useProductsLookup(Boolean(isAuthenticated && canViewProducts))
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
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: TransferGridRow) => {
    if (!canManage) return
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
    if (!canManage) return
    setLineMode('create')
    setSelectedLine(null)
    setLineForm(defaultLineForm)
    setLineError(null)
    setLineAutofillHint(null)
    setLineOpen(true)
  }

  const openEditLine = (line: StockTransferLineDetailsResponse) => {
    if (!canManage) return
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
        title={t('nav.routeTitles.stockTransfers')}
        description={t('pages.stockTransfers.descriptionShort')}
        createLabel={t('pages.stockTransfers.newButton')}
        onCreate={() => undefined}
        disableCreate
        metrics={[]}
        alerts={[{ severity: 'info', message: t('pages.stockTransfers.signInRequired') }]}
        grid={null}
        linesPanel={null}
      />
    )
  }

  return (
    <OrderWorkspace
      title={t('nav.routeTitles.stockTransfers')}
      description={t('pages.stockTransfers.description')}
      createLabel={t('pages.stockTransfers.newButton')}
      onCreate={openCreateDialog}
      showCreate={canManage}
      disableCreate={warehouses.length < 2}
      metrics={[
        { icon: <WarehouseRoundedIcon fontSize="small" />, label: t('pages.stockTransfers.metrics.headers'), value: rows.length },
        { icon: <CheckCircleRoundedIcon fontSize="small" />, label: t('pages.stockTransfers.metrics.completed'), value: rows.filter((row) => row.status === 4).length },
        { icon: <AutoGraphRoundedIcon fontSize="small" />, label: t('pages.stockTransfers.metrics.active'), value: rows.filter((row) => row.isActive).length },
      ]}
      alerts={[
        ...(!canManage ? [{ severity: 'info' as const, message: t('authorization.readOnly', { requiredPermission: Permissions.inventory.manage }) }] : []),
        ...(warehouses.length < 2 ? [{ severity: 'warning' as const, message: t('pages.stockTransfers.createWarehousesFirst') }] : []),
        ...(warehousesError ? [{ severity: 'warning' as const, message: warehousesError }] : []),
        ...(productsError ? [{ severity: 'warning' as const, message: productsError }] : []),
        ...(balancesError ? [{ severity: 'warning' as const, message: balancesError }] : []),
        ...(error ? [{ severity: 'error' as const, message: error }] : []),
        ...(feedback ? [{ severity: 'success' as const, message: feedback }] : []),
      ]}
      grid={
        <VxTableContainer>
          <VxTable size="small">
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>Transfer #</VxTableCell>
                <VxTableCell>Source</VxTableCell>
                <VxTableCell>Destination</VxTableCell>
                <VxTableCell>Date</VxTableCell>
                <VxTableCell>Status</VxTableCell>
                <VxTableCell align="right">Actions</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {isLoading ? (
                <VxTableRow>
                  <VxTableCell colSpan={6}>
                    <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
                      <VxCircularProgress size={28} />
                    </VxBox>
                  </VxTableCell>
                </VxTableRow>
              ) : null}
              {!isLoading && gridRows.map((row) => (
                <VxTableRow key={row.id} hover selected={selectedTransfer?.id === row.id}>
                  <VxTableCell>{row.transferNumber}</VxTableCell>
                  <VxTableCell>{row.sourceWarehouseName ?? row.sourceWarehouseId}</VxTableCell>
                  <VxTableCell>{row.destinationWarehouseName ?? row.destinationWarehouseId}</VxTableCell>
                  <VxTableCell>{row.transferDate}</VxTableCell>
                  <VxTableCell>{getDocumentStatusLabel(row.status)}</VxTableCell>
                  <VxTableCell align="right">
                    <VxButton size="small" startIcon={<FormatListBulletedRoundedIcon />} onClick={() => void loadDetails(row.id)}>Lines</VxButton>
                    {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => void openEditDialog(row)}>Edit</VxButton>
                    <VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setDeleteTarget(row)}>Delete</VxButton></> : null}
                  </VxTableCell>
                </VxTableRow>
              ))}
              {!isLoading && gridRows.length === 0 ? (
                <VxTableRow>
                  <VxTableCell colSpan={6}>
                    <VxTypography color="text.secondary">No stock transfers found.</VxTypography>
                  </VxTableCell>
                </VxTableRow>
              ) : null}
            </VxTableBody>
          </VxTable>
        </VxTableContainer>
      }
      linesPanel={
        <VxPaper elevation={0} className="panel-card">
          {!selectedTransfer ? (
            <>
              <VxTypography variant="h6" sx={{ mb: 1 }}>Transfer lines</VxTypography>
              <VxTypography color="text.secondary">Pick a stock transfer from the grid to manage its lines.</VxTypography>
            </>
          ) : (
            <>
              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <VxBox>
                  <VxTypography variant="h6">Transfer lines for {selectedTransfer.transferNumber}</VxTypography>
                  <VxTypography color="text.secondary">Each line reduces source stock and increases destination stock on completion.</VxTypography>
                </VxBox>
                {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateLine} disabled={selectedTransfer.status !== 1 || products.length === 0}>Add line</VxButton> : null}
              </VxStack>
              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <VxChip icon={<WarehouseRoundedIcon />} label={`Source: ${warehouseNameById.get(selectedTransfer.sourceWarehouseId) ?? selectedTransfer.sourceWarehouseId}`} variant="outlined" color="primary" />
                <VxChip icon={<WarehouseRoundedIcon />} label={`Destination: ${warehouseNameById.get(selectedTransfer.destinationWarehouseId) ?? selectedTransfer.destinationWarehouseId}`} variant="outlined" color="secondary" />
              </VxStack>
              {selectedTransfer.status !== 1 ? <VxAlert severity="info" sx={{ mb: 2 }}>Lines are locked once the transfer leaves Draft status.</VxAlert> : null}
              {lineError ? <VxAlert severity="error" sx={{ mb: 2 }}>{lineError}</VxAlert> : null}
              <VxTableContainer>
                <VxTable size="small">
                  <VxTableHead>
                    <VxTableRow>
                      <VxTableCell>Product</VxTableCell>
                      <VxTableCell align="right">Source on hand</VxTableCell>
                      <VxTableCell align="right">Qty</VxTableCell>
                      <VxTableCell align="right">Unit cost</VxTableCell>
                      <VxTableCell align="right">Extended</VxTableCell>
                      <VxTableCell align="right">Actions</VxTableCell>
                    </VxTableRow>
                  </VxTableHead>
                  <VxTableBody>
                    {selectedTransfer.lines.map((line) => {
                      const product = productById.get(line.productId)
                      return (
                        <VxTableRow key={line.id} hover>
                          <VxTableCell>{product ? `${product.name} (${product.sku})` : line.productId}</VxTableCell>
                          <VxTableCell align="right">{(sourceBalanceByProductId.get(line.productId) ?? 0).toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">{line.quantity.toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">${line.unitCost.toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">${(line.quantity * line.unitCost).toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">
                            {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditLine(line)} disabled={selectedTransfer.status !== 1}>Edit</VxButton>
                            <VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void deleteLine(line.id)} disabled={selectedTransfer.status !== 1}>Delete</VxButton></> : null}
                          </VxTableCell>
                        </VxTableRow>
                      )
                    })}
                    {selectedTransfer.lines.length === 0 ? (
                      <VxTableRow>
                        <VxTableCell colSpan={6}>
                          <VxTypography color="text.secondary">No lines yet.</VxTypography>
                        </VxTableCell>
                      </VxTableRow>
                    ) : null}
                  </VxTableBody>
                </VxTable>
              </VxTableContainer>
            </>
          )}
        </VxPaper>
      }
      editor={
        <VxDialog open={canManage && editorOpen} onClose={editorLoading ? undefined : () => setEditorOpen(false)} fullWidth maxWidth="md">
          <VxDialogTitle>{editorMode === 'create' ? 'Create stock transfer' : 'Edit stock transfer'}</VxDialogTitle>
          <VxDialogContent dividers>
            {editorLoading ? (
              <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                <VxCircularProgress size={28} />
              </VxBox>
            ) : (
              <VxStack spacing={2.5} sx={{ pt: 1 }}>
                {editorError ? <VxAlert severity="error">{editorError}</VxAlert> : null}
                {editorMode === 'create' ? <VxAlert severity="info">New stock transfers start in Draft status. Add lines before completing them.</VxAlert> : null}
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <VxTextField label="Transfer number" value={editorForm.transferNumber} onChange={(event) => setEditorForm((current) => ({ ...current, transferNumber: event.target.value }))} fullWidth />
                  <VxTextField label="Transfer date" type="date" value={editorForm.transferDate} onChange={(event) => setEditorForm((current) => ({ ...current, transferDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </VxStack>
                <LookupSelectField label="Source warehouse" value={editorForm.sourceWarehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, sourceWarehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText="No warehouses available" />
                <LookupSelectField label="Destination warehouse" value={editorForm.destinationWarehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, destinationWarehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText="No warehouses available" />
                {editorMode === 'edit' ? (
                  <VxTextField select label="Status" value={editorForm.status} onChange={(event) => setEditorForm((current) => ({ ...current, status: Number(event.target.value) }))} fullWidth>
                    {documentStatusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
                  </VxTextField>
                ) : null}
                <VxTextField label="Notes" value={editorForm.notes} onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth />
              </VxStack>
            )}
          </VxDialogContent>
          <VxDialogActions sx={{ px: 3, py: 2 }}>
            <VxButton onClick={() => setEditorOpen(false)} disabled={editorLoading}>Cancel</VxButton>
            <VxButton variant="contained" onClick={() => void saveEditor()} disabled={editorLoading || warehouses.length < 2}>{editorMode === 'create' ? 'Create transfer' : 'Save changes'}</VxButton>
          </VxDialogActions>
        </VxDialog>
      }
      deleteDialog={
        <>
          <VxDialog open={canManage && Boolean(deleteTarget)} onClose={isDeleting ? undefined : () => setDeleteTarget(null)} fullWidth maxWidth="xs">
            <VxDialogTitle>Delete stock transfer</VxDialogTitle>
            <VxDialogContent>
              <VxTypography color="text.secondary">{deleteTarget ? `Delete ${deleteTarget.transferNumber}? This action cannot be undone.` : 'Delete this stock transfer?'}</VxTypography>
            </VxDialogContent>
            <VxDialogActions sx={{ px: 3, py: 2 }}>
              <VxButton onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</VxButton>
              <VxButton color="error" variant="contained" onClick={() => void handleDelete()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</VxButton>
            </VxDialogActions>
          </VxDialog>
          <VxDialog open={canManage && lineOpen} onClose={lineSaving ? undefined : () => setLineOpen(false)} fullWidth maxWidth="sm">
            <VxDialogTitle>{lineMode === 'create' ? 'Add transfer line' : 'Edit transfer line'}</VxDialogTitle>
            <VxDialogContent dividers>
              <VxStack spacing={2.5} sx={{ pt: 1 }}>
                {!products.length ? <VxAlert severity="warning">Create products before adding transfer lines.</VxAlert> : null}
                {lineError ? <VxAlert severity="error">{lineError}</VxAlert> : null}
                <LookupSelectField label="Product" value={lineForm.productId} onChange={(value) => void handleLineProductChange(value)} options={products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))} disabled={!products.length} emptyText="No products available" />
                {lineAutofillHint ? <VxTypography variant="body2" color="text.secondary">{lineAutofillHint}</VxTypography> : null}
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <VxTextField label="Quantity" type="number" value={lineForm.quantity} onChange={(event) => setLineForm((current) => ({ ...current, quantity: event.target.value }))} fullWidth />
                  <VxTextField label="Unit cost" type="number" value={lineForm.unitCost} onChange={(event) => setLineForm((current) => ({ ...current, unitCost: event.target.value }))} fullWidth />
                </VxStack>
              </VxStack>
            </VxDialogContent>
            <VxDialogActions sx={{ px: 3, py: 2 }}>
              <VxButton onClick={() => setLineOpen(false)} disabled={lineSaving}>Cancel</VxButton>
              <VxButton variant="contained" onClick={() => void saveLine()} disabled={lineSaving || !products.length}>{lineSaving ? 'Saving...' : lineMode === 'create' ? 'Add line' : 'Save line'}</VxButton>
            </VxDialogActions>
          </VxDialog>
        </>
      }
    />
  )
}
