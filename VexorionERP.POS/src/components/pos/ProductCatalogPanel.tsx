import AddRoundedIcon from '@mui/icons-material/AddRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../app/I18nContext'
import type { CustomerListItemResponse, ProductListItemResponse, WarehouseListItemResponse } from '../../types/api'

const DEFAULT_PAGE_SIZE = 50

function getProductCatalogLabel(product: ProductListItemResponse) {
  const skuPrefix = product.sku.split('-')[0]?.trim()
  if (skuPrefix) {
    return skuPrefix.toUpperCase()
  }

  return product.unitOfMeasure.toUpperCase()
}

type ProductCatalogPanelProps = {
  selectedCustomerId: string
  selectedWarehouseId: string
  activeCustomerOptions: CustomerListItemResponse[]
  warehouses: WarehouseListItemResponse[]
  products: ProductListItemResponse[]
  stockByProduct: Record<string, number>
  notes: string
  onCustomerChange: (customerId: string) => void
  onWarehouseChange: (warehouseId: string) => void
  onOpenQuickCustomer: () => void
  onAddToCart: (product: ProductListItemResponse, quantity: number) => void
  onNotesChange: (value: string) => void
}

export function ProductCatalogPanel({
  selectedCustomerId,
  selectedWarehouseId,
  activeCustomerOptions,
  warehouses,
  products,
  stockByProduct,
  notes,
  onCustomerChange,
  onWarehouseChange,
  onOpenQuickCustomer,
  onAddToCart,
  onNotesChange,
}: ProductCatalogPanelProps) {
  const { t } = useI18n()
  const [selectedCatalog, setSelectedCatalog] = useState('ALL')
  const [productSearch, setProductSearch] = useState('')
  const [page, setPage] = useState(1)
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({})

  const catalogOptions = useMemo(() => {
    const unique = new Set(products.map(getProductCatalogLabel))
    return ['ALL', ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [products])

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase()
    return products.filter((product) => {
      if (selectedCatalog !== 'ALL' && getProductCatalogLabel(product) !== selectedCatalog) {
        return false
      }

      if (!search) {
        return true
      }

      return product.name.toLowerCase().includes(search) || product.sku.toLowerCase().includes(search)
    })
  }, [products, productSearch, selectedCatalog])

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / DEFAULT_PAGE_SIZE))

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * DEFAULT_PAGE_SIZE
    return filteredProducts.slice(start, start + DEFAULT_PAGE_SIZE)
  }, [filteredProducts, page])

  const getQty = (productId: string) => qtyByProduct[productId] ?? 1

  const updateQty = (productId: string, nextQty: number) => {
    setQtyByProduct((current) => ({ ...current, [productId]: Math.max(1, nextQty) }))
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>{t('catalog.title')}</Typography>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            select
            label={t('catalog.customer')}
            value={selectedCustomerId}
            onChange={(event) => onCustomerChange(event.target.value)}
            fullWidth
          >
            <MenuItem value="__guest__">{t('catalog.guest')}</MenuItem>
            {activeCustomerOptions.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>
                {customer.name} ({customer.customerNumber})
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" startIcon={<PersonAddAltRoundedIcon />} onClick={onOpenQuickCustomer}>
            {t('catalog.quickCustomer')}
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            select
            label={t('catalog.warehouse')}
            value={selectedWarehouseId}
            onChange={(event) => onWarehouseChange(event.target.value)}
            fullWidth
          >
            {warehouses.map((warehouse) => (
              <MenuItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('catalog.catalog')}
            value={selectedCatalog}
            onChange={(event) => setSelectedCatalog(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {catalogOptions.map((catalog) => (
              <MenuItem key={catalog} value={catalog}>
                {catalog}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('catalog.search')}
            placeholder={t('catalog.searchPlaceholder')}
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            fullWidth
          />
        </Stack>

        <Divider />

        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              xl: 'repeat(5, minmax(0, 1fr))',
            },
          }}
        >
          {pagedProducts.map((product) => {
            const qty = getQty(product.id)
            const stockLeft = stockByProduct[product.id] ?? 0
            const canAdd = stockLeft > 0

            return (
              <Card key={product.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{getProductCatalogLabel(product)}</Typography>
                  <Typography variant="caption">{product.sku}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    py: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Inventory2RoundedIcon color="action" sx={{ fontSize: 28 }} />
                </Box>
                <CardContent sx={{ p: 1.25, pb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }} noWrap>
                    {t('catalog.uom')}: {product.unitOfMeasure}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    {product.salesPrice.toFixed(2)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={canAdd ? 'text.secondary' : 'error.main'}
                    sx={{ mt: 0.25, display: 'block' }}
                  >
                    {canAdd
                      ? `${t('catalog.stock')}: ${stockLeft.toFixed(2)}`
                      : t('catalog.outOfStock')}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 1, pb: 1, pt: 0, display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                    <IconButton size="small" onClick={() => updateQty(product.id, qty - 1)}>
                      <RemoveRoundedIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                      {qty}
                    </Typography>
                    <IconButton size="small" onClick={() => updateQty(product.id, qty + 1)}>
                      <AddRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Button
                    size="small"
                    fullWidth
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    disabled={!canAdd}
                    onClick={() => onAddToCart(product, qty)}
                  >
                    {t('catalog.add')}
                  </Button>
                </CardActions>
              </Card>
            )
          })}
        </Box>

        {filteredProducts.length === 0 ? (
          <Alert severity="info">{t('catalog.noProducts')}</Alert>
        ) : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Typography variant="caption" color="text.secondary">
            {t('catalog.showing', { current: pagedProducts.length, total: filteredProducts.length, size: DEFAULT_PAGE_SIZE })}
          </Typography>
          <Pagination page={page} count={pageCount} onChange={(_, next) => setPage(next)} size="small" color="primary" />
        </Stack>

        <TextField
          multiline
          minRows={2}
          label={t('catalog.notes')}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </Stack>
    </Paper>
  )
}
