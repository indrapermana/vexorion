import { useMemo, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, WarehouseRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxConfirmActionButton, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
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
  canManage?: boolean
  canViewProducts?: boolean
  canViewInventory?: boolean
}

export default function SalesOrderLinesPanel({ order, lines, isLoading, error, onRefresh, canManage = true, canViewProducts = true, canViewInventory = true }: SalesOrderLinesPanelProps) {
  const { t } = useTranslation()
  const { items: products, error: productsError } = useProductsLookup(Boolean(order) && canViewProducts)
  const { items: warehouses, error: warehousesError } = useWarehousesLookup(Boolean(order) && canViewInventory)
  const { items: balances, error: balancesError } = useInventoryBalancesLookup(Boolean(order) && canViewInventory)
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
      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>{t('orderWorkflow.line.orderLines')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.salesOrders.lines.selectPrompt')}</VxTypography>
      </VxPaper>
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
      setFeedback(t(mode === 'create' ? 'pages.salesOrders.lines.created' : 'pages.salesOrders.lines.updated'))
      setIsEditorOpen(false)
      await onRefresh()
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : t('pages.salesOrders.lines.saveError'))
    }
  }

  const handleDelete = async (lineId: string) => {
    try {
      setMutationError(null)
      setFeedback(null)
      await deleteSalesOrderLine(order.id, lineId)
      setFeedback(t('pages.salesOrders.lines.deleted'))
      await onRefresh()
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : t('pages.salesOrders.lines.deleteError'))
    }
  }

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <VxBox>
          <VxTypography variant="h6">{t('orderWorkflow.line.orderLinesFor', { number: order.orderNumber })}</VxTypography>
          <VxTypography color="text.secondary">{t('pages.salesOrders.lines.description')}</VxTypography>
        </VxBox>
        {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!products.length}>{t('orderWorkflow.line.add')}</VxButton> : null}
      </VxStack>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <VxChip icon={<WarehouseRoundedIcon />} label={t('pages.salesOrders.lines.warehouse', { warehouse: warehouseName ?? order.warehouseId })} color="primary" variant="outlined" />
        <VxTypography color="text.secondary">{t('pages.salesOrders.lines.inventoryHint')}</VxTypography>
      </VxStack>
      {error ? <VxAlert severity="error" sx={{ mb: 2 }}>{error}</VxAlert> : null}
      {productsError ? <VxAlert severity="warning" sx={{ mb: 2 }}>{productsError}</VxAlert> : null}
      {warehousesError ? <VxAlert severity="warning" sx={{ mb: 2 }}>{warehousesError}</VxAlert> : null}
      {balancesError ? <VxAlert severity="warning" sx={{ mb: 2 }}>{balancesError}</VxAlert> : null}
      {mutationError ? <VxAlert severity="error" sx={{ mb: 2 }}>{mutationError}</VxAlert> : null}
      {feedback ? <VxAlert severity="success" sx={{ mb: 2 }}>{feedback}</VxAlert> : null}
      <VxTableContainer>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('orderWorkflow.line.product')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.available')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.quantityShort')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.unitPrice')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.discount')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.total')}</VxTableCell>
              <VxTableCell align="right">{t('common.actions')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {lines.map((line) => {
              const product = productById.get(line.productId)
              return (
                <VxTableRow key={line.id} hover>
                  <VxTableCell>{product ? `${product.name} (${product.sku})` : line.productId}</VxTableCell>
                  <VxTableCell align="right">{order.warehouseId ? (balanceByProductId.get(line.productId) ?? 0).toFixed(2) : '-'}</VxTableCell>
                  <VxTableCell align="right">{line.quantity}</VxTableCell>
                  <VxTableCell align="right">${line.unitPrice.toFixed(2)}</VxTableCell>
                  <VxTableCell align="right">${line.discountAmount.toFixed(2)}</VxTableCell>
                  <VxTableCell align="right">${line.lineTotal.toFixed(2)}</VxTableCell>
                  <VxTableCell align="right">
                    {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(line)}>{t('common.edit')}</VxButton>
                    <VxConfirmActionButton
                      title={t('pages.salesOrders.lines.deleteTitle')}
                      targetName={product ? `${product.name} (${product.sku})` : line.productId}
                      consequence={`This removes the line from sales order ${order.orderNumber} and recalculates its totals.`}
                      confirmLabel={t('orderWorkflow.line.delete')}
                      pendingLabel={t('dialogs.deleting')}
                      onConfirm={() => handleDelete(line.id)}
                      buttonProps={{ size: 'small', color: 'error', startIcon: <DeleteOutlineRoundedIcon /> }}
                    >{t('common.delete')}</VxConfirmActionButton></> : null}
                  </VxTableCell>
                </VxTableRow>
              )
            })}
            {!isLoading && lines.length === 0 ? (
              <VxTableRow>
                <VxTableCell colSpan={7}><VxTypography color="text.secondary">{t('orderWorkflow.line.empty')}</VxTypography></VxTableCell>
              </VxTableRow>
            ) : null}
          </VxTableBody>
        </VxTable>
      </VxTableContainer>
      <SalesOrderLineEditorDialog open={canManage && isEditorOpen} mode={dialogMode} line={selectedLine} products={products} onClose={() => setIsEditorOpen(false)} onSaved={handleSave} />
    </VxPaper>
  )
}
