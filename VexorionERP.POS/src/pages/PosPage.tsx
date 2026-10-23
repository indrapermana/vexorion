import { VxBox, VxPageFeedback, VxStack } from '@vexorion/ui'
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
import type { CartLine, QuickCustomerForm } from '../components/pos/types'
import { posLogger } from '../lib/posLogger'
import {
  createCustomer,
  createCustomerPayment,
  createSalesInvoice,
  createSalesInvoiceLine,
  createSalesOrder,
  createSalesOrderLine,
  createSalesShipment,
  getCustomers,
  getInventoryBalances,
  getProducts,
  getWarehouses,
  postSalesShipment,
  validatePosStock,
} from '../lib/api'
import type {
  CreateCustomerRequest,
  CustomerListItemResponse,
  PosStockInsufficientItem,
  ProductListItemResponse,
} from '../types/api'
import { ApiError, reportClientDiagnostic } from '../lib/api/core'
import { generateDocumentNumber } from '../lib/posDocuments'
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
  const { user } = useAuth()
  const pushHistory = useTransactionHistory((state) => state.push)
  const { currentShift, openShift, closeShift, fetchCurrentShift } = useShift()
  const canManageRoles = user?.permissions.includes(PosPermissions.roles.manage) ?? false
  const canCheckout = user?.permissions.includes(PosPermissions.checkout) ?? false
  const canCloseShift = user?.permissions.includes(PosPermissions.shiftClose) ?? false
  const canRefund = user?.permissions.includes(PosPermissions.refund) ?? false

  const isShiftOpen = currentShift !== null
  const cashierName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.userName || ''

  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false)
  const [isReturnOpen, setIsReturnOpen] = useState(false)

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
  const [stockConflict, setStockConflict] = useState<PosStockInsufficientItem[] | null>(null)

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [quickCustomer, setQuickCustomer] = useState<QuickCustomerForm>({ name: '', phoneNumber: '', email: '' })

  const customersQuery = useQuery({ queryKey: ['pos', 'customers'], queryFn: getCustomers, staleTime: 60_000 })
  const inventoryBalancesQuery = useQuery({ queryKey: ['pos', 'inventory-balances'], queryFn: getInventoryBalances, staleTime: 15_000 })
  const productsQuery = useQuery({ queryKey: ['pos', 'products'], queryFn: getProducts, staleTime: 300_000 })
  const warehousesQuery = useQuery({ queryKey: ['pos', 'warehouses'], queryFn: getWarehouses, staleTime: 300_000 })

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
    setError(null)
    setCheckoutResult(null)
    setStockConflict(null)

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

    setIsProcessing(true)

    try {
      // Item 13: server-side stock pre-check before creating any documents
      const stockCheck = await validatePosStock({
        lines: cart.map((line) => ({
          productId: line.productId,
          warehouseId: selectedWarehouse.id,
          quantity: line.quantity,
        })),
      })

      if (!stockCheck.isValid) {
        setStockConflict(stockCheck.insufficientItems)
        return
      }

      let customerId = selectedCustomerId
      const customerSnapshot = customersQuery.data ?? []
      if (selectedCustomerId === GUEST_CUSTOMER_TAG) {
        customerId = await ensureGuestCustomer(customerSnapshot)
      }

      const order = await createSalesOrder({
        orderNumber: generateDocumentNumber('SO-POS'),
        customerId,
        warehouseId: selectedWarehouse.id,
        orderDate: new Date().toISOString().slice(0, 10),
        requiredDate: new Date().toISOString().slice(0, 10),
        status: 2,
        currencyCode,
        notes: notes.trim() || null,
      })

      const orderLineIds: Array<{ salesOrderLineId: string; productId: string; unitPrice: number; quantity: number; discountAmount: number }> = []
      for (const line of cart) {
        const createdOrderLine = await createSalesOrderLine(order.id, {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
        })

        orderLineIds.push({
          salesOrderLineId: createdOrderLine.id,
          productId: line.productId,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          discountAmount: line.discountAmount,
        })
      }

      let shipmentId: string | undefined
      if (orderLineIds.length > 0) {
        const shipment = await createSalesShipment({
          shipmentNumber: generateDocumentNumber('SHP-POS'),
          salesOrderId: order.id,
          warehouseId: selectedWarehouse.id,
          shipmentDate: new Date().toISOString().slice(0, 10),
          notes: isDelivery ? 'Delivery order from POS' : 'Counter sale from POS',
          lines: orderLineIds.map((line) => ({
            salesOrderLineId: line.salesOrderLineId,
            productId: line.productId,
            shippedQuantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        })

        shipmentId = shipment.id

        if (!isDelivery) {
          await postSalesShipment(shipment.id)
        }
      }

      const invoice = await createSalesInvoice({
        invoiceNumber: generateDocumentNumber('INV-POS'),
        customerId,
        sourceSalesOrderId: order.id,
        sourceSalesShipmentId: shipmentId ?? null,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        paymentTermId: null,
        status: 2,
        currencyCode,
        notes: notes.trim() || null,
      })

      for (const line of cart) {
        await createSalesInvoiceLine(invoice.id, {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxAmount: 0,
          taxCodeId: null,
        })
      }

      let paymentId: string | undefined
      if (paymentAmount > 0) {
        const payment = await createCustomerPayment({
          customerId,
          salesInvoiceId: invoice.id,
          paymentDate: new Date().toISOString().slice(0, 10),
          amount: paymentAmount,
          currencyCode,
          paymentMethod,
          notes: 'POS checkout payment',
          referenceNumber: null,
        })
        paymentId = payment.id
      }

      setCheckoutResult({ orderId: order.id, shipmentId, invoiceId: invoice.id, paymentId })

      posLogger.info('checkout.success', {
        durationMs: Math.round(performance.now() - startTime),
        cartLineCount: cart.length,
        grandTotal,
        paymentMethod,
        orderId: order.id,
        invoiceId: invoice.id,
      })

      const cartSnapshot = [...cart]
      const customerLabel =
        selectedCustomerId === GUEST_CUSTOMER_TAG
          ? 'Guest'
          : (activeCustomerOptions.find((c) => c.id === customerId)?.name ?? customerId)

      // Build receipt data before clearing the cart (Items 1–3)
      setReceiptData({
        completedAt: new Date().toISOString(),
        customerLabel,
        currencyCode,
        lines: cartSnapshot,
        paymentAmount,
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
        completedAt: new Date().toISOString(),
        customerLabel,
        currencyCode,
        grandTotal,
        paymentAmount,
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
      setNotes('')
      setPaymentAmount(0)
      setIsDelivery(false)
    } catch (requestError) {
      const durationMs = Math.round(performance.now() - startTime)

      if (requestError instanceof ApiError && requestError.code === 'inventory.insufficient_stock') {
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
        setError(requestError instanceof ApiError ? requestError.message : t('page.processingError'))
      }
    } finally {
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
        canRefund={canRefund}
        onOpenReturn={() => setIsReturnOpen(true)}
      />

      <VxPageFeedback
        error={error}
        success={checkoutResult ? t('page.checkoutCompleted', {
            orderId: checkoutResult.orderId,
            invoiceId: checkoutResult.invoiceId,
            shipment: checkoutResult.shipmentId ? `, Shipment: ${checkoutResult.shipmentId}` : '',
            payment: checkoutResult.paymentId ? `, Payment: ${checkoutResult.paymentId}` : '',
          }) : undefined}
      />

      <VxBox sx={{ display: 'grid', gap: 2, minWidth: 0, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 3fr) minmax(0, 1fr)' } }}>
        <ProductCatalogPanel
          selectedCustomerId={selectedCustomerId}
          selectedWarehouseId={selectedWarehouseId}
          activeCustomerOptions={activeCustomerOptions}
          warehouses={warehouses}
          products={products}
          stockByProduct={stockByProduct}
          currencyCode={currencyCode}
          notes={notes}
          onCustomerChange={setSelectedCustomerId}
          onWarehouseChange={setSelectedWarehouseId}
          onOpenQuickCustomer={() => setIsQuickCreateOpen(true)}
          onAddToCart={addToCart}
          onNotesChange={setNotes}
        />

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
          canCheckout={canCheckout}
          onRemoveCartLine={removeCartLine}
          onLineDiscountChange={updateLineDiscount}
          onLineQtyChange={updateLineQuantity}
          onPaymentAmountChange={setPaymentAmount}
          onPaymentMethodChange={setPaymentMethod}
          onDeliveryChange={setIsDelivery}
          onCheckout={checkout}
        />
      </VxBox>

      <TransactionHistoryPanel />

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
        />
      ) : null}
    </VxStack>
  )
}
