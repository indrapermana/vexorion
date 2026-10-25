import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import SalesShipmentDataGrid from '../features/salesShipments/components/SalesShipmentDataGrid'
import PurchaseReceiptDataGrid from '../features/purchaseReceipts/components/PurchaseReceiptDataGrid'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => ({
    'pages.salesShipments.grid.ship': 'Ship',
    'pages.salesShipments.grid.delete': 'Delete shipment',
    'pages.purchaseReceipts.grid.post': 'Post',
    'pages.purchaseReceipts.grid.delete': 'Delete receipt',
    'orderWorkflow.disabledReasons.shipment.postDraftOnly': 'Only draft shipments can be posted.',
    'orderWorkflow.disabledReasons.shipment.deleteDraftOnly': 'Only draft shipments can be deleted.',
    'orderWorkflow.disabledReasons.receipt.postDraftOnly': 'Only draft receipts can be posted.',
    'orderWorkflow.disabledReasons.receipt.deleteDraftOnly': 'Only draft receipts can be deleted.',
  }[key] ?? options?.defaultValue ?? key) }),
}))

vi.mock('@vexorion/ui', () => ({
  DeleteOutlineRoundedIcon: () => null,
  PublishRoundedIcon: () => null,
  VxChip: ({ label }: { label: string }) => <span>{label}</span>,
  VxTooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  VxDataGrid: ({ rows, columns }: {
    rows: Array<{ id: string }>
    columns: Array<{ field: string, getActions?: (params: { row: unknown }) => ReactNode[] }>
  }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id}>
          {columns.find((column) => column.field === 'actions')?.getActions?.({ row })}
        </div>
      ))}
    </div>
  ),
  VxGridActionsCellItem: ({ label, disabled }: { label: string, disabled?: boolean }) => (
    <button type="button" disabled={disabled}>{label}</button>
  ),
}))

describe('document lifecycle disabled actions', () => {
  it('explains why posted shipments cannot be posted or deleted', () => {
    render(
      <SalesShipmentDataGrid
        rows={[{ id: 'shipment-1', status: 4 } as never]}
        isLoading={false}
        onPost={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Ship — Only draft shipments can be posted.' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete shipment — Only draft shipments can be deleted.' })).toBeDisabled()
  })

  it('explains why posted receipts cannot be posted or deleted', () => {
    render(
      <PurchaseReceiptDataGrid
        rows={[{ id: 'receipt-1', status: 4 } as never]}
        isLoading={false}
        onPost={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Post — Only draft receipts can be posted.' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete receipt — Only draft receipts can be deleted.' })).toBeDisabled()
  })
})