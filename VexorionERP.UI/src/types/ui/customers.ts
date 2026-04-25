import type { CustomerDetailsResponse, CustomerListItemResponse } from '../api'

export type CustomerDialogMode = 'create' | 'edit'

export type CustomerGridRow = CustomerListItemResponse

export type CustomerFormValues = {
  customerNumber: string
  name: string
  contactName: string
  email: string
  phoneNumber: string
  billingAddress: string
  shippingAddress: string
  creditLimit: number
  isActive: boolean
}

export type CustomerEditorDialogProps = {
  open: boolean
  mode: CustomerDialogMode
  customerId?: string | null
  onClose: () => void
  onSaved: (customer: CustomerDetailsResponse, mode: CustomerDialogMode) => void
}