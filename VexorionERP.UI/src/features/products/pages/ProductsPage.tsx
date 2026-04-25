import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import SellRoundedIcon from '@mui/icons-material/SellRounded'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, deleteProduct, getProducts } from '../../../lib/api'
import type { ProductDetailsResponse, ProductListItemResponse } from '../../../types/api'
import type { ProductDialogMode } from '../../../types/ui'

const ProductEditorDialog = lazy(() => import('../components/ProductEditorDialog'))
const ProductDataGrid = lazy(() => import('../components/ProductDataGrid'))
const ProductDeleteDialog = lazy(() => import('../components/ProductDeleteDialog'))

function ProductSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading product tools...</Typography>
      </Stack>
    </Box>
  )
}

export default function ProductsPage() {
  const { isAuthenticated } = useAuth()
  const [products, setProducts] = useState<ProductListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<ProductDialogMode>('create')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductListItemResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadProducts = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getProducts()
      setProducts(result)
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

  if (!isAuthenticated) {
    return (
      <Alert severity="info">Sign in first. The products API requires an authenticated user with product view permissions.</Alert>
    )
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Products</Typography>
            <Typography color="text.secondary">
              Live list from `/api/products`, rendered as an admin-grade MUI data grid.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
              New product
            </Button>
            <Paper elevation={0} className="products-metric-card">
              <Inventory2RoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">Catalog rows</Typography>
                <Typography variant="h6">{products.length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <CheckCircleRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">Active items</Typography>
                <Typography variant="h6">{products.filter((product) => product.isActive).length}</Typography>
              </Box>
            </Paper>
            <Paper elevation={0} className="products-metric-card">
              <SellRoundedIcon fontSize="small" />
              <Box>
                <Typography variant="body2" color="text.secondary">Average price</Typography>
                <Typography variant="h6">
                  ${products.length ? (products.reduce((sum, product) => sum + product.salesPrice, 0) / products.length).toFixed(2) : '0.00'}
                </Typography>
              </Box>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<ProductSurfaceFallback />}>
          <ProductDataGrid
            rows={products}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={setDeleteTarget}
          />
        </Suspense>
      </Paper>

      {isEditorOpen ? (
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

      {deleteTarget ? (
        <Suspense fallback={null}>
          <ProductDeleteDialog
            target={deleteTarget}
            isDeleting={isDeleting}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => void handleDelete()}
          />
        </Suspense>
      ) : null}
    </Stack>
  )
}