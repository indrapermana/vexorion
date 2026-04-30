import type { TenantListItemResponse } from '../api'

export type TenantGridRow = TenantListItemResponse

export type TenantFormValues = {
  name: string
  domain?: string | null
  isActive?: boolean
}

export type TenantEditorDialogProps = {
  open: boolean
  tenant: TenantListItemResponse | null
  onClose: () => void
  onSaved: (tenant: TenantListItemResponse) => void
}
