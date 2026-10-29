import { VxBox, VxButton, VxPageFeedback, VxStack, VxTab, VxTabs } from '@vexorion/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTransactionHistory } from '../app/transactionHistoryStore'
import { useAuth } from '../app/AuthContext'
import { useShift } from '../app/shiftStore'
import { TransactionHistoryPanel } from '../components/TransactionHistoryPanel'
import { useI18n } from '../app/I18nContext'
import { PosHeader } from '../components/pos/PosHeader'
import { ProductCatalogPanel } from '../components/pos/ProductCatalogPanel'
import { CartSummaryPanel } from '../components/pos/CartSummaryPanel'
import { QuickCustomerDialog } from '../components/pos/QuickCustomerDialog'
import { ShiftOpenDialog } from '../components/pos/ShiftOpenDialog'
import { ShiftCloseDialog } from '../components/pos/ShiftCloseDialog'
import ReturnRefundDialog from '../components/pos/ReturnRefundDialog'
import { StockConflictDialog } from '../components/pos/StockConflictDialog'
import { ReceiptModal, type ReceiptData } from '../components/pos/ReceiptModal'
import { PosConnectivityStatus } from '../components/PosConnectivityStatus'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import type { CartLine, QuickCustomerForm } from '../components/pos/types'
import { posLogger } from '../lib/posLogger'
import {
  createCustomer,
  getCustomers,
  getInventoryBalances,
  getProducts,
  getWarehouses,
  checkoutSale,
} from '../lib/api'
import type {
  CreateCustomerRequest,
  CustomerListItemResponse,
  PosStockInsufficientItem,
  ProductListItemResponse,
} from '../types/api'
import { ApiError, reportClientDiagnostic } from '../lib/api/core'
import { PosPermissions } from '../app/authorization'

type CheckoutResult = {
  orderId: string
  shipmentId?: string
  invoiceId: string
  paymentId?: string
}

const GUEST_CUSTOMER_TAG = '__guest__'

export default function PosPage() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const pushHistory = useTransactionHistory((state) => state.push)
  const { currentShift, openShift, closeShift, fetchCurrentShift } = useShift()
  const canManageRoles = user?.permissions.includes(PosPermissions.roles.manage) ?? false
  const canCheckout = user?.permissions.includes(PosPermissions.checkout) ?? false
  const canCloseShift = user?.permissions.includes(PosPermissions.shiftClose) ?? false
  const canRefund = user?.permissions.includes(PosPermissions.refund) ?? false
  const isOnline = useOnlineStatus()

  const isShiftOpen = currentShift !== null
  const cashierName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.userName || ''

  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false)
  const [isReturnOpen, setIsReturnOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [mobileSaleStep, setMobileSaleStep] = useState<'catalog' | 'payment'>('catalog')

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(GUEST_CUSTOMER_TAG)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [isDelivery, setIsDelivery] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasPendingCheckoutAttempt, setHasPendingCheckoutAttempt] = useState(false)
  const [stockConflict, setStockConflict] = useState<PosStockInsufficientItem[] | null>(null)

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [quickCustomer, setQuickCustomer] = useState<QuickCustomerForm>({ name: '', phoneNumber: '', email: '' })

  const customersQuery = useQuery({ queryKey: ['pos', 'customers'], queryFn: getCustomers, staleTime: 60_000 })
  const inventoryBalancesQuery = useQuery({ queryKey: ['pos', 'inventory-balances'], queryFn: getInventoryBalances, staleTime: 15_000 })
  const productsQuery = useQuery({ queryKey: ['pos', 'products'], queryFn: getProducts, staleTime: 300_000 })
  const warehousesQuery = useQuery({ queryKey: ['pos', 'warehouses'], queryFn: getWarehouses, staleTime: 300_000 })
  const previousOnlineRef = useRef(isOnline)

  useEffect(() => {
    const wasOnline = previousOnlineRef.current
    previousOnlineRef.current = isOnline

    if (!wasOnline && isOnline) {
      void Promise.all([
        customersQuery.refetch(),
        inventoryBalancesQuery.refetch(),
        productsQuery.refetch(),
        warehousesQuery.refetch(),
      ])
    }
  }, [customersQuery, inventoryBalancesQuery, isOnline, productsQuery, warehousesQuery])

  const customers = customersQuery.data ?? []
  const inventoryBalances = inventoryBalancesQuery.data?.filter((x) => x.isActive) ?? []
  const products = productsQuery.data?.filter((x) => x.isActive) ?? []
  const warehouses = warehousesQuery.data?.filter((x) => x.isActive) ?? []
  const currencyCode = useMemo(() => {
    const authCurrency = user?.currencyCode?.trim().toUpperCase()
    if (authCurrency) {
      return authCurrency
    }

    const envCurrency = import.meta.env.VITE_POS_CURRENCY_CODE?.trim().toUpperCase()
    if (envCurrency) {
      return envCurrency
    }

    return 'USD'
  }, [user?.currencyCode])

  // Rehydrate shift state from the backend on first load
  useEffect(() => {
    fetchCurrentShift()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedWarehouseId || warehouses.length === 0) {
      return
    }

    setSelectedWarehouseId(warehouses[0].id)
  }, [selectedWarehouseId, warehouses])

  const activeCustomerOptions = useMemo(() => customers.filter((x) => x.isActive), [customers])
  const stockByProduct = useMemo(() => {
    const map: Record<string, number> = {}

    for (const balance of inventoryBalances) {
      if (selectedWarehouseId && balance.warehouseId !== selectedWarehouseId) {
        continue
      }

      map[balance.productId] = (map[balance.productId] ?? 0) + balance.quantityAvailable
    }

    return map
  }, [inventoryBalances, selectedWarehouseId])

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === selectedWarehouseId)

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), [cart])
  const discountTotal = useMemo(() => cart.reduce((sum, line) => sum + line.discountAmount, 0), [cart])
  const grandTotal = Math.max(subtotal - discountTotal, 0)
  const changeAmount = Math.max(paymentAmount - grandTotal, 0)

  const addToCart = (product: ProductListItemResponse, quantity: number) => {
    setError(null)

    if (quantity <= 0) {
      setError(t('page.invalidQty'))
      return
    }

    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id)
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? {
                ...line,
                quantity: line.quantity + quantity,
              }
            : line,
        )
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.salesPrice,
          quantity,
          discountAmount: 0,
        },
      ]
    })
  }

  const removeCartLine = (productId: string) => {
    setCart((current) => current.filter((line) => line.productId !== productId))
  }

  const updateLineDiscount = (productId: string, discountAmount: number) => {
    const safeDiscount = Number.isFinite(discountAmount) ? Math.max(0, discountAmount) : 0
    setCart((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              discountAmount: safeDiscount,
            }
          : line,
      ),
    )
  }

  const updateLineQuantity = (productId: string, quantity: number) => {
    const safeQty = Math.max(1, quantity)
    setCart((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, quantity: safeQty } : line,
      ),
    )
  }

  // Stable ref so the keyboard handler always calls the latest checkout closure
  const checkoutRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const attemptRef = useRef<{ key: string; signature: string } | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (paymentMethod !== 'Cash' && paymentAmount !== grandTotal) {
      setPaymentAmount(grandTotal)
    }
  }, [grandTotal, paymentAmount, paymentMethod])

  useEffect(() => {
    setHasPendingCheckoutAttempt(false)
  }, [cart, selectedCustomerId, selectedWarehouseId, paymentAmount, paymentMethod, notes, isDelivery])

  useEffect(() => {
    if (cart.length > 0) {
      setCheckoutResult(null)
    }
  }, [cart.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // F2 → trigger checkout from anywhere
      if (event.key === 'F2') {
        event.preventDefault()
        if (!isProcessing && cart.length > 0 && canCheckout) {
          void checkoutRef.current()
        }
        return
      }

      if (isInput) return

      // Alt+1/2/3 → select payment method
      if (event.altKey) {
        if (event.key === '1') { event.preventDefault(); setPaymentMethod('Cash') }
        else if (event.key === '2') { event.preventDefault(); setPaymentMethod('Card') }
        else if (event.key === '3') { event.preventDefault(); setPaymentMethod('Transfer') }
        return
      }

      // F8 → remove the last cart line (undo accidental scan)
      if (event.key === 'F8' && cart.length > 0) {
        event.preventDefault()
        removeCartLine(cart[cart.length - 1].productId)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isProcessing, cart, canCheckout, removeCartLine])

  const ensureGuestCustomer = async (existingCustomers: CustomerListItemResponse[]) => {
    const existingGuest = existingCustomers.find((customer) => customer.name.trim().toLowerCase() === 'guest' && customer.isActive)
    if (existingGuest) {
      return existingGuest.id
    }

    const payload: CreateCustomerRequest = {
      customerNumber: `GUEST-${Date.now()}`,
      name: 'Guest',
      contactName: null,
      email: null,
      phoneNumber: null,
      billingAddress: null,
      shippingAddress: null,
      creditLimit: 0,
    }

    const createdGuest = await createCustomer(payload)
    await customersQuery.refetch()
    return createdGuest.id
  }

  const createQuickCustomer = async () => {
    if (!isOnline) {
      setError(t('connectivity.offlineMessage'))
      return
    }

    if (!quickCustomer.name.trim()) {
      setError(t('page.quickCustomerNameRequired'))
      return
    }

    const payload: CreateCustomerRequest = {
      customerNumber: `CUS-POS-${Date.now()}`,
      name: quickCustomer.name.trim(),
      contactName: quickCustomer.name.trim(),
      email: quickCustomer.email.trim() || null,
      phoneNumber: quickCustomer.phoneNumber.trim() || null,
      billingAddress: null,
      shippingAddress: null,
      creditLimit: 0,
    }

    try {
      const created = await createCustomer(payload)
      await customersQuery.refetch()
      setSelectedCustomerId(created.id)
      setIsQuickCreateOpen(false)
      setQuickCustomer({ name: '', phoneNumber: '', email: '' })
    } catch (requestError) {
      if (!(requestError instanceof ApiError)) reportClientDiagnostic('operation.failed', requestError)
      setError(requestError instanceof ApiError ? requestError.message : t('page.quickCustomerError'))
    }
  }

  const checkout = async () => {
    if (processingRef.current) {
      return
    }

    setError(null)
    setCheckoutResult(null)
    setStockConflict(null)

    if (!isOnline) {
      setError(t('cart.offlineCheckout'))
      return
    }

    if (!currentShift) {
      setError(t('shift.noShift'))
      return
    }

    if (cart.length === 0) {
      setError(t('page.cartEmpty'))
      return
    }

    if (!selectedWarehouse) {
      setError(t('page.selectWarehouse'))
      return
    }

    if (paymentAmount < grandTotal) {
      setError(t('page.paymentLower'))
      return
    }

    const startTime = performance.now()
    posLogger.info('checkout.start', {
      cartLineCount: cart.length,
      grandTotal,
      paymentMethod,
      warehouseId: selectedWarehouse.id,
    })

    processingRef.current = true
    setIsProcessing(true)
    setHasPendingCheckoutAttempt(false)

    try {
      let customerId = selectedCustomerId
      const customerSnapshot = customersQuery.data ?? []
      if (selectedCustomerId === GUEST_CUSTOMER_TAG) {
        customerId = await ensureGuestCustomer(customerSnapshot)
      }

      const saleRequest = {
        shiftId: currentShift.id,
        customerId,
        warehouseId: selectedWarehouse.id,
        isDelivery,
        notes: notes.trim() || null,
        paymentMethod,
        paymentAmount,
        lines: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
        })),
      }

      // Reuse the key while the same sale is retried so an unknown outcome can never create a duplicate.
      const signature = JSON.stringify(saleRequest)
      if (attemptRef.current?.signature !== signature) {
        attemptRef.current = { key: crypto.randomUUID(), signature }
      }

      const sale = await checkoutSale({ idempotencyKey: attemptRef.current.key, ...saleRequest })
      attemptRef.current = null
      setHasPendingCheckoutAttempt(false)

      const order = { id: sale.salesOrderId }
      const invoice = { id: sale.salesInvoiceId }
      const shipmentId: string | undefined = sale.salesShipmentId
      const paymentId: string | undefined = sale.customerPaymentId ?? undefined

      setCheckoutResult({ orderId: order.id, shipmentId, invoiceId: invoice.id, paymentId })

      posLogger.info('checkout.success', {
        durationMs: Math.round(performance.now() - startTime),
        cartLineCount: cart.length,
        grandTotal,
        paymentMethod,
        orderId: order.id,
        invoiceId: invoice.id,
      })

      const authoritativeLines = new Map(sale.lines.map((line) => [line.productId, line]))
      const cartSnapshot = cart.map((line) => {
        const authoritative = authoritativeLines.get(line.productId)
        return authoritative
          ? {
              ...line,
              quantity: authoritative.quantity,
              unitPrice: authoritative.unitPrice,
              discountAmount: authoritative.discountAmount,
            }
          : line
      })
      const customerLabel =
        selectedCustomerId === GUEST_CUSTOMER_TAG
          ? 'Guest'
          : (activeCustomerOptions.find((c) => c.id === customerId)?.name ?? customerId)

      // Build receipt data before clearing the cart (Items 1–3)
      setReceiptData({
        completedAt: sale.completedAtUtc,
        customerLabel,
        currencyCode: sale.currencyCode,
        lines: cartSnapshot,
        paymentAmount: sale.amountTendered,
        paymentMethod,
        isDelivery,
        orderId: order.id,
        invoiceId: invoice.id,
        shipmentId,
        paymentId,
      })

      pushHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        shiftId: currentShift?.id,
        completedAt: sale.completedAtUtc,
        customerLabel,
        currencyCode: sale.currencyCode,
        grandTotal: sale.grandTotal,
        paymentAmount: sale.amountTendered,
        paymentMethod,
        lineCount: cartSnapshot.length,
        isDelivery,
        orderId: order.id,
        invoiceId: invoice.id,
        shipmentId,
        paymentId,
        lines: cartSnapshot,
      })

      setCart([])
      setMobileSaleStep('catalog')
      setNotes('')
      setPaymentAmount(0)
      setIsDelivery(false)
    } catch (requestError) {
      const durationMs = Math.round(performance.now() - startTime)

      if (requestError instanceof ApiError && requestError.code === 'inventory.insufficient_stock') {
        attemptRef.current = null
        posLogger.warn('checkout.failure', {
          reason: 'stock_conflict_concurrent',
          durationMs,
          errorStatus: requestError.status,
          errorMessage: requestError.message,
        })
        // Concurrent stock failure from shipment post — show conflict with current known stock
        const refreshedBalances = await inventoryBalancesQuery.refetch()
        const refreshedStockByProduct = Object.fromEntries(
          (refreshedBalances.data ?? []).map((balance) => [balance.productId, balance.quantityOnHand]),
        )
        setStockConflict(
          cart
            .map((line) => ({
              productId: line.productId,
              available: refreshedStockByProduct[line.productId] ?? 0,
              requested: line.quantity,
            }))
            .filter((item) => item.requested > item.available),
        )
      } else {
        posLogger.error('checkout.failure')
        if (!(requestError instanceof ApiError)) reportClientDiagnostic('operation.failed', requestError)
        const hasUnknownOutcome = !(requestError instanceof ApiError) || requestError.status === 0 || requestError.status >= 500
        if (hasUnknownOutcome) {
          setHasPendingCheckoutAttempt(true)
          setError(requestError instanceof ApiError ? requestError.message : t('page.checkoutUnknownOutcome'))
        } else {
          attemptRef.current = null
          setError(requestError.message)
        }
      }
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }

    useEffect(() => {
      checkoutRef.current = checkout
    }, [checkout])

  return (
    <VxStack component="main" spacing={2} sx={{ p: 2 }}>
      <PosHeader
        canManageRoles={canManageRoles}
        currencyCode={currencyCode}
        isShiftOpen={isShiftOpen}
        canCloseShift={canCloseShift}
        shiftOpenedAt={currentShift?.openedAt}
        onCloseShift={() => setIsCloseShiftOpen(true)}
        canRefund={canRefund && isShiftOpen}
        onOpenReturn={() => setIsReturnOpen(true)}
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={() => setIsHistoryOpen((current) => !current)}
        onSignOut={logout}
      />

      <PosConnectivityStatus isOnline={isOnline} />

      <VxPageFeedback
        error={error}
        success={checkoutResult ? t('page.checkoutCompleted', {
            orderId: checkoutResult.orderId,
            invoiceId: checkoutResult.invoiceId,
            shipment: checkoutResult.shipmentId ? `, Shipment: ${checkoutResult.shipmentId}` : '',
            payment: checkoutResult.paymentId ? `, Payment: ${checkoutResult.paymentId}` : '',
          }) : undefined}
      />

      <VxTabs
        value={mobileSaleStep}
        onChange={(_, value: 'catalog' | 'payment') => setMobileSaleStep(value)}
        aria-label={t('cart.flowAria')}
        variant="fullWidth"
        sx={{ display: { xs: 'flex', lg: 'none' } }}
      >
        <VxTab value="catalog" label={t('catalog.title')} />
        <VxTab value="payment" disabled={cart.length === 0} label={t('cart.items', { count: cart.length })} />
      </VxTabs>

      <VxBox sx={{ display: 'grid', gap: 2, minWidth: 0, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.35fr) minmax(380px, 1fr)' } }}>
        <VxBox sx={{ display: { xs: mobileSaleStep === 'catalog' ? 'block' : 'none', lg: 'block' }, minWidth: 0 }}>
          <ProductCatalogPanel
            selectedCustomerId={selectedCustomerId}
            selectedWarehouseId={selectedWarehouseId}
            activeCustomerOptions={activeCustomerOptions}
            warehouses={warehouses}
            products={products}
            stockByProduct={stockByProduct}
            currencyCode={currencyCode}
            notes={notes}
            isLoading={productsQuery.isLoading || inventoryBalancesQuery.isLoading || warehousesQuery.isLoading}
            hasLoadError={productsQuery.isError || inventoryBalancesQuery.isError || warehousesQuery.isError}
            onCustomerChange={setSelectedCustomerId}
            onWarehouseChange={setSelectedWarehouseId}
            onOpenQuickCustomer={() => {
              if (!isOnline) {
                setError(t('connectivity.offlineMessage'))
                return
              }
              setIsQuickCreateOpen(true)
            }}
            onAddToCart={addToCart}
            onNotesChange={setNotes}
            onRetryLoad={() => {
              void Promise.all([
                inventoryBalancesQuery.refetch(),
                productsQuery.refetch(),
                warehousesQuery.refetch(),
              ])
            }}
          />
          <VxButton
            variant="contained"
            fullWidth
            disabled={cart.length === 0}
            onClick={() => setMobileSaleStep('payment')}
            sx={{ mt: 1.5, display: { xs: 'inline-flex', lg: 'none' } }}
          >
            {t('cart.reviewPayment', { count: cart.length })}
          </VxButton>
        </VxBox>

        <VxBox sx={{ display: { xs: mobileSaleStep === 'payment' ? 'block' : 'none', lg: 'block' }, minWidth: 0 }}>
          <CartSummaryPanel
            cart={cart}
            stockByProduct={stockByProduct}
            subtotal={subtotal}
            discountTotal={discountTotal}
            grandTotal={grandTotal}
            changeAmount={changeAmount}
            currencyCode={currencyCode}
            paymentAmount={paymentAmount}
            paymentMethod={paymentMethod}
            isDelivery={isDelivery}
            isProcessing={isProcessing}
            hasPendingAttempt={hasPendingCheckoutAttempt}
            canCheckout={canCheckout}
            isOnline={isOnline}
            onBackToCatalog={() => setMobileSaleStep('catalog')}
            onRemoveCartLine={removeCartLine}
            onLineDiscountChange={updateLineDiscount}
            onLineQtyChange={updateLineQuantity}
            onPaymentAmountChange={setPaymentAmount}
            onPaymentMethodChange={setPaymentMethod}
            onDeliveryChange={setIsDelivery}
            onCheckout={checkout}
          />
        </VxBox>
      </VxBox>

      <TransactionHistoryPanel open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />

      <QuickCustomerDialog
        open={isQuickCreateOpen}
        quickCustomer={quickCustomer}
        onClose={() => setIsQuickCreateOpen(false)}
        onChange={setQuickCustomer}
        onCreate={() => void createQuickCustomer()}
      />

      <StockConflictDialog
        open={stockConflict !== null}
        insufficientItems={stockConflict ?? []}
        cart={cart}
        onAdjust={() => {
          setStockConflict(null)
          void inventoryBalancesQuery.refetch()
        }}
        onCancel={() => setStockConflict(null)}
      />

      <ReceiptModal
        open={receiptData !== null}
        data={receiptData}
        onClose={() => setReceiptData(null)}
      />

      <ShiftOpenDialog
        open={!isShiftOpen}
        currencyCode={currencyCode}
        cashierName={cashierName}
        onOpen={(openingFloat) =>
          void openShift({
            openingFloat,
            userId: user?.id ?? '',
            userName: cashierName,
            currencyCode,
          })
        }
      />

      {currentShift ? (
        <ShiftCloseDialog
          open={isCloseShiftOpen}
          shift={currentShift}
          currencyCode={currencyCode}
          onClose={() => setIsCloseShiftOpen(false)}
          onConfirm={(countedCash) => {
            void closeShift(countedCash)
            setIsCloseShiftOpen(false)
          }}
        />
      ) : null}

      {canRefund ? (
        <ReturnRefundDialog
          open={isReturnOpen}
          onClose={() => setIsReturnOpen(false)}
          products={products}
          currencyCode={currencyCode}
          cashierId={user?.id ?? ''}
          cashierName={cashierName}
          shiftId={currentShift?.id ?? ''}
        />
      ) : null}
    </VxStack>
  )
}
