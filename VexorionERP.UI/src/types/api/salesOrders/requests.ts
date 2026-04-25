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

export type UpdateSalesOrderRequest = CreateSalesOrderRequest & {
  isActive: boolean
}