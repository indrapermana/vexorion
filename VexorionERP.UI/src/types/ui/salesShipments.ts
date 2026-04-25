import type { SalesShipmentDetailsResponse, SalesShipmentListItemResponse, WarehouseListItemResponse } from '../api'

export type SalesShipmentGridRow = SalesShipmentListItemResponse

export type SalesShipmentFormValues = {
  shipmentNumber: string
  warehouseId: string
  shipmentDate: string
  notes: string
}

export type SalesShipmentEditorDialogProps = {
  open: boolean
  salesOrderId: string
  warehouses: WarehouseListItemResponse[]
  onClose: () => void
  onSaved: (shipment: SalesShipmentDetailsResponse) => void
}
