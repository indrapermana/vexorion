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