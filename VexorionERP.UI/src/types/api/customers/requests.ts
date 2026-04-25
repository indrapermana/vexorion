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

export type UpdateCustomerRequest = CreateCustomerRequest & {
  isActive: boolean
}