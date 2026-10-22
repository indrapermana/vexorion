import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, CheckCircleRoundedIcon, Inventory2RoundedIcon, ReportRoundedIcon, SellRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxButton, VxFormControlLabel, VxStack, VxSwitch } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import { ApiError, deleteProduct, getInventoryBalances, getProducts, getWarehouses } from '../../../lib/api'
import type {
  InventoryBalanceListItemResponse,
  ProductDetailsResponse,
  ProductListItemResponse,
  WarehouseListItemResponse,
} from '../../../types/api'
import type { ProductDialogMode } from '../../../types/ui'
import type { ProductGridRow } from '../../../types/ui'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState, PageMetric } from '../../../components/PagePrimitives'

const ProductEditorDialog = lazy(() => import('../components/ProductEditorDialog'))
const ProductDataGrid = lazy(() => import('../components/ProductDataGrid'))
const ProductDeleteDialog = lazy(() => import('../components/ProductDeleteDialog'))

function ProductSurfaceFallback() {
  const { t } = useTranslation()

  return (
    <PageLoadingState label={t('pages.products.loadingTools')} />
  )
}

function buildProductRows(
  products: ProductListItemResponse[],
  inventoryBalances: InventoryBalanceListItemResponse[],
  warehouses: WarehouseListItemResponse[],
): ProductGridRow[] {
  const warehouseById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]))
  const balanceByProductId = new Map<string, ProductGridRow['warehouseStock']>()
  const totalsByProductId = new Map<string, {
    quantityOnHand: number
    quantityReserved: number
    quantityAvailable: number
    activeQuantityOnHand: number
    activeQuantityReserved: number
    activeQuantityAvailable: number
  }>()

  for (const balance of inventoryBalances) {
    const warehouse = warehouseById.get(balance.warehouseId)
    const isWarehouseActive = warehouse?.isActive ?? false
    const currentTotals = totalsByProductId.get(balance.productId) ?? {
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      activeQuantityOnHand: 0,
      activeQuantityReserved: 0,
      activeQuantityAvailable: 0,
    }

    currentTotals.quantityOnHand += balance.quantityOnHand
    currentTotals.quantityReserved += balance.quantityReserved
    currentTotals.quantityAvailable += balance.quantityAvailable

    if (balance.isActive && isWarehouseActive) {
      currentTotals.activeQuantityOnHand += balance.quantityOnHand
      currentTotals.activeQuantityReserved += balance.quantityReserved
      currentTotals.activeQuantityAvailable += balance.quantityAvailable
    }

    totalsByProductId.set(balance.productId, currentTotals)

    const warehouseRows = balanceByProductId.get(balance.productId) ?? []
    warehouseRows.push({
      warehouseId: balance.warehouseId,
      warehouseCode: warehouse?.code ?? 'Unknown',
      warehouseName: warehouse?.name ?? 'Unknown warehouse',
      isWarehouseActive,
      quantityOnHand: balance.quantityOnHand,
      quantityReserved: balance.quantityReserved,
      quantityAvailable: balance.quantityAvailable,
    })

    balanceByProductId.set(balance.productId, warehouseRows)
  }

  return products.map((product) => {
    const totals = totalsByProductId.get(product.id)
    const warehouseStock = (balanceByProductId.get(product.id) ?? []).sort((left, right) => {
      if (left.isWarehouseActive !== right.isWarehouseActive) {
        return left.isWarehouseActive ? -1 : 1
      }

      return left.warehouseName.localeCompare(right.warehouseName)
    })
    const activeQuantityAvailable = totals?.activeQuantityAvailable ?? 0

    return {
      ...product,
      quantityOnHand: totals?.quantityOnHand ?? 0,
      quantityReserved: totals?.quantityReserved ?? 0,
      quantityAvailable: totals?.quantityAvailable ?? 0,
      activeQuantityOnHand: totals?.activeQuantityOnHand ?? 0,
      activeQuantityReserved: totals?.activeQuantityReserved ?? 0,
      activeQuantityAvailable,
      isLowStock: product.isActive && activeQuantityAvailable <= product.reorderLevel,
      warehouseStock,
    }
  })
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.products.manage) ?? false
  const [products, setProducts] = useState<ProductGridRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<ProductDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductGridRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false)
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([])

  const loadProducts = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [productResult, inventoryBalanceResult, warehouseResult] = await Promise.all([
        getProducts(),
        getInventoryBalances(),
        getWarehouses(),
      ])

      setProducts(buildProductRows(productResult, inventoryBalanceResult, warehouseResult))
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load products.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const openCreateDialog = () => {
    setFeedback(null)
    setDialogMode('create')
    setSelectedProductId(null)
    setIsEditorOpen(true)
  }

  const openEditDialog = (productId: string) => {
    setFeedback(null)
    setDialogMode('edit')
    setSelectedProductId(productId)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setSelectedProductId(null)
  }

  const handleSaved = async (product: ProductDetailsResponse, mode: ProductDialogMode) => {
    setFeedback(mode === 'create' ? `Product ${product.name} created.` : `Product ${product.name} updated.`)
    handleEditorClose()
    await loadProducts()
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteProduct(deleteTarget.id)
      setFeedback(`Product ${deleteTarget.name} deleted.`)
      setDeleteTarget(null)
      await loadProducts()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError('Unable to delete product.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleExpandedProduct = (productId: string) => {
    setExpandedProductIds((current) => (
      current.includes(productId)
        ? current.filter((candidate) => candidate !== productId)
        : [...current, productId]
    ))
  }

  if (!isAuthenticated) {
    return (
      <VxAlert severity="info">{t('pages.products.signInRequired')}</VxAlert>
    )
  }

  const activeProducts = products.filter((product) => product.isActive)
  const lowStockProducts = activeProducts.filter((product) => product.isLowStock)
  const activeWarehouseOnHand = activeProducts.reduce((sum, product) => sum + product.activeQuantityOnHand, 0)
  const activeWarehouseAvailable = activeProducts.reduce((sum, product) => sum + product.activeQuantityAvailable, 0)
  const visibleProducts = showOnlyLowStock ? products.filter((product) => product.isLowStock) : products

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.products')}
        description={t('pages.products.description')}
        primaryAction={canManage ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
            {t('pages.products.newButton')}
          </VxButton>
        ) : null}
        filters={(
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <VxFormControlLabel
              control={<VxSwitch checked={showOnlyLowStock} onChange={(_, checked) => setShowOnlyLowStock(checked)} color="warning" />}
              label={t('pages.products.onlyLowStock')}
              sx={{ mx: 0 }}
            />
          </VxStack>
        )}
        metrics={(
          <>
            <PageMetric icon={<Inventory2RoundedIcon fontSize="small" />} label={t('pages.products.metrics.catalogRows')} value={products.length} />
            <PageMetric icon={<CheckCircleRoundedIcon fontSize="small" />} label={t('pages.products.metrics.activeItems')} value={activeProducts.length} />
            <PageMetric
              icon={<SellRoundedIcon fontSize="small" />}
              label={t('pages.products.metrics.averagePrice')}
              value={products.length ? formatMoney(products.reduce((sum, product) => sum + product.salesPrice, 0) / products.length) : formatMoney(0)}
            />
            <PageMetric icon={<Inventory2RoundedIcon fontSize="small" />} label={t('pages.products.metrics.activeWarehouseOnHand')} value={activeWarehouseOnHand.toFixed(2)} />
            <PageMetric icon={<Inventory2RoundedIcon fontSize="small" />} label={t('pages.products.metrics.activeWarehouseAvailable')} value={activeWarehouseAvailable.toFixed(2)} />
            <PageMetric icon={<ReportRoundedIcon fontSize="small" />} label={t('pages.products.metrics.lowStockActiveItems')} value={lowStockProducts.length} />
          </>
        )}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadProducts() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.products.manage} /> : null}

      <PageBody>
        <Suspense fallback={<ProductSurfaceFallback />}>
          <ProductDataGrid
            rows={visibleProducts}
            isLoading={isLoading}
            expandedProductIds={expandedProductIds}
            onToggleExpanded={toggleExpandedProduct}
            onEdit={openEditDialog}
            onDelete={setDeleteTarget}
            canManage={canManage}
          />
        </Suspense>
      </PageBody>

      {canManage && isEditorOpen ? (
        <Suspense fallback={<ProductSurfaceFallback />}>
          <ProductEditorDialog
            key={`${dialogMode}:${selectedProductId ?? 'new'}`}
            open={isEditorOpen}
            mode={dialogMode}
            productId={selectedProductId}
            onClose={handleEditorClose}
            onSaved={(product, mode) => void handleSaved(product, mode)}
          />
        </Suspense>
      ) : null}

      {canManage && deleteTarget ? (
        <Suspense fallback={null}>
          <ProductDeleteDialog
            target={deleteTarget}
            isDeleting={isDeleting}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => void handleDelete()}
          />
        </Suspense>
      ) : null}
    </VxStack>
  )
}
