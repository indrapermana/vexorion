import { useCallback, useEffect, useMemo, useState } from 'react'
import { AutoGraphRoundedIcon, CheckCircleRoundedIcon, Inventory2RoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxStack, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import { useCurrency } from '../../../app/CurrencyContext'
import LookupSelectField from '../../../components/LookupSelectField'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { useInventoryBalancesLookup, useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import InventoryAdjustmentDetail from '../components/InventoryAdjustmentDetail'
import InventoryAdjustmentLineEditor, { type AdjustmentLineForm } from '../components/InventoryAdjustmentLineEditor'
import InventoryAdjustmentList, { type InventoryAdjustmentListRow } from '../components/InventoryAdjustmentList'
import InventoryAdjustmentStateActions from '../components/InventoryAdjustmentStateActions'
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

type AdjustmentFormState = {
  adjustmentNumber: string
  warehouseId: string
  adjustmentDate: string
  status: number
  reason: string
  notes: string
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

const defaultLineForm: AdjustmentLineForm = {
  productId: '',
  quantityDelta: '0',
  unitCost: '0',
  reason: '',
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function buildLineForm(line: InventoryAdjustmentLineDetailsResponse | null): AdjustmentLineForm {
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
  const getDocumentStatusLabel = (status: number) => status >= 1 && status <= 5
    ? t(`common.documentStatuses.${status}`)
    : t('pages.inventoryAdjustments.table.unknownStatus', { status })
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
  const [editorSaving, setEditorSaving] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorForm, setEditorForm] = useState<AdjustmentFormState>(defaultAdjustmentForm)
  const [initialEditorForm, setInitialEditorForm] = useState<AdjustmentFormState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryAdjustmentListRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lineMode, setLineMode] = useState<DialogMode>('create')
  const [lineOpen, setLineOpen] = useState(false)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState<AdjustmentLineForm>(defaultLineForm)
  const [initialLineForm, setInitialLineForm] = useState<AdjustmentLineForm | null>(null)
  const [selectedLine, setSelectedLine] = useState<InventoryAdjustmentLineDetailsResponse | null>(null)
  const [lineAutofillHint, setLineAutofillHint] = useState<string | null>(null)
  const { requestClose: requestEditorClose, confirmationDialog: editorDiscardDialog } = useUnsavedChangesPrompt(
    canManage && editorOpen && Boolean(initialEditorForm && JSON.stringify(editorForm) !== JSON.stringify(initialEditorForm)),
    editorLoading || editorSaving,
    () => setEditorOpen(false),
    () => setEditorForm(initialEditorForm ?? defaultAdjustmentForm),
  )
  const { requestClose: requestLineClose, confirmationDialog: lineDiscardDialog } = useUnsavedChangesPrompt(
    canManage && lineOpen && Boolean(initialLineForm && JSON.stringify(lineForm) !== JSON.stringify(initialLineForm)),
    lineSaving,
    () => setLineOpen(false),
    () => setLineForm(initialLineForm ?? defaultLineForm),
  )

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
      setError(loadError instanceof ApiError ? loadError.message : t('pages.inventoryAdjustments.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadWarehouses, t])

  const loadDetails = useCallback(async (adjustmentId: string) => {
    try {
      const detail = await getInventoryAdjustment(adjustmentId)
      setSelectedAdjustment(detail)
      return detail
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.inventoryAdjustments.errors.loadDetails'))
      return null
    }
  }, [t])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
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
  const gridRows = useMemo<InventoryAdjustmentListRow[]>(() => rows.map((row) => ({
    ...row,
    warehouseName: warehouseNameById.get(row.warehouseId),
  })), [rows, warehouseNameById])

  const resetEditor = () => {
    setEditorError(null)
    setEditorForm(defaultAdjustmentForm)
    setInitialEditorForm(defaultAdjustmentForm)
  }

  const openCreateDialog = () => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: InventoryAdjustmentListRow) => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError(null)
    setInitialEditorForm(null)

    try {
      const detail = await getInventoryAdjustment(row.id)
      setSelectedAdjustment(detail)
      const nextForm = {
        adjustmentNumber: detail.adjustmentNumber,
        warehouseId: detail.warehouseId,
        adjustmentDate: detail.adjustmentDate,
        status: detail.status,
        reason: detail.reason,
        notes: detail.notes ?? '',
      }
      setEditorForm(nextForm)
      setInitialEditorForm(nextForm)
    } catch (loadError) {
      setEditorError(loadError instanceof ApiError ? loadError.message : t('pages.inventoryAdjustments.errors.loadDetails'))
    } finally {
      setEditorLoading(false)
    }
  }

  const saveEditor = async () => {
    setEditorError(null)

    if (!editorForm.adjustmentNumber.trim() || !editorForm.warehouseId || !editorForm.adjustmentDate || !editorForm.reason.trim()) {
      setEditorError(t('pages.inventoryAdjustments.validation.headerRequired'))
      return
    }

    setEditorSaving(true)
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
      setFeedback(t(editorMode === 'create' ? 'pages.inventoryAdjustments.feedback.created' : 'pages.inventoryAdjustments.feedback.updated', { number: saved.adjustmentNumber }))
      await loadRows()
    } catch (saveError) {
      setEditorError(saveError instanceof ApiError ? saveError.message : t('pages.inventoryAdjustments.errors.save'))
    } finally {
      setEditorSaving(false)
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
      setFeedback(t('pages.inventoryAdjustments.feedback.deleted', { number: deleteTarget.adjustmentNumber }))
      await loadRows()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.inventoryAdjustments.errors.delete'))
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateLine = () => {
    setLineMode('create')
    setSelectedLine(null)
    setLineForm(defaultLineForm)
    setInitialLineForm(defaultLineForm)
    setLineError(null)
    setLineAutofillHint(null)
    setLineOpen(true)
  }

  const openEditLine = (line: InventoryAdjustmentLineDetailsResponse) => {
    setLineMode('edit')
    setSelectedLine(line)
    const nextForm = buildLineForm(line)
    setLineForm(nextForm)
    setInitialLineForm(nextForm)
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
      setLineAutofillHint(t('pages.inventoryAdjustments.feedback.autoFilledCost', { amount: formatMoney(product.standardCost) }))
    } catch (loadError) {
      setLineAutofillHint(loadError instanceof ApiError ? loadError.message : t('pages.inventoryAdjustments.errors.autoFill'))
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
      setLineError(t('pages.inventoryAdjustments.validation.lineRequired'))
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
      setInitialLineForm(defaultLineForm)
      setSelectedLine(null)
      setLineAutofillHint(null)
      setFeedback(t(lineMode === 'create' ? 'pages.inventoryAdjustments.feedback.lineCreated' : 'pages.inventoryAdjustments.feedback.lineUpdated'))
      await loadDetails(selectedAdjustment.id)
      await loadRows()
    } catch (saveError) {
      setLineError(saveError instanceof ApiError ? saveError.message : t('pages.inventoryAdjustments.errors.saveLine'))
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
      setFeedback(t('pages.inventoryAdjustments.feedback.lineDeleted'))
      await loadDetails(selectedAdjustment.id)
      await loadRows()
    } catch (deleteError) {
      setLineError(deleteError instanceof ApiError ? deleteError.message : t('pages.inventoryAdjustments.errors.deleteLine'))
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
      grid={<InventoryAdjustmentList rows={gridRows} loading={isLoading} selectedId={selectedAdjustment?.id} canManage={canManage} getStatusLabel={getDocumentStatusLabel} onSelect={(id) => void loadDetails(id)} onEdit={(row) => void openEditDialog(row)} onDelete={setDeleteTarget} />}
      linesPanel={<InventoryAdjustmentDetail adjustment={selectedAdjustment} canManage={canManage} productsAvailable={products.length > 0} warehouseName={selectedAdjustment ? warehouseNameById.get(selectedAdjustment.warehouseId) : undefined} productLabels={new Map(products.map((product) => [product.id, `${product.name} (${product.sku})`]))} balances={balanceByProductId} lineError={lineError} getStatusLabel={getDocumentStatusLabel} onAddLine={openCreateLine} onEditLine={openEditLine} onDeleteLine={deleteLine} />}
      editor={
        <>
        <VxDialog open={canManage && editorOpen} onClose={requestEditorClose} fullWidth maxWidth="md">
          <VxDialogTitle>{t(editorMode === 'create' ? 'pages.inventoryAdjustments.editor.createTitle' : 'pages.inventoryAdjustments.editor.editTitle')}</VxDialogTitle>
          <VxDialogContent dividers>
            {editorLoading ? (
              <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                <VxCircularProgress size={28} />
              </VxBox>
            ) : (
              <VxStack spacing={2.5} sx={{ pt: 1 }}>
                {editorError ? <VxAlert severity="error">{editorError}</VxAlert> : null}
                {editorMode === 'create' ? <VxAlert severity="info">{t('pages.inventoryAdjustments.editor.draftHint')}</VxAlert> : null}
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <VxTextField label={t('pages.inventoryAdjustments.editor.adjustmentNumber')} value={editorForm.adjustmentNumber} onChange={(event) => setEditorForm((current) => ({ ...current, adjustmentNumber: event.target.value }))} fullWidth />
                  <VxTextField label={t('pages.inventoryAdjustments.editor.adjustmentDate')} type="date" value={editorForm.adjustmentDate} onChange={(event) => setEditorForm((current) => ({ ...current, adjustmentDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </VxStack>
                <LookupSelectField label={t('pages.inventoryAdjustments.editor.warehouse')} value={editorForm.warehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, warehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText={t('pages.inventoryAdjustments.editor.noWarehouses')} requiredText={t('common.required')} />
                <VxTextField label={t('pages.inventoryAdjustments.editor.reason')} value={editorForm.reason} onChange={(event) => setEditorForm((current) => ({ ...current, reason: event.target.value }))} fullWidth />
                {editorMode === 'edit' ? (
                  <VxTextField select label={t('pages.inventoryAdjustments.editor.status')} value={editorForm.status} onChange={(event) => setEditorForm((current) => ({ ...current, status: Number(event.target.value) }))} fullWidth>
                    {[1, 2, 3, 4, 5].map((status) => <VxMenuItem key={status} value={status}>{getDocumentStatusLabel(status)}</VxMenuItem>)}
                  </VxTextField>
                ) : null}
                <VxTextField label={t('pages.inventoryAdjustments.editor.notes')} value={editorForm.notes} onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth />
              </VxStack>
            )}
          </VxDialogContent>
          <VxDialogActions sx={{ px: 3, py: 2 }}>
            <VxButton onClick={requestEditorClose} disabled={editorLoading || editorSaving}>{t('pages.inventoryAdjustments.editor.cancel')}</VxButton>
            <VxButton variant="contained" onClick={() => void saveEditor()} disabled={editorLoading || editorSaving || warehouses.length === 0}>{editorMode === 'create' ? t('pages.inventoryAdjustments.editor.create') : t('pages.inventoryAdjustments.editor.save')}</VxButton>
          </VxDialogActions>
        </VxDialog>
        {editorDiscardDialog}
        </>
      }
      deleteDialog={
        <>
          <InventoryAdjustmentStateActions open={canManage && Boolean(deleteTarget)} targetName={deleteTarget?.adjustmentNumber ?? ''} pending={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
          <InventoryAdjustmentLineEditor open={canManage && lineOpen} mode={lineMode} saving={lineSaving} error={lineError} form={lineForm} productOptions={products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))} autofillHint={lineAutofillHint} onChange={setLineForm} onProductChange={(value) => void handleLineProductChange(value)} onClose={requestLineClose} onSave={() => void saveLine()} />
          {lineDiscardDialog}
        </>
      }
    />
  )
}
