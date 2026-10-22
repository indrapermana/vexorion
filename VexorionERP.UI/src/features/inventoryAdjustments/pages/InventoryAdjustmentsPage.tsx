import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, AutoGraphRoundedIcon, CheckCircleRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon, Inventory2RoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxConfirmActionButton, VxConfirmActionDialog, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
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
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.inventory.manage) ?? false
  const canViewProducts = user?.permissions.includes(Permissions.products.view) ?? false
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const { items: products, error: productsError } = useProductsLookup(Boolean(isAuthenticated && canViewProducts))
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
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: AdjustmentGridRow) => {
    if (!canManage) return
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
      showCreate={canManage}
      disableCreate={warehouses.length === 0}
      metrics={[
        { icon: <Inventory2RoundedIcon fontSize="small" />, label: t('pages.inventoryAdjustments.metrics.headers'), value: rows.length },
        { icon: <CheckCircleRoundedIcon fontSize="small" />, label: t('pages.inventoryAdjustments.metrics.completed'), value: rows.filter((row) => row.status === 4).length },
        { icon: <AutoGraphRoundedIcon fontSize="small" />, label: t('pages.inventoryAdjustments.metrics.active'), value: rows.filter((row) => row.isActive).length },
      ]}
      alerts={[
        ...(!canManage ? [{ severity: 'info' as const, message: t('authorization.readOnly', { requiredPermission: Permissions.inventory.manage }) }] : []),
        ...(!warehouses.length ? [{ severity: 'warning' as const, message: t('pages.inventoryAdjustments.createWarehouseFirst') }] : []),
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
                <VxTableCell>Adjustment #</VxTableCell>
                <VxTableCell>Warehouse</VxTableCell>
                <VxTableCell>Date</VxTableCell>
                <VxTableCell>Status</VxTableCell>
                <VxTableCell>Reason</VxTableCell>
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
                <VxTableRow key={row.id} hover selected={selectedAdjustment?.id === row.id}>
                  <VxTableCell>{row.adjustmentNumber}</VxTableCell>
                  <VxTableCell>{row.warehouseName ?? row.warehouseId}</VxTableCell>
                  <VxTableCell>{row.adjustmentDate}</VxTableCell>
                  <VxTableCell>{getDocumentStatusLabel(row.status)}</VxTableCell>
                  <VxTableCell>{row.reason}</VxTableCell>
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
                    <VxTypography color="text.secondary">No inventory adjustments found.</VxTypography>
                  </VxTableCell>
                </VxTableRow>
              ) : null}
            </VxTableBody>
          </VxTable>
        </VxTableContainer>
      }
      linesPanel={
        <VxPaper elevation={0} className="panel-card">
          {!selectedAdjustment ? (
            <>
              <VxTypography variant="h6" sx={{ mb: 1 }}>Adjustment lines</VxTypography>
              <VxTypography color="text.secondary">Pick an inventory adjustment from the grid to manage its lines.</VxTypography>
            </>
          ) : (
            <>
              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <VxBox>
                  <VxTypography variant="h6">Adjustment lines for {selectedAdjustment.adjustmentNumber}</VxTypography>
                  <VxTypography color="text.secondary">Positive deltas increase stock. Negative deltas reduce stock.</VxTypography>
                </VxBox>
                {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateLine} disabled={selectedAdjustment.status !== 1 || products.length === 0}>Add line</VxButton> : null}
              </VxStack>
              <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <VxChip icon={<Inventory2RoundedIcon />} label={`Status: ${getDocumentStatusLabel(selectedAdjustment.status)}`} variant="outlined" color={selectedAdjustment.status === 4 ? 'success' : 'default'} />
                <VxChip icon={<AutoGraphRoundedIcon />} label={`Warehouse: ${warehouseNameById.get(selectedAdjustment.warehouseId) ?? selectedAdjustment.warehouseId}`} variant="outlined" color="primary" />
              </VxStack>
              {selectedAdjustment.status !== 1 ? <VxAlert severity="info" sx={{ mb: 2 }}>Lines are locked once the document leaves Draft status.</VxAlert> : null}
              {lineError ? <VxAlert severity="error" sx={{ mb: 2 }}>{lineError}</VxAlert> : null}
              <VxTableContainer>
                <VxTable size="small">
                  <VxTableHead>
                    <VxTableRow>
                      <VxTableCell>Product</VxTableCell>
                      <VxTableCell align="right">On hand</VxTableCell>
                      <VxTableCell align="right">Delta</VxTableCell>
                      <VxTableCell align="right">Unit cost</VxTableCell>
                      <VxTableCell align="right">Extended</VxTableCell>
                      <VxTableCell>Reason</VxTableCell>
                      <VxTableCell align="right">Actions</VxTableCell>
                    </VxTableRow>
                  </VxTableHead>
                  <VxTableBody>
                    {selectedAdjustment.lines.map((line) => {
                      const product = productById.get(line.productId)
                      return (
                        <VxTableRow key={line.id} hover>
                          <VxTableCell>{product ? `${product.name} (${product.sku})` : line.productId}</VxTableCell>
                          <VxTableCell align="right">{(balanceByProductId.get(line.productId) ?? 0).toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">{line.quantityDelta.toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">${line.unitCost.toFixed(2)}</VxTableCell>
                          <VxTableCell align="right">${(line.quantityDelta * line.unitCost).toFixed(2)}</VxTableCell>
                          <VxTableCell>{line.reason ?? '-'}</VxTableCell>
                          <VxTableCell align="right">
                            {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEditLine(line)} disabled={selectedAdjustment.status !== 1}>Edit</VxButton>
                            <VxConfirmActionButton
                              title="Delete adjustment line"
                              targetName={product ? `${product.name} (${product.sku})` : line.productId}
                              consequence={`This removes the line from adjustment ${selectedAdjustment.adjustmentNumber} and recalculates its totals.`}
                              confirmLabel="Delete line"
                              pendingLabel="Deleting..."
                              onConfirm={() => deleteLine(line.id)}
                              buttonProps={{ size: 'small', color: 'error', startIcon: <DeleteOutlineRoundedIcon />, disabled: selectedAdjustment.status !== 1 }}
                            >Delete</VxConfirmActionButton></> : null}
                          </VxTableCell>
                        </VxTableRow>
                      )
                    })}
                    {selectedAdjustment.lines.length === 0 ? (
                      <VxTableRow>
                        <VxTableCell colSpan={7}>
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
          <VxDialogTitle>{editorMode === 'create' ? 'Create inventory adjustment' : 'Edit inventory adjustment'}</VxDialogTitle>
          <VxDialogContent dividers>
            {editorLoading ? (
              <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                <VxCircularProgress size={28} />
              </VxBox>
            ) : (
              <VxStack spacing={2.5} sx={{ pt: 1 }}>
                {editorError ? <VxAlert severity="error">{editorError}</VxAlert> : null}
                {editorMode === 'create' ? <VxAlert severity="info">New inventory adjustments start in Draft status. Add lines before completing them.</VxAlert> : null}
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <VxTextField label="Adjustment number" value={editorForm.adjustmentNumber} onChange={(event) => setEditorForm((current) => ({ ...current, adjustmentNumber: event.target.value }))} fullWidth />
                  <VxTextField label="Adjustment date" type="date" value={editorForm.adjustmentDate} onChange={(event) => setEditorForm((current) => ({ ...current, adjustmentDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </VxStack>
                <LookupSelectField label="Warehouse" value={editorForm.warehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, warehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText="No warehouses available" />
                <VxTextField label="Reason" value={editorForm.reason} onChange={(event) => setEditorForm((current) => ({ ...current, reason: event.target.value }))} fullWidth />
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
            <VxButton variant="contained" onClick={() => void saveEditor()} disabled={editorLoading || warehouses.length === 0}>{editorMode === 'create' ? 'Create adjustment' : 'Save changes'}</VxButton>
          </VxDialogActions>
        </VxDialog>
      }
      deleteDialog={
        <>
          <VxConfirmActionDialog open={canManage && Boolean(deleteTarget)} title="Delete inventory adjustment" targetName={deleteTarget?.adjustmentNumber ?? ''} consequence="This permanently removes the draft adjustment and its lines. Completed adjustments cannot be deleted." confirmLabel="Delete adjustment" pendingLabel="Deleting..." pending={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
          <VxDialog open={canManage && lineOpen} onClose={lineSaving ? undefined : () => setLineOpen(false)} fullWidth maxWidth="sm">
            <VxDialogTitle>{lineMode === 'create' ? 'Add adjustment line' : 'Edit adjustment line'}</VxDialogTitle>
            <VxDialogContent dividers>
              <VxStack spacing={2.5} sx={{ pt: 1 }}>
                {!products.length ? <VxAlert severity="warning">Create products before adding adjustment lines.</VxAlert> : null}
                {lineError ? <VxAlert severity="error">{lineError}</VxAlert> : null}
                <LookupSelectField label="Product" value={lineForm.productId} onChange={(value) => void handleLineProductChange(value)} options={products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))} disabled={!products.length} emptyText="No products available" />
                {lineAutofillHint ? <VxTypography variant="body2" color="text.secondary">{lineAutofillHint}</VxTypography> : null}
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <VxTextField label="Quantity delta" type="number" value={lineForm.quantityDelta} onChange={(event) => setLineForm((current) => ({ ...current, quantityDelta: event.target.value }))} helperText="Positive increases stock. Negative decreases stock." fullWidth />
                  <VxTextField label="Unit cost" type="number" value={lineForm.unitCost} onChange={(event) => setLineForm((current) => ({ ...current, unitCost: event.target.value }))} fullWidth />
                </VxStack>
                <VxTextField label="Line reason" value={lineForm.reason} onChange={(event) => setLineForm((current) => ({ ...current, reason: event.target.value }))} fullWidth />
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
