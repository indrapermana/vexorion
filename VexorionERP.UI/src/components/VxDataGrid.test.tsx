/// <reference types="vitest/globals" />

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dataGridSpy = vi.hoisted(() => vi.fn())

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: Record<string, unknown>) => {
    dataGridSpy(props)
    return (
      <button
        type="button"
        onClick={() => (props.onPaginationModelChange as (model: { page: number; pageSize: number }, details: object) => void)(
          { page: 1, pageSize: 25 },
          {},
        )}
      >
        Change page
      </button>
    )
  },
}))

import { VxDataGrid } from '../../../packages/ui/src/components/datagrid/VxDataGrid'

describe('VxDataGrid', () => {
  beforeEach(() => {
    dataGridSpy.mockClear()
    window.localStorage.clear()
  })

  it('applies the shared dense, searchable, paginated table contract', () => {
    render(<VxDataGrid rows={[]} columns={[]} />)

    const props = dataGridSpy.mock.lastCall?.[0]
    expect(props).toMatchObject({
      density: 'compact',
      disableRowSelectionOnClick: true,
      pageSizeOptions: [10, 25, 50],
      showToolbar: true,
      slotProps: { toolbar: { showQuickFilter: true } },
    })
    expect(props.initialState.pagination.paginationModel).toEqual({ page: 0, pageSize: 10 })
  })

  it('restores and updates pagination for grids with a preference key', () => {
    window.localStorage.setItem('vexorion:grid:customers:pagination', JSON.stringify({ page: 2, pageSize: 50 }))

    render(<VxDataGrid preferenceKey="customers" rows={[]} columns={[]} />)
    expect(dataGridSpy.mock.lastCall?.[0].paginationModel).toEqual({ page: 0, pageSize: 50 })

    fireEvent.click(screen.getByRole('button', { name: 'Change page' }))
    expect(window.localStorage.getItem('vexorion:grid:customers:pagination')).toBe(JSON.stringify({ pageSize: 25 }))
  })
})
