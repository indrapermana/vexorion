import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddRoundedIcon, AutoGraphRoundedIcon, CheckCircleRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxConfirmActionButton, VxConfirmActionDialog, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxMenuItem, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
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
  const getDocumentStatusLabel = (status: number) => status >= 1 && status <= 5
    ? t(`common.documentStatuses.${status}`)
    : t('pages.stockCounts.table.unknownStatus', { status })
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.inventory.manage) ?? false
  const canViewProducts = user?.permissions.includes(Permissions.products.view) ?? false
  const { items: warehouses, error: warehousesError, reload: reloadWarehouses } = useWarehousesLookup(isAuthenticated)
  const { items: products, error: productsError } = useProductsLookup(Boolean(isAuthenticated && canViewProducts))
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
      setError(loadError instanceof ApiError ? loadError.message : t('pages.stockCounts.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, reloadWarehouses, t])

  const loadDetails = useCallback(async (stockCountId: string) => {
    try {
      const detail = await getStockCount(stockCountId)
      setSelectedCount(detail)
      return detail
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.stockCounts.errors.loadDetails'))
      return null
    }
  }, [t])

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
    if (!canManage) return
    setFeedback(null)
    setEditorMode('create')
    resetEditor()
    setEditorOpen(true)
  }

  const openEditDialog = async (row: CountGridRow) => {
    if (!canManage) return
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
      setEditorError(loadError instanceof ApiError ? loadError.message : t('pages.stockCounts.errors.loadEdit'))
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
      setEditorError(t('pages.stockCounts.validation.warehouseRequired'))
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
        setFeedback(t('pages.stockCounts.feedback.created'))
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
        setFeedback(t('pages.stockCounts.feedback.updated'))
        setEditorOpen(false)
        await loadRows()
        setSelectedCount(updated)
      }
    } catch (saveError) {
      setEditorError(saveError instanceof ApiError ? saveError.message : t('pages.stockCounts.errors.save'))
    } finally {
      setEditorLoading(false)
    }
  }

  const openDeleteDialog = (row: CountGridRow) => {
    if (!canManage) return
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
      setFeedback(t('pages.stockCounts.feedback.deleted'))
      await loadRows()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.stockCounts.errors.delete'))
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateLineDialog = () => {
    if (!canManage || !selectedCount || selectedCount.status !== 1) {
      return
    }

    setLineMode('create')
    setLineError(null)
    setLineForm(defaultLineForm)
    setSelectedLine(null)
    setLineOpen(true)
  }

  const openEditLineDialog = (line: StockCountLineDetailsResponse) => {
    if (!canManage) return
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
      setLineError(t('pages.stockCounts.validation.productRequired'))
      return
    }

    const systemQuantity = Number(lineForm.systemQuantity)
    const countedQuantity = Number(lineForm.countedQuantity)

    if (!Number.isFinite(systemQuantity) || !Number.isFinite(countedQuantity)) {
      setLineError(t('pages.stockCounts.validation.quantitiesValid'))
      return
    }

    if (systemQuantity < 0 || countedQuantity < 0) {
      setLineError(t('pages.stockCounts.validation.quantitiesNonNegative'))
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
        setFeedback(t('pages.stockCounts.feedback.lineAdded'))
      } else if (selectedLine) {
        await updateStockCountLine(selectedCount.id, selectedLine.id, {
          productId,
          systemQuantity,
          countedQuantity,
        })
        setFeedback(t('pages.stockCounts.feedback.lineUpdated'))
      }

      setLineOpen(false)
      await loadDetails(selectedCount.id)
    } catch (saveError) {
      setLineError(saveError instanceof ApiError ? saveError.message : t('pages.stockCounts.errors.saveLine'))
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
      setFeedback(t('pages.stockCounts.feedback.lineRemoved'))
      await loadDetails(selectedCount.id)
    } catch (deleteError) {
      setLineError(deleteError instanceof ApiError ? deleteError.message : t('pages.stockCounts.errors.deleteLine'))
    } finally {
      setLineSaving(false)
    }
  }

  const updateSelectedCountStatus = async (status: number, successKey: 'pages.stockCounts.feedback.posted' | 'pages.stockCounts.feedback.reversed') => {
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
      setFeedback(t(successKey))
      await loadRows()
    } catch (statusError) {
      setError(statusError instanceof ApiError ? statusError.message : t('pages.stockCounts.errors.updateStatus'))
    } finally {
      setStatusActionLoading(false)
    }
  }

  const confirmPost = async () => {
    await updateSelectedCountStatus(4, 'pages.stockCounts.feedback.posted')
    setPostDialogOpen(false)
  }

  const confirmReverse = async () => {
    await updateSelectedCountStatus(5, 'pages.stockCounts.feedback.reversed')
    setReverseDialogOpen(false)
  }

  const alerts: Array<{ severity: 'warning' | 'error' | 'success' | 'info', message: string }> = []
  if (!canManage) alerts.push({ severity: 'info', message: t('authorization.readOnly', { requiredPermission: Permissions.inventory.manage }) })
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
      showCreate={canManage}
      metrics={metrics}
      alerts={alerts}
      grid={(
        <VxTableContainer component={VxPaper} elevation={0}>
          <VxTable size="small">
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('pages.stockCounts.table.number')}</VxTableCell>
                <VxTableCell>{t('pages.stockCounts.table.warehouse')}</VxTableCell>
                <VxTableCell>{t('pages.stockCounts.table.date')}</VxTableCell>
                <VxTableCell>{t('pages.stockCounts.table.status')}</VxTableCell>
                <VxTableCell align="right">{t('pages.stockCounts.table.actions')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {isLoading ? (
                <VxTableRow>
                  <VxTableCell colSpan={5}>
                    <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <VxCircularProgress size={18} />
                      <VxTypography variant="body2">{t('pages.stockCounts.table.loading')}</VxTypography>
                    </VxStack>
                  </VxTableCell>
                </VxTableRow>
              ) : gridRows.length === 0 ? (
                <VxTableRow>
                  <VxTableCell colSpan={5}>
                    <VxTypography variant="body2" color="text.secondary">{t('pages.stockCounts.table.empty')}</VxTypography>
                  </VxTableCell>
                </VxTableRow>
              ) : (
                gridRows.map((row) => (
                  <VxTableRow
                    key={row.id}
                    hover
                    selected={selectedCount?.id === row.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      setFeedback(null)
                      void loadDetails(row.id)
                    }}
                  >
                    <VxTableCell>{row.countNumber}</VxTableCell>
                    <VxTableCell>{row.warehouseName ?? row.warehouseId}</VxTableCell>
                    <VxTableCell>{row.countDate}</VxTableCell>
                    <VxTableCell>
                      <VxChip size="small" label={getDocumentStatusLabel(row.status)} color={row.status === 4 ? 'success' : row.status === 5 ? 'default' : 'primary'} />
                    </VxTableCell>
                    <VxTableCell align="right">
                      {canManage ? <VxStack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <VxButton size="small" startIcon={<EditRoundedIcon />} onClick={(event) => { event.stopPropagation(); void openEditDialog(row) }}>
                          {t('pages.stockCounts.table.edit')}
                        </VxButton>
                        <VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={(event) => { event.stopPropagation(); openDeleteDialog(row) }}>
                          {t('pages.stockCounts.table.delete')}
                        </VxButton>
                      </VxStack> : null}
                    </VxTableCell>
                  </VxTableRow>
                ))
              )}
            </VxTableBody>
          </VxTable>
        </VxTableContainer>
      )}
      linesPanel={(
        <VxPaper elevation={0} className="panel-card">
          <VxStack direction={{ xs: 'column', lg: 'row' }} sx={{ justifyContent: 'space-between', mb: 2 }} spacing={1.5}>
            <VxBox>
              <VxTypography variant="h6">{t('pages.stockCounts.linePanel.title')}</VxTypography>
              <VxTypography variant="body2" color="text.secondary">
                {selectedCount
                  ? t('pages.stockCounts.linePanel.forCount', { number: selectedCount.countNumber, status: getDocumentStatusLabel(selectedCount.status) })
                  : t('pages.stockCounts.linePanel.selectPrompt')}
              </VxTypography>
            </VxBox>
            {canManage ? <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={1}>
              <VxButton variant="contained" color="success" onClick={() => setPostDialogOpen(true)} disabled={!canPost || statusActionLoading}>
                {t('pages.stockCounts.linePanel.post')}
              </VxButton>
              <VxButton variant="outlined" color="warning" onClick={() => setReverseDialogOpen(true)} disabled={!canReverse || statusActionLoading}>
                {t('pages.stockCounts.linePanel.reverse')}
              </VxButton>
              <VxButton
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={openCreateLineDialog}
                disabled={!selectedCount || selectedCount.status !== 1}
              >
                {t('pages.stockCounts.linePanel.add')}
              </VxButton>
            </VxStack> : null}
          </VxStack>

          {!selectedCount ? (
            <VxAlert severity="info">{t('pages.stockCounts.linePanel.choosePrompt')}</VxAlert>
          ) : selectedCount.lines.length === 0 ? (
            <VxAlert severity="warning">{t('pages.stockCounts.linePanel.empty')}</VxAlert>
          ) : (
            <VxTableContainer>
              <VxTable size="small">
                <VxTableHead>
                  <VxTableRow>
                    <VxTableCell>{t('pages.stockCounts.linePanel.product')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.stockCounts.linePanel.systemQuantity')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.stockCounts.linePanel.countedQuantity')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.stockCounts.linePanel.variance')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.stockCounts.linePanel.actions')}</VxTableCell>
                  </VxTableRow>
                </VxTableHead>
                <VxTableBody>
                  {selectedCount.lines.map((line) => {
                    const product = productById.get(line.productId)
                    const variance = line.countedQuantity - line.systemQuantity
                    return (
                      <VxTableRow key={line.id}>
                        <VxTableCell>{product ? `${product.sku} · ${product.name}` : line.productId}</VxTableCell>
                        <VxTableCell align="right">{line.systemQuantity.toFixed(2)}</VxTableCell>
                        <VxTableCell align="right">{line.countedQuantity.toFixed(2)}</VxTableCell>
                        <VxTableCell align="right" sx={{ color: variance === 0 ? 'text.secondary' : variance > 0 ? 'success.main' : 'error.main' }}>
                          {variance.toFixed(2)}
                        </VxTableCell>
                        <VxTableCell align="right">
                          {canManage ? <VxStack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <VxButton size="small" startIcon={<EditRoundedIcon />} disabled={selectedCount.status !== 1} onClick={() => openEditLineDialog(line)}>
                              {t('pages.stockCounts.table.edit')}
                            </VxButton>
                            <VxConfirmActionButton
                              title={t('pages.stockCounts.linePanel.deleteTitle')}
                              targetName={product ? `${product.name} (${product.sku})` : line.productId}
                              consequence={t('pages.stockCounts.linePanel.deleteConsequence', { number: selectedCount.countNumber })}
                              confirmLabel={t('pages.stockCounts.linePanel.deleteConfirm')}
                              pendingLabel={t('pages.stockCounts.linePanel.deleting')}
                              onConfirm={() => deleteLine(line)}
                              buttonProps={{ size: 'small', color: 'error', startIcon: <DeleteOutlineRoundedIcon />, disabled: selectedCount.status !== 1 }}
                            >{t('pages.stockCounts.table.delete')}</VxConfirmActionButton>
                          </VxStack> : null}
                        </VxTableCell>
                      </VxTableRow>
                    )
                  })}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          )}
        </VxPaper>
      )}
      editor={(
        <>
          <VxDialog open={canManage && editorOpen} onClose={closeEditorDialog} fullWidth maxWidth="sm">
            <VxDialogTitle>{t(editorMode === 'create' ? 'pages.stockCounts.editor.createTitle' : 'pages.stockCounts.editor.editTitle')}</VxDialogTitle>
            <VxDialogContent>
              <VxStack spacing={2} sx={{ mt: 1 }}>
                {editorError ? <VxAlert severity="error">{editorError}</VxAlert> : null}
                <VxTextField
                  label={t('pages.stockCounts.editor.number')}
                  value={editorForm.countNumber}
                  onChange={(event) => setEditorForm((current) => ({ ...current, countNumber: event.target.value }))}
                  disabled={editorLoading}
                  required
                  fullWidth
                />
                <LookupSelectField
                  label={t('pages.stockCounts.editor.warehouse')}
                  options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
                  value={editorForm.warehouseId}
                  onChange={(value) => setEditorForm((current) => ({ ...current, warehouseId: value }))}
                  disabled={editorLoading}
                  emptyText={t('pages.stockCounts.editor.noWarehouses')}
                  requiredText={t('common.required')}
                />
                <VxTextField
                  label={t('pages.stockCounts.editor.countDate')}
                  type="date"
                  value={editorForm.countDate}
                  onChange={(event) => setEditorForm((current) => ({ ...current, countDate: event.target.value }))}
                  disabled={editorLoading}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                  fullWidth
                />
                <VxTextField
                  select
                  label={t('pages.stockCounts.editor.status')}
                  value={editorForm.status}
                  onChange={(event) => setEditorForm((current) => ({ ...current, status: Number(event.target.value) }))}
                  disabled={editorLoading}
                  fullWidth
                >
                  {[1, 2, 3, 4, 5].map((status) => (
                    <VxMenuItem key={status} value={status}>
                      {getDocumentStatusLabel(status)}
                    </VxMenuItem>
                  ))}
                </VxTextField>
                <VxTextField
                  label={t('pages.stockCounts.editor.notes')}
                  value={editorForm.notes}
                  onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))}
                  disabled={editorLoading}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </VxStack>
            </VxDialogContent>
            <VxDialogActions>
              <VxButton onClick={closeEditorDialog} disabled={editorLoading}>{t('pages.stockCounts.editor.cancel')}</VxButton>
              <VxButton onClick={() => void saveHeader()} disabled={editorLoading} variant="contained">
                {editorLoading ? t('pages.stockCounts.editor.saving') : t('pages.stockCounts.editor.save')}
              </VxButton>
            </VxDialogActions>
          </VxDialog>

          <VxDialog open={canManage && lineOpen} onClose={closeLineDialog} fullWidth maxWidth="sm">
            <VxDialogTitle>{t(lineMode === 'create' ? 'pages.stockCounts.lineEditor.createTitle' : 'pages.stockCounts.lineEditor.editTitle')}</VxDialogTitle>
            <VxDialogContent>
              <VxStack spacing={2} sx={{ mt: 1 }}>
                {lineError ? <VxAlert severity="error">{lineError}</VxAlert> : null}
                <LookupSelectField
                  label={t('pages.stockCounts.lineEditor.product')}
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
                  emptyText={t('pages.stockCounts.lineEditor.noProducts')}
                  requiredText={t('common.required')}
                />
                <VxTextField
                  label={t('pages.stockCounts.lineEditor.systemQuantity')}
                  type="number"
                  value={lineForm.systemQuantity}
                  onChange={(event) => setLineForm((current) => ({ ...current, systemQuantity: event.target.value }))}
                  disabled={lineSaving}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  fullWidth
                />
                <VxTextField
                  label={t('pages.stockCounts.lineEditor.countedQuantity')}
                  type="number"
                  value={lineForm.countedQuantity}
                  onChange={(event) => setLineForm((current) => ({ ...current, countedQuantity: event.target.value }))}
                  disabled={lineSaving}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  fullWidth
                />
                <VxTextField
                  label={t('pages.stockCounts.lineEditor.variance')}
                  value={(Number(lineForm.countedQuantity || 0) - Number(lineForm.systemQuantity || 0)).toFixed(2)}
                  slotProps={{ htmlInput: { readOnly: true } }}
                  fullWidth
                />
              </VxStack>
            </VxDialogContent>
            <VxDialogActions>
              <VxButton onClick={closeLineDialog} disabled={lineSaving}>{t('pages.stockCounts.lineEditor.cancel')}</VxButton>
              <VxButton onClick={() => void saveLine()} disabled={lineSaving} variant="contained">
                {lineSaving ? t('pages.stockCounts.lineEditor.saving') : t('pages.stockCounts.lineEditor.save')}
              </VxButton>
            </VxDialogActions>
          </VxDialog>

          <VxConfirmActionDialog open={canManage && postDialogOpen} title={t('pages.stockCounts.actions.postTitle')} targetName={selectedCount?.countNumber ?? ''} consequence={t('pages.stockCounts.actions.postConsequence')} confirmLabel={t('pages.stockCounts.actions.postConfirm')} confirmColor="success" pendingLabel={t('pages.stockCounts.actions.posting')} pending={statusActionLoading} onClose={() => setPostDialogOpen(false)} onConfirm={() => void confirmPost()} />

          <VxConfirmActionDialog open={canManage && reverseDialogOpen} title={t('pages.stockCounts.actions.reverseTitle')} targetName={selectedCount?.countNumber ?? ''} consequence={t('pages.stockCounts.actions.reverseConsequence')} confirmLabel={t('pages.stockCounts.actions.reverseConfirm')} confirmColor="warning" pendingLabel={t('pages.stockCounts.actions.reversing')} pending={statusActionLoading} onClose={() => setReverseDialogOpen(false)} onConfirm={() => void confirmReverse()} />
        </>
      )}
      deleteDialog={(
        <VxConfirmActionDialog open={canManage && Boolean(deleteTarget)} title={t('pages.stockCounts.actions.deleteTitle')} targetName={deleteTarget?.countNumber ?? ''} consequence={t('pages.stockCounts.actions.deleteConsequence')} confirmLabel={t('pages.stockCounts.actions.deleteConfirm')} pendingLabel={t('pages.stockCounts.linePanel.deleting')} pending={isDeleting} onClose={closeDeleteDialog} onConfirm={() => void confirmDelete()} />
      )}
    />
  )
}
