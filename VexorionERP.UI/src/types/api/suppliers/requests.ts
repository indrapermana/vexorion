export type CreateSupplierRequest = {
  supplierNumber: string
  name: string
  contactName?: string | null
  email?: string | null
  phoneNumber?: string | null
  address?: string | null
  paymentTerms?: string | null
}

export type UpdateSupplierRequest = CreateSupplierRequest & {
  isActive: boolean
}