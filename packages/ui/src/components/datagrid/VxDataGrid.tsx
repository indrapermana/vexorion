import { DataGrid } from '@mui/x-data-grid'
import type { DataGridProps, GridPaginationModel } from '@mui/x-data-grid'
import { useState } from 'react'

type VxDataGridProps = DataGridProps & {
  preferenceKey?: string
}

function loadPaginationPreference(preferenceKey: string | undefined): GridPaginationModel | undefined {
  if (!preferenceKey || typeof window === 'undefined') return undefined

  try {
    const value = window.localStorage.getItem(`vexorion:grid:${preferenceKey}:pagination`)
    if (!value) return undefined
    const parsed = JSON.parse(value) as Partial<GridPaginationModel>
    if (!Number.isInteger(parsed.pageSize) || Number(parsed.pageSize) <= 0) return undefined
    return { page: 0, pageSize: Number(parsed.pageSize) }
  } catch {
    return undefined
  }
}

const defaultGridSx = {
  border: 'none',
  minWidth: 0,
  '--DataGrid-containerBackground': 'transparent',
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: 'rgba(108, 92, 231, 0.06)',
    borderBottom: '1px solid rgba(108, 92, 231, 0.08)',
  },
  '& .MuiDataGrid-cell': {
    borderColor: 'rgba(108, 92, 231, 0.06)',
  },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
    outlineOffset: -2,
  },
}

export function VxDataGrid({
  disableRowSelectionOnClick = true,
  density = 'compact',
  initialState,
  onPaginationModelChange,
  pageSizeOptions = [10, 25, 50],
  paginationModel,
  preferenceKey,
  showToolbar = true,
  slotProps,
  sx,
  ...props
}: VxDataGridProps) {
  const [preferredPaginationModel, setPreferredPaginationModel] = useState<GridPaginationModel | undefined>(
    () => loadPaginationPreference(preferenceKey),
  )

  const handlePaginationModelChange: NonNullable<DataGridProps['onPaginationModelChange']> = (model, details) => {
    if (preferenceKey && typeof window !== 'undefined') {
      window.localStorage.setItem(`vexorion:grid:${preferenceKey}:pagination`, JSON.stringify({ pageSize: model.pageSize }))
      setPreferredPaginationModel(model)
    }
    onPaginationModelChange?.(model, details)
  }

  return (
    <DataGrid
      {...props}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      density={density}
      initialState={{
        ...initialState,
        pagination: {
          paginationModel: { page: 0, pageSize: 10 },
          ...initialState?.pagination,
        },
      }}
      pageSizeOptions={pageSizeOptions}
      paginationModel={paginationModel ?? preferredPaginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      showToolbar={showToolbar}
      slotProps={{
        ...slotProps,
        toolbar: {
          showQuickFilter: true,
          ...slotProps?.toolbar,
        },
      }}
      sx={[defaultGridSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  )
}
