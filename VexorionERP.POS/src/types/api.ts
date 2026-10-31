export type ValidationProblem = Record<string, string[]>

export type PosSessionResponse = {
  canCheckout: boolean
  canRefund: boolean
  canReprint: boolean
  canCloseShift: boolean
}

export type PosStockValidationLine = {
  productId: string
  warehouseId: string
  quantity: number
}

export type PosStockValidationRequest = {
  lines: PosStockValidationLine[]
}

export type PosStockInsufficientItem = {
  productId: string
  available: number
  requested: number
}

export type PosCheckoutLine = {
  productId: string
  quantity: number
  /** Deprecated compatibility value. The API resolves and returns the authoritative price. */
  unitPrice: number
  discountAmount: number
}

export type PosCheckoutRequest = {
  idempotencyKey: string
  shiftId: string
  customerId: string
  warehouseId: string
  isDelivery: boolean
  notes: string | null
  paymentMethod: string
  paymentAmount: number
  lines: PosCheckoutLine[]
}

export type PosCheckoutResponse = {
  salesOrderId: string
  orderNumber: string
  salesShipmentId: string
  shipmentNumber: string
  salesInvoiceId: string
  invoiceNumber: string
  customerPaymentId: string | null
  shiftId: string
  currencyCode: string
  grandTotal: number
  amountTendered: number
  amountApplied: number
  changeDue: number
  completedAtUtc: string
  replayed: boolean
  lines: Array<{
    productId: string
    quantity: number
    unitPrice: number
    discountAmount: number
    lineTotal: number
  }>
}

export type PosRefundRequest = {
  idempotencyKey: string
  shiftId: string
  salesInvoiceId: string
  reason: string
  lines: Array<{
    salesInvoiceLineId: string
    quantity: number
    returnToStock: boolean
  }>
}

export type PosRefundResponse = {
  refundId: string
  salesInvoiceId: string
  creditNoteId: string
  refundPaymentId: string | null
  creditNoteNumber: string
  currencyCode: string
  totalCreditAmount: number
  refundAmount: number
  appliedCreditAmount: number
  paymentMethod: string | null
  completedAtUtc: string
  replayed: boolean
  lines: Array<{
    salesInvoiceLineId: string
    productId: string
    quantity: number
    returnedToStock: boolean
  }>
}

export type PosRefundEligibleLinesResponse = {
  salesInvoiceId: string
  lines: Array<{
    salesInvoiceLineId: string
    quantitySold: number
    quantityReturned: number
    quantityRemaining: number
    canReturnToStock: boolean
  }>
}

export type PosStockValidationResponse = {
  isValid: boolean
  insufficientItems: PosStockInsufficientItem[]
}

export type OpenShiftRequest = {
  openingFloat: number
  currencyCode: string
  notes?: string | null
}

export type CloseShiftRequest = {
  countedCash: number
  varianceReason?: string | null
  notes?: string | null
}

export type PosCashMovementType = 'CashIn' | 'CashOut' | 1 | 2

export type CreatePosCashMovementRequest = {
  type: PosCashMovementType
  amount: number
  reason: string
}

export type PosCashMovementResponse = CreatePosCashMovementRequest & {
  id: string
  occurredAtUtc: string
}

export type PosShiftReconciliationResponse = {
  shiftId: string
  openingFloat: number
  cashSales: number
  cashRefunds: number
  cardSales: number
  transferSales: number
  cashIn: number
  cashOut: number
  expectedCash: number
  currencyCode: string
  movements: PosCashMovementResponse[]
}

export type ShiftSessionResponse = {
  id: string
  tenantId: string
  cashierId: string
  cashierName: string
  openedAtUtc: string
  closedAtUtc?: string | null
  openingFloat: number
  countedCash?: number | null
  cashSales: number
  cashRefunds: number
  cardSales: number
  transferSales: number
  cashIn: number
  cashOut: number
  expectedCash?: number | null
  cashVariance?: number | null
  varianceReason?: string | null
  currencyCode: string
  status: 'Open' | 'Closed' | number
  notes?: string | null
}

export type LoginRequest = {
  tenantCode: string
  userNameOrEmail: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  expiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
}

export type CurrentUserResponse = {
  id: string
  tenantId: string
  currencyCode: string
  userName: string
  email: string
  firstName?: string | null
  lastName?: string | null
  roles: string[]
  permissions: string[]
}

export type CustomerListItemResponse = {
  id: string
  customerNumber: string
  name: string
  email?: string | null
  isActive: boolean
}

export type CustomerDetailsResponse = {
  id: string
  tenantId: string
  customerNumber: string
  name: string
  contactName?: string | null
  email?: string | null
  phoneNumber?: string | null
  billingAddress?: string | null
  shippingAddress?: string | null
  creditLimit: number
  isActive: boolean
}

export type CreateCustomerRequest = {
  customerNumber: string
  name: string
  contactName?: string | null
  email?: string | null
  phoneNumber?: string | null
  billingAddress?: string | null
  shippingAddress?: string | null
  creditLimit: number
}

export type ProductListItemResponse = {
  id: string
  sku: string
  name: string
  imageUrl?: string | null
  thumbnailUrl?: string | null
  unitOfMeasure: string
  standardCost: number
  salesPrice: number
  reorderLevel: number
  isActive: boolean
}

export type WarehouseListItemResponse = {
  id: string
  code: string
  name: string
  isActive: boolean
}

export type SalesOrderDetailsResponse = {
  id: string
  tenantId: string
  orderNumber: string
  customerId: string
  warehouseId: string
  orderDate: string
  requiredDate: string
  status: number
  currencyCode: string
  totalAmount: number
  notes?: string | null
  isActive: boolean
}

export type CreateSalesOrderRequest = {
  orderNumber: string
  customerId: string
  warehouseId: string
  orderDate: string
  requiredDate: string
  status: number
  currencyCode: string
  notes?: string | null
}

export type SalesOrderLineListItemResponse = {
  id: string
  salesOrderId: string
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
  isActive: boolean
}

export type CreateSalesOrderLineRequest = {
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
}

export type SalesShipmentDetailsResponse = {
  id: string
  shipmentNumber: string
  salesOrderId: string
  warehouseId: string
  shipmentDate: string
  status: number
  notes?: string | null
  isActive: boolean
}

export type CreateSalesShipmentLineRequest = {
  salesOrderLineId: string
  productId: string
  shippedQuantity: number
  unitPrice: number
}

export type CreateSalesShipmentRequest = {
  shipmentNumber: string
  salesOrderId: string
  warehouseId: string
  shipmentDate: string
  notes?: string | null
  lines: CreateSalesShipmentLineRequest[]
}

export type SalesInvoiceDetailsResponse = {
  id: string
  invoiceNumber: string
  customerId: string
  sourceSalesOrderId?: string | null
  sourceSalesShipmentId?: string | null
  invoiceDate: string
  dueDate: string
  status: number
  currencyCode: string
  notes?: string | null
  isActive: boolean
}

export type CreateSalesInvoiceRequest = {
  invoiceNumber: string
  customerId: string
  sourceSalesOrderId?: string | null
  sourceSalesShipmentId?: string | null
  invoiceDate: string
  dueDate: string
  paymentTermId?: string | null
  status: number
  currencyCode: string
  notes?: string | null
}

export type CreateSalesInvoiceLineRequest = {
  productId: string
  taxCodeId?: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
}

export type CustomerPaymentDetailsResponse = {
  id: string
  tenantId: string
  customerId: string
  salesInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber?: string | null
  paymentMethod?: string | null
  notes?: string | null
  isActive: boolean
}

export type CreateCustomerPaymentRequest = {
  customerId: string
  salesInvoiceId: string
  paymentDate: string
  amount: number
  currencyCode: string
  referenceNumber?: string | null
  paymentMethod?: string | null
  notes?: string | null
}

export type UserListItemResponse = {
  id: string
  tenantId: string
  userName: string
  email: string
  firstName?: string | null
  lastName?: string | null
  roles: string[]
  isActive: boolean
}

export type AssignUserRolesRequest = {
  roles: string[]
}

export type CompanyListItemResponse = {
  id: string
  code: string
  name: string
  email?: string | null
  currencyCode: string
  isActive: boolean
}

export type SalesInvoiceListItemResponse = {
  id: string
  invoiceNumber: string
  customerId: string
  invoiceDate: string
  currencyCode: string
  grandTotal: number
  paidTotal: number
  balanceDue: number
  isActive: boolean
}

export type SalesInvoiceLineListItemResponse = {
  id: string
  salesInvoiceId: string
  productId: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  isActive: boolean
}

export type InventoryBalanceListItemResponse = {
  id: string
  productId: string
  warehouseId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  isActive: boolean
}
