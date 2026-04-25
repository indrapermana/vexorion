import type { WarehouseDetailsResponse, WarehouseListItemResponse } from '../api'

export type WarehouseDialogMode = 'create' | 'edit'

export type WarehouseGridRow = WarehouseListItemResponse

export type WarehouseFormValues = {
  code: string
  name: string
  locationDescription: string
  isActive: boolean
}

export type WarehouseEditorDialogProps = {
  open: boolean
  mode: WarehouseDialogMode
  warehouseId?: string | null
  onClose: () => void
  onSaved: (warehouse: WarehouseDetailsResponse, mode: WarehouseDialogMode) => void
}