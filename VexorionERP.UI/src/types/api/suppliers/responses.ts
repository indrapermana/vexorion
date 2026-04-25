export type SupplierListItemResponse = {
  id: string
  supplierNumber: string
  name: string
  email?: string | null
  isActive: boolean
}

export type SupplierDetailsResponse = {
  id: string
  tenantId: string
  supplierNumber: string
  name: string
  contactName?: string | null
  email?: string | null
  phoneNumber?: string | null
  address?: string | null
  paymentTerms?: string | null
  isActive: boolean
}