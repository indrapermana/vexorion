import { useMemo, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, WarehouseRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
  useTranslation()
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
        <VxTypography variant="h6" sx={{ mb: 1 }}>Order lines</VxTypography>
        <VxTypography color="text.secondary">Pick an order from the grid to manage its lines.</VxTypography>
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
    <VxPaper elevation={0} className="panel-card">
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <VxBox>
          <VxTypography variant="h6">Order lines for {order.orderNumber}</VxTypography>
          <VxTypography color="text.secondary">Attach products to this order header and keep totals visible.</VxTypography>
        </VxBox>
        {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!products.length}>Add line</VxButton> : null}
      </VxStack>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <VxChip icon={<WarehouseRoundedIcon />} label={warehouseName ? `Fulfillment warehouse: ${warehouseName}` : `Fulfillment warehouse: ${order.warehouseId}`} color="primary" variant="outlined" />
        <VxTypography color="text.secondary">Availability is calculated from the warehouse assigned on the sales order header.</VxTypography>
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
              <VxTableCell>Product</VxTableCell>
              <VxTableCell align="right">Available</VxTableCell>
              <VxTableCell align="right">Qty</VxTableCell>
              <VxTableCell align="right">Unit price</VxTableCell>
              <VxTableCell align="right">Discount</VxTableCell>
              <VxTableCell align="right">Line total</VxTableCell>
              <VxTableCell align="right">Actions</VxTableCell>
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
                    {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(line)}>Edit</VxButton>
                    <VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void handleDelete(line.id)}>Delete</VxButton></> : null}
                  </VxTableCell>
                </VxTableRow>
              )
            })}
            {!isLoading && lines.length === 0 ? (
              <VxTableRow>
                <VxTableCell colSpan={7}><VxTypography color="text.secondary">No lines yet.</VxTypography></VxTableCell>
              </VxTableRow>
            ) : null}
          </VxTableBody>
        </VxTable>
      </VxTableContainer>
      <SalesOrderLineEditorDialog open={canManage && isEditorOpen} mode={dialogMode} line={selectedLine} products={products} onClose={() => setIsEditorOpen(false)} onSaved={handleSave} />
    </VxPaper>
  )
}
