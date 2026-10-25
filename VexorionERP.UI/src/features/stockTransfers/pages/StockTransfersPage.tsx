import { useCallback, useEffect, useMemo, useState } from 'react'
import { AutoGraphRoundedIcon, CheckCircleRoundedIcon, WarehouseRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxStack, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import { useCurrency } from '../../../app/CurrencyContext'
import LookupSelectField from '../../../components/LookupSelectField'
import OrderWorkspace from '../../../components/OrderWorkspace'
import { useInventoryBalancesLookup, useProductsLookup, useWarehousesLookup } from '../../../hooks/useLookups'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import StockTransferDetail from '../components/StockTransferDetail'
import StockTransferLineEditor, { type TransferLineForm } from '../components/StockTransferLineEditor'
import StockTransferList, { type StockTransferListRow } from '../components/StockTransferList'
import StockTransferStateActions from '../components/StockTransferStateActions'
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

type TransferFormState = {
  transferNumber: string
  sourceWarehouseId: string
  destinationWarehouseId: string
  transferDate: string
  status: number
  notes: string
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

const defaultLineForm: TransferLineForm = {
  productId: '',
  quantity: '1',
  unitCost: '0',
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function buildLineForm(line: StockTransferLineDetailsResponse | null): TransferLineForm {
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
  const getDocumentStatusLabel = (status: number) => status >= 1 && status <= 5
    ? t(`common.documentStatuses.${status}`)
    : t('pages.stockTransfers.table.unknownStatus', { status })
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
  const [initialEditorForm, setInitialEditorForm] = useState<TransferFormState | null>(null)
  const [editorSaving, setEditorSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StockTransferListRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lineMode, setLineMode] = useState<DialogMode>('create')
  const [lineOpen, setLineOpen] = useState(false)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState<TransferLineForm>(defaultLineForm)
  const [initialLineForm, setInitialLineForm] = useState<TransferLineForm | null>(null)
  const [selectedLine, setSelectedLine] = useState<StockTransferLineDetailsResponse | null>(null)
  const [lineAutofillHint, setLineAutofillHint] = useState<string | null>(null)
  const { requestClose: requestEditorClose, confirmationDialog: editorDiscardDialog } = useUnsavedChangesPrompt(
    canManage && editorOpen && Boolean(initialEditorForm && JSON.stringify(editorForm) !== JSON.stringify(initialEditorForm)),
    editorLoading || editorSaving,
    () => setEditorOpen(false),
    () => setEditorForm(initialEditorForm ?? defaultTransferForm),
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
      const [transfers] = await Promise.all([getStockTransfers(), reloadWarehouses()])
      setRows(transfers)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.stockTransfers.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadWarehouses, t])

  const loadDetails = useCallback(async (transferId: string) => {
    try {
      const detail = await getStockTransfer(transferId)
      setSelectedTransfer(detail)
      return detail
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.stockTransfers.errors.loadDetails'))
      return null
    }
  }, [t])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const warehouseNameById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name])), [warehouses])
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
  const gridRows = useMemo<StockTransferListRow[]>(() => rows.map((row) => ({
    ...row,
    sourceWarehouseName: warehouseNameById.get(row.sourceWarehouseId),
    destinationWarehouseName: warehouseNameById.get(row.destinationWarehouseId),
  })), [rows, warehouseNameById])

  const resetEditor = () => {
    setEditorError(null)
    setEditorForm(defaultTransferForm)
    setInitialEditorForm(defaultTransferForm)
  }

  const openCreateDialog = () => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: StockTransferListRow) => {
    if (!canManage) return
    setFeedback(null)
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    setEditorError(null)
    setInitialEditorForm(null)

    try {
      const detail = await getStockTransfer(row.id)
      setSelectedTransfer(detail)
      const nextForm = {
        transferNumber: detail.transferNumber,
        sourceWarehouseId: detail.sourceWarehouseId,
        destinationWarehouseId: detail.destinationWarehouseId,
        transferDate: detail.transferDate,
        status: detail.status,
        notes: detail.notes ?? '',
      }
      setEditorForm(nextForm)
      setInitialEditorForm(nextForm)
    } catch (loadError) {
      setEditorError(loadError instanceof ApiError ? loadError.message : t('pages.stockTransfers.errors.loadDetails'))
    } finally {
      setEditorLoading(false)
    }
  }

  const saveEditor = async () => {
    setEditorError(null)

    if (!editorForm.transferNumber.trim() || !editorForm.sourceWarehouseId || !editorForm.destinationWarehouseId || !editorForm.transferDate) {
      setEditorError(t('pages.stockTransfers.validation.headerRequired'))
      return
    }

    if (editorForm.sourceWarehouseId === editorForm.destinationWarehouseId) {
      setEditorError(t('pages.stockTransfers.validation.warehousesMustDiffer'))
      return
    }

    setEditorSaving(true)
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
      setFeedback(t(editorMode === 'create' ? 'pages.stockTransfers.feedback.created' : 'pages.stockTransfers.feedback.updated', { number: saved.transferNumber }))
      await loadRows()
    } catch (saveError) {
      setEditorError(saveError instanceof ApiError ? saveError.message : t('pages.stockTransfers.errors.save'))
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
      await deleteStockTransfer(deleteTarget.id)
      if (selectedTransfer?.id === deleteTarget.id) {
        setSelectedTransfer(null)
      }
      setDeleteTarget(null)
      setFeedback(t('pages.stockTransfers.feedback.deleted', { number: deleteTarget.transferNumber }))
      await loadRows()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.stockTransfers.errors.delete'))
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateLine = () => {
    if (!canManage) return
    setLineMode('create')
    setSelectedLine(null)
    setLineForm(defaultLineForm)
    setInitialLineForm(defaultLineForm)
    setLineError(null)
    setLineAutofillHint(null)
    setLineOpen(true)
  }

  const openEditLine = (line: StockTransferLineDetailsResponse) => {
    if (!canManage) return
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
      setLineAutofillHint(t('pages.stockTransfers.lineEditor.autoFill', { cost: formatMoney(product.standardCost) }))
    } catch (loadError) {
      setLineAutofillHint(loadError instanceof ApiError ? loadError.message : t('pages.stockTransfers.errors.autoFill'))
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
      setLineError(t('pages.stockTransfers.validation.lineRequired'))
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
      setInitialLineForm(defaultLineForm)
      setSelectedLine(null)
      setLineAutofillHint(null)
      setFeedback(t(lineMode === 'create' ? 'pages.stockTransfers.feedback.lineCreated' : 'pages.stockTransfers.feedback.lineUpdated'))
      await loadDetails(selectedTransfer.id)
      await loadRows()
    } catch (saveError) {
      setLineError(saveError instanceof ApiError ? saveError.message : t('pages.stockTransfers.errors.saveLine'))
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
      setFeedback(t('pages.stockTransfers.feedback.lineDeleted'))
      await loadDetails(selectedTransfer.id)
      await loadRows()
    } catch (deleteError) {
      setLineError(deleteError instanceof ApiError ? deleteError.message : t('pages.stockTransfers.errors.deleteLine'))
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
      grid={<StockTransferList rows={gridRows} loading={isLoading} selectedId={selectedTransfer?.id} canManage={canManage} getStatusLabel={getDocumentStatusLabel} onSelect={(id) => void loadDetails(id)} onEdit={(row) => void openEditDialog(row)} onDelete={setDeleteTarget} />}
      linesPanel={<StockTransferDetail transfer={selectedTransfer} canManage={canManage} productsAvailable={products.length > 0} sourceWarehouseName={selectedTransfer ? warehouseNameById.get(selectedTransfer.sourceWarehouseId) : undefined} destinationWarehouseName={selectedTransfer ? warehouseNameById.get(selectedTransfer.destinationWarehouseId) : undefined} productLabels={new Map(products.map((product) => [product.id, `${product.name} (${product.sku})`]))} balances={sourceBalanceByProductId} lineError={lineError} formatMoney={formatMoney} onAddLine={openCreateLine} onEditLine={openEditLine} onDeleteLine={deleteLine} />}
      editor={
        <>
        <VxDialog open={canManage && editorOpen} onClose={requestEditorClose} fullWidth maxWidth="md">
          <VxDialogTitle>{t(editorMode === 'create' ? 'pages.stockTransfers.editor.createTitle' : 'pages.stockTransfers.editor.editTitle')}</VxDialogTitle>
          <VxDialogContent dividers>
            {editorLoading ? (
              <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
                <VxCircularProgress size={28} />
              </VxBox>
            ) : (
              <VxStack spacing={2.5} sx={{ pt: 1 }}>
                {editorError ? <VxAlert severity="error">{editorError}</VxAlert> : null}
                {editorMode === 'create' ? <VxAlert severity="info">{t('pages.stockTransfers.editor.draftHint')}</VxAlert> : null}
                <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <VxTextField label={t('pages.stockTransfers.editor.number')} value={editorForm.transferNumber} onChange={(event) => setEditorForm((current) => ({ ...current, transferNumber: event.target.value }))} fullWidth />
                  <VxTextField label={t('pages.stockTransfers.editor.date')} type="date" value={editorForm.transferDate} onChange={(event) => setEditorForm((current) => ({ ...current, transferDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                </VxStack>
                <LookupSelectField label={t('pages.stockTransfers.editor.source')} value={editorForm.sourceWarehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, sourceWarehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText={t('pages.stockTransfers.editor.noWarehouses')} requiredText={t('pages.stockTransfers.editor.required')} />
                <LookupSelectField label={t('pages.stockTransfers.editor.destination')} value={editorForm.destinationWarehouseId} onChange={(value) => setEditorForm((current) => ({ ...current, destinationWarehouseId: value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))} disabled={!warehouses.length} emptyText={t('pages.stockTransfers.editor.noWarehouses')} requiredText={t('pages.stockTransfers.editor.required')} />
                {editorMode === 'edit' ? (
                  <VxTextField select label={t('pages.stockTransfers.editor.status')} value={editorForm.status} onChange={(event) => setEditorForm((current) => ({ ...current, status: Number(event.target.value) }))} fullWidth>
                    {[1, 2, 3, 4, 5].map((status) => <VxMenuItem key={status} value={status}>{getDocumentStatusLabel(status)}</VxMenuItem>)}
                  </VxTextField>
                ) : null}
                <VxTextField label={t('pages.stockTransfers.editor.notes')} value={editorForm.notes} onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth />
              </VxStack>
            )}
          </VxDialogContent>
          <VxDialogActions sx={{ px: 3, py: 2 }}>
            <VxButton onClick={requestEditorClose} disabled={editorLoading || editorSaving}>{t('pages.stockTransfers.editor.cancel')}</VxButton>
            <VxButton variant="contained" onClick={() => void saveEditor()} disabled={editorLoading || editorSaving || warehouses.length < 2}>{t(editorMode === 'create' ? 'pages.stockTransfers.editor.create' : 'pages.stockTransfers.editor.save')}</VxButton>
          </VxDialogActions>
        </VxDialog>
        {editorDiscardDialog}
        </>
      }
      deleteDialog={
        <>
          <StockTransferStateActions open={canManage && Boolean(deleteTarget)} targetName={deleteTarget?.transferNumber ?? ''} pending={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
          <StockTransferLineEditor open={canManage && lineOpen} mode={lineMode} saving={lineSaving} error={lineError} form={lineForm} productOptions={products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))} autofillHint={lineAutofillHint} onChange={setLineForm} onProductChange={(value) => void handleLineProductChange(value)} onClose={requestLineClose} onSave={() => void saveLine()} />
          {lineDiscardDialog}
        </>
      }
    />
  )
}
