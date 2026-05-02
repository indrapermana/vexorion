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

export type PosStockValidationResponse = {
  isValid: boolean
  insufficientItems: PosStockInsufficientItem[]
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
