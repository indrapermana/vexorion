import { Alert, Box, Stack } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTransactionHistory } from '../app/transactionHistoryStore'
import { useAuth } from '../app/AuthContext'
import { TransactionHistoryPanel } from '../components/TransactionHistoryPanel'
import { useI18n } from '../app/I18nContext'
import { PosHeader } from '../components/pos/PosHeader'
import { ProductCatalogPanel } from '../components/pos/ProductCatalogPanel'
import { CartSummaryPanel } from '../components/pos/CartSummaryPanel'
import { QuickCustomerDialog } from '../components/pos/QuickCustomerDialog'
import type { CartLine, QuickCustomerForm } from '../components/pos/types'
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
} from '../lib/api'
import type {
  CreateCustomerRequest,
  CustomerListItemResponse,
  ProductListItemResponse,
} from '../types/api'

type CheckoutResult = {
  orderId: string
  shipmentId?: string
  invoiceId: string
  paymentId?: string
}

const GUEST_CUSTOMER_TAG = '__guest__'

function generateDocumentNumber(prefix: string) {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `${prefix}-${stamp}`
}

export default function PosPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const pushHistory = useTransactionHistory((state) => state.push)
  const canManageRoles = user?.permissions.includes('roles.manage') ?? false

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(GUEST_CUSTOMER_TAG)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [isDelivery, setIsDelivery] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [quickCustomer, setQuickCustomer] = useState<QuickCustomerForm>({ name: '', phoneNumber: '', email: '' })

  const customersQuery = useQuery({ queryKey: ['pos', 'customers'], queryFn: getCustomers })
  const inventoryBalancesQuery = useQuery({ queryKey: ['pos', 'inventory-balances'], queryFn: getInventoryBalances })
  const productsQuery = useQuery({ queryKey: ['pos', 'products'], queryFn: getProducts })
  const warehousesQuery = useQuery({ queryKey: ['pos', 'warehouses'], queryFn: getWarehouses })

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
      console.error(requestError)
      setError(t('page.quickCustomerError'))
    }
  }

  const checkout = async () => {
    setError(null)
    setCheckoutResult(null)

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

    setIsProcessing(true)

    try {
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

      const customerLabel =
        selectedCustomerId === GUEST_CUSTOMER_TAG
          ? 'Guest'
          : (activeCustomerOptions.find((c) => c.id === customerId)?.name ?? customerId)

      pushHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        completedAt: new Date().toISOString(),
        customerLabel,
        grandTotal,
        paymentAmount,
        paymentMethod,
        lineCount: cart.length,
        isDelivery,
        orderId: order.id,
        invoiceId: invoice.id,
        shipmentId,
        paymentId,
      })

      setCart([])
      setNotes('')
      setPaymentAmount(0)
      setIsDelivery(false)
    } catch (requestError) {
      console.error(requestError)
      setError(t('page.processingError'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <PosHeader canManageRoles={canManageRoles} currencyCode={currencyCode} />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {checkoutResult ? (
        <Alert severity="success">
          {t('page.checkoutCompleted', {
            orderId: checkoutResult.orderId,
            invoiceId: checkoutResult.invoiceId,
            shipment: checkoutResult.shipmentId ? `, Shipment: ${checkoutResult.shipmentId}` : '',
            payment: checkoutResult.paymentId ? `, Payment: ${checkoutResult.paymentId}` : '',
          })}
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '3fr 1fr' } }}>
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
          subtotal={subtotal}
          discountTotal={discountTotal}
          grandTotal={grandTotal}
          changeAmount={changeAmount}
          currencyCode={currencyCode}
          paymentAmount={paymentAmount}
          paymentMethod={paymentMethod}
          isDelivery={isDelivery}
          isProcessing={isProcessing}
          onRemoveCartLine={removeCartLine}
          onLineDiscountChange={updateLineDiscount}
          onPaymentAmountChange={setPaymentAmount}
          onPaymentMethodChange={setPaymentMethod}
          onDeliveryChange={setIsDelivery}
          onCheckout={checkout}
        />
      </Box>

      <TransactionHistoryPanel />

      <QuickCustomerDialog
        open={isQuickCreateOpen}
        quickCustomer={quickCustomer}
        onClose={() => setIsQuickCreateOpen(false)}
        onChange={setQuickCustomer}
        onCreate={() => void createQuickCustomer()}
      />
    </Stack>
  )
}
