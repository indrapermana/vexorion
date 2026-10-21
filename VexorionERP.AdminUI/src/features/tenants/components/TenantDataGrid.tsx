import { VxBox, VxChip, VxTypography } from '@vexorion/ui'
import { VxDataGrid, type VxGridColDef } from '@vexorion/ui'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TenantGridRow } from '../../../types/ui'
import type { TenantListItemResponse, TenantModuleEffectiveAccessResponse } from '../../../types/api'

interface TenantDataGridProps {
  rows: TenantGridRow[]
  isLoading: boolean
  onEdit: (tenant: TenantListItemResponse) => void
  onRemove: (tenant: TenantListItemResponse) => void
  effectiveAccessByTenantId?: Record<string, TenantModuleEffectiveAccessResponse>
  canManage?: boolean
}

export function TenantDataGrid({ rows, isLoading, onEdit, onRemove, effectiveAccessByTenantId, canManage = true }: TenantDataGridProps) {
  const { t } = useTranslation()

  const columns = useMemo<VxGridColDef<TenantGridRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('components.tenants.grid.columns.tenant'),
        flex: 1,
        minWidth: 200,
        renderCell: (params) => canManage ? (
          <VxBox>
            <VxTypography variant="body2" sx={{ fontWeight: 600 }}>
              {params.row.name}
            </VxTypography>
            <VxTypography variant="caption" color="textSecondary">
              {t('components.tenants.grid.codePrefix')} {params.row.code}
            </VxTypography>
          </VxBox>
        ) : <VxTypography variant="caption" color="text.secondary">View only</VxTypography>,
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
          <VxChip
            label={params.row.isActive ? t('components.tenants.grid.active') : t('components.tenants.grid.inactive')}
            color={params.row.isActive ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        field: 'moduleAccess',
        headerName: 'Module Access',
        flex: 1,
        minWidth: 220,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const access = effectiveAccessByTenantId?.[params.row.id]
          if (!access) {
            return <VxTypography variant="caption" color="text.secondary">Loading...</VxTypography>
          }

          const chips = [
            { label: 'P', enabled: access.project.effectiveEnabled },
            { label: 'D', enabled: access.document.effectiveEnabled },
            { label: 'E', enabled: access.employee.effectiveEnabled },
          ]

          return (
            <VxBox sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
              {chips.map((chip) => (
                <VxChip
                  key={chip.label}
                  label={chip.label}
                  size="small"
                  color={chip.enabled ? 'success' : 'default'}
                  variant={chip.enabled ? 'filled' : 'outlined'}
                />
              ))}
            </VxBox>
          )
        },
      },
      {
        field: 'id',
        headerName: t('components.tenants.grid.columns.actions'),
        flex: 0.6,
        minWidth: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <VxBox sx={{ display: 'flex', gap: 1 }}>
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
            <button
              onClick={() => onRemove(params.row)}
              style={{
                padding: '4px 12px',
                backgroundColor: '#F3F0FF',
                color: '#6C5CE7',
                border: '1px solid #CFC4FF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Remove
            </button>
          </VxBox>
        ),
      },
    ],
    [canManage, effectiveAccessByTenantId, onEdit, onRemove, t],
  )

  return (
    <VxDataGrid
      rows={rows}
      columns={columns}
      loading={isLoading}
      pageSizeOptions={[10, 25, 50]}
      disableRowSelectionOnClick
      sx={{ height: 500 }}
    />
  )
}
