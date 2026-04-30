import { Box, Chip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TenantGridRow } from '../../../types/ui'
import type { TenantListItemResponse } from '../../../types/api'

interface TenantDataGridProps {
  rows: TenantGridRow[]
  isLoading: boolean
  onEdit: (tenant: TenantListItemResponse) => void
}

export function TenantDataGrid({ rows, isLoading, onEdit }: TenantDataGridProps) {
  const { t } = useTranslation()

  const columns = useMemo<GridColDef<TenantGridRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('components.tenants.grid.columns.tenant'),
        flex: 1,
        minWidth: 200,
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t('components.tenants.grid.codePrefix')} {params.row.code}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'domain',
        headerName: t('components.tenants.grid.columns.domain'),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => params.row.domain || t('components.tenants.grid.noDomain'),
      },
      {
        field: 'createdAtUtc',
        headerName: t('components.tenants.grid.columns.createdAt'),
        flex: 1,
        minWidth: 150,
        renderCell: (params) => new Date(params.row.createdAtUtc).toLocaleDateString(),
      },
      {
        field: 'isActive',
        headerName: t('components.tenants.grid.columns.status'),
        flex: 0.8,
        minWidth: 120,
        renderCell: (params) => (
          <Chip
            label={params.row.isActive ? t('components.tenants.grid.active') : t('components.tenants.grid.inactive')}
            color={params.row.isActive ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        field: 'id',
        headerName: t('components.tenants.grid.columns.actions'),
        flex: 0.6,
        minWidth: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <button
            onClick={() => onEdit(params.row)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#6C5CE7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Edit
          </button>
        ),
      },
    ],
    [t],
  )

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={isLoading}
      pageSizeOptions={[10, 25, 50]}
      disableRowSelectionOnClick
      sx={{ height: 500 }}
    />
  )
}
