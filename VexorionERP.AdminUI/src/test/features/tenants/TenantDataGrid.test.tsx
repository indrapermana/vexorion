import type React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TenantListItemResponse } from '../../../types/api'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'components.tenants.grid.columns.tenant': 'Tenant',
        'components.tenants.grid.columns.domain': 'Domain',
        'components.tenants.grid.columns.createdAt': 'Created',
        'components.tenants.grid.columns.status': 'Status',
        'components.tenants.grid.columns.actions': 'Actions',
        'components.tenants.grid.codePrefix': 'Code:',
        'components.tenants.grid.noDomain': 'No domain',
        'components.tenants.grid.active': 'Active',
        'components.tenants.grid.inactive': 'Inactive',
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows, columns }: { rows: TenantListItemResponse[]; columns: Array<{ field: string; headerName: string; renderCell?: (params: { row: TenantListItemResponse }) => unknown }> }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id}>
          {columns.map((column) => (
            <div key={column.field}>
              <span>{column.headerName}</span>
              <div>{column.renderCell ? column.renderCell({ row }) as React.ReactNode : (row as Record<string, unknown>)[column.field] as string}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}))

import { TenantDataGrid } from '../../../features/tenants/components/TenantDataGrid'

const ROW: TenantListItemResponse = {
  id: 'tenant-1',
  name: 'Acme Corp',
  code: 'ACME',
  domain: null,
  isActive: true,
  createdAtUtc: '2026-05-03T00:00:00.000Z',
}

describe('TenantDataGrid', () => {
  it('renders the empty-domain fallback and formatted created date', () => {
    render(<TenantDataGrid rows={[ROW]} isLoading={false} onEdit={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByText('No domain')).toBeInTheDocument()
    expect(screen.getByText(new Date(ROW.createdAtUtc).toLocaleDateString())).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('calls onEdit and onRemove with the row payload', async () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()

    render(<TenantDataGrid rows={[ROW]} isLoading={false} onEdit={onEdit} onRemove={onRemove} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(onEdit).toHaveBeenCalledWith(ROW)
    expect(onRemove).toHaveBeenCalledWith(ROW)
  })
})