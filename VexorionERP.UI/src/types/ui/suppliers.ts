import type { SupplierDetailsResponse, SupplierListItemResponse } from '../api'

export type SupplierDialogMode = 'create' | 'edit'

export type SupplierGridRow = SupplierListItemResponse

export type SupplierFormValues = {
  supplierNumber: string
  name: string
  contactName: string
  email: string
  phoneNumber: string
  address: string
  paymentTerms: string
  isActive: boolean
}

export type SupplierEditorDialogProps = {
  open: boolean
  mode: SupplierDialogMode
  supplierId?: string | null
  onClose: () => void
  onSaved: (supplier: SupplierDetailsResponse, mode: SupplierDialogMode) => void
}