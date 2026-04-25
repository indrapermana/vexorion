export type SalesOrderListItemResponse = {
  id: string
  orderNumber: string
  customerId: string
  warehouseId: string
  orderDate: string
  status: number
  currencyCode: string
  totalAmount: number
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