import { AddRoundedIcon, Inventory2RoundedIcon, PersonAddAltRoundedIcon, QrCodeScannerRoundedIcon, RemoveRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxDivider, VxIconButton, VxInputAdornment, VxMenuItem, VxMuiCard, VxMuiCardActions, VxMuiCardContent, VxPaper, VxPagination, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../app/I18nContext'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import type { CustomerListItemResponse, ProductListItemResponse, WarehouseListItemResponse } from '../../types/api'

const DEFAULT_PAGE_SIZE = 50
const quantityFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currencyCode} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

function formatQuantity(value: number) {
  return quantityFormatter.format(value)
}

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
  currencyCode: string
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
  currencyCode,
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
  const [scanInput, setScanInput] = useState('')
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const scanFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showScanFeedback = (type: 'success' | 'error', message: string) => {
    if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current)
    setScanFeedback({ type, message })
    scanFeedbackTimerRef.current = setTimeout(() => setScanFeedback(null), type === 'error' ? 3000 : 2000)
  }

  const handleScanSubmit = (barcode: string) => {
    const needle = barcode.trim().toLowerCase()
    if (!needle) return

    // 1. Exact SKU match
    const exactMatch = products.find((p) => p.sku.toLowerCase() === needle)
    if (exactMatch) {
      onAddToCart(exactMatch, 1)
      setScanInput('')
      showScanFeedback('success', t('scan.added', { productName: exactMatch.name }))
      scanInputRef.current?.focus()
      return
    }

    // 2. SKU contains or name contains → if unique, auto-add; if multiple, filter grid
    const fuzzyMatches = products.filter(
      (p) => p.sku.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle),
    )
    if (fuzzyMatches.length === 1) {
      onAddToCart(fuzzyMatches[0], 1)
      setScanInput('')
      showScanFeedback('success', t('scan.added', { productName: fuzzyMatches[0].name }))
      scanInputRef.current?.focus()
      return
    }
    if (fuzzyMatches.length > 1) {
      setProductSearch(barcode.trim())
      setScanInput('')
      scanInputRef.current?.focus()
      return
    }

    showScanFeedback('error', t('scan.notFound', { barcode }))
    scanInputRef.current?.select()
  }

  // Global barcode wedge fallback — fires when no input element is focused
  useBarcodeScanner(handleScanSubmit)

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

  const updateQtyFromInput = (productId: string, inputValue: string) => {
    const parsed = Number(inputValue.replace(/,/g, ''))
    if (!Number.isFinite(parsed)) {
      return
    }

    updateQty(productId, parsed)
  }

  return (
    <VxPaper sx={{ p: 2, minWidth: 0, maxWidth: '100%' }}>
      <VxTypography component="h2" variant="h6" sx={{ mb: 1.5 }}>{t('catalog.title')}</VxTypography>
      <VxStack spacing={1.5}>
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <VxTextField
            inputRef={scanInputRef}
            label={t('scan.label')}
            placeholder={t('scan.placeholder')}
            value={scanInput}
            onChange={(event) => setScanInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleScanSubmit(scanInput)
              }
            }}
            autoFocus
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <VxInputAdornment position="start">
                    <QrCodeScannerRoundedIcon fontSize="small" />
                  </VxInputAdornment>
                ),
              },
            }}
          />
          <VxTextField
            label={t('catalog.search')}
            placeholder={t('catalog.searchPlaceholder')}
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            fullWidth
          />
        </VxStack>
        {scanFeedback ? (
          <VxAlert
            severity={scanFeedback.type}
            role={scanFeedback.type === 'error' ? 'alert' : 'status'}
            sx={{ py: 0.5 }}
          >
            {scanFeedback.message}
          </VxAlert>
        ) : null}

        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <VxTextField
            select
            label={t('catalog.customer')}
            value={selectedCustomerId}
            onChange={(event) => onCustomerChange(event.target.value)}
            fullWidth
          >
            <VxMenuItem value="__guest__">{t('catalog.guest')}</VxMenuItem>
            {activeCustomerOptions.map((customer) => (
              <VxMenuItem key={customer.id} value={customer.id}>
                {customer.name} ({customer.customerNumber})
              </VxMenuItem>
            ))}
          </VxTextField>
          <VxButton variant="outlined" startIcon={<PersonAddAltRoundedIcon />} onClick={onOpenQuickCustomer}>
            {t('catalog.quickCustomer')}
          </VxButton>
        </VxStack>

        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <VxTextField
            select
            label={t('catalog.warehouse')}
            value={selectedWarehouseId}
            onChange={(event) => onWarehouseChange(event.target.value)}
            fullWidth
          >
            {warehouses.map((warehouse) => (
              <VxMenuItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </VxMenuItem>
            ))}
          </VxTextField>
          <VxTextField
            select
            label={t('catalog.catalog')}
            value={selectedCatalog}
            onChange={(event) => setSelectedCatalog(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {catalogOptions.map((catalog) => (
              <VxMenuItem key={catalog} value={catalog}>
                {catalog}
              </VxMenuItem>
            ))}
          </VxTextField>
        </VxStack>

        <VxDivider />

        <VxBox
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
              <VxMuiCard key={product.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
                <VxBox
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
                  <VxTypography variant="caption" sx={{ fontWeight: 700 }}>{getProductCatalogLabel(product)}</VxTypography>
                  <VxTypography variant="caption">{product.sku}</VxTypography>
                </VxBox>
                <VxBox
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    py: 1,
                    bgcolor: 'action.hover',
                    minHeight: 64,
                  }}
                >
                  {(product.thumbnailUrl ?? product.imageUrl) ? (
                    <VxBox
                      component="img"
                      src={product.thumbnailUrl ?? product.imageUrl!}
                      alt={product.name}
                      sx={{ width: '100%', height: 64, objectFit: 'cover' }}
                    />
                  ) : (
                    <Inventory2RoundedIcon color="action" sx={{ fontSize: 28 }} />
                  )}
                </VxBox>
                <VxMuiCardContent sx={{ p: 1.25, pb: 0.75 }}>
                  <VxTypography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                    {product.name}
                  </VxTypography>
                  <VxTypography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }} noWrap>
                    {t('catalog.uom')}: {product.unitOfMeasure}
                  </VxTypography>
                  <VxTypography variant="subtitle2" sx={{ mt: 0.5 }}>
                    {formatMoney(product.salesPrice, currencyCode)}
                  </VxTypography>
                  <VxTypography
                    variant="caption"
                    color={canAdd ? 'text.secondary' : 'error.main'}
                    sx={{ mt: 0.25, display: 'block' }}
                  >
                    {canAdd
                      ? `${t('catalog.stock')}: ${formatQuantity(stockLeft)}`
                      : t('catalog.outOfStock')}
                  </VxTypography>
                </VxMuiCardContent>
                <VxMuiCardActions sx={{ px: 1, pb: 1, pt: 0, display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  <VxStack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                    <VxIconButton
                      size="small"
                      onClick={() => updateQty(product.id, qty - 1)}
                      aria-label={`${t('catalog.decreaseQty')}: ${product.name}`}
                    >
                      <RemoveRoundedIcon fontSize="small" />
                    </VxIconButton>
                    <VxTextField
                      size="small"
                      value={qty}
                      onChange={(event) => updateQtyFromInput(product.id, event.target.value)}
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '[0-9]*',
                          min: 1,
                          style: { textAlign: 'center', paddingInline: 4 },
                        },
                      }}
                      sx={{ width: 62 }}
                    />
                    <VxIconButton
                      size="small"
                      onClick={() => updateQty(product.id, qty + 1)}
                      aria-label={`${t('catalog.increaseQty')}: ${product.name}`}
                    >
                      <AddRoundedIcon fontSize="small" />
                    </VxIconButton>
                  </VxStack>
                  <VxButton
                    size="small"
                    fullWidth
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    disabled={!canAdd}
                    onClick={() => onAddToCart(product, qty)}
                  >
                    {t('catalog.add')}
                  </VxButton>
                </VxMuiCardActions>
              </VxMuiCard>
            )
          })}
        </VxBox>

        {filteredProducts.length === 0 ? (
          <VxAlert severity="info" role="status">{t('catalog.noProducts')}</VxAlert>
        ) : null}

        <VxStack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <VxTypography variant="caption" color="text.secondary">
            {t('catalog.showing', { current: pagedProducts.length, total: filteredProducts.length, size: DEFAULT_PAGE_SIZE })}
          </VxTypography>
          <VxPagination page={page} count={pageCount} onChange={(_, next) => setPage(next)} size="small" color="primary" />
        </VxStack>

        <VxTextField
          multiline
          minRows={2}
          label={t('catalog.notes')}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </VxStack>
    </VxPaper>
  )
}
