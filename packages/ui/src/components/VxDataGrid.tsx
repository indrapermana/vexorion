import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import type { DataGridProps, GridColDef } from '@mui/x-data-grid'

export function VxDataGrid(props: DataGridProps) {
  return <DataGrid {...props} />
}

export { GridActionsCellItem as VxGridActionsCellItem }
export type { GridColDef as VxGridColDef }
