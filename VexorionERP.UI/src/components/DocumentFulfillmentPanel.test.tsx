import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import DocumentFulfillmentPanel from './DocumentFulfillmentPanel'

const apiMocks = vi.hoisted(() => ({ getSalesShipmentsForOrder: vi.fn(), getPurchaseReceiptsForOrder: vi.fn() }))
const translate = (key: string) => ({
  'orderWorkflow.review.shipments': 'Shipments',
  'orderWorkflow.review.receipts': 'Receipts',
  'orderWorkflow.review.documentNumber': 'Document',
  'orderWorkflow.review.documentDate': 'Date',
  'orderWorkflow.review.status': 'Status',
  'orderWorkflow.review.lineCount': 'Lines',
  'orderWorkflow.review.noShipments': 'No shipments.',
  'orderWorkflow.review.noReceipts': 'No receipts.',
  'orderWorkflow.lifecycle.shipmentStatusLabels.4': 'Shipped',
  'orderWorkflow.lifecycle.receiptStatusLabels.4': 'Posted',
  'orderWorkflow.lifecycle.unknown': 'Unknown',
}[key] ?? key)

vi.mock('../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  ...apiMocks,
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
vi.mock('@vexorion/ui', () => ({
  VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
  VxPaper: ({ children }: { children?: ReactNode }) => <section>{children}</section>,
  VxTable: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  VxTableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  VxTableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
  VxTableHead: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  VxTableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

describe('DocumentFulfillmentPanel', () => {
  it('loads only shipments linked to the selected sales order', async () => {
    apiMocks.getSalesShipmentsForOrder.mockResolvedValue([{ id: 'shipment-1', shipmentNumber: 'SH-001', shipmentDate: '2026-10-25', status: 4, lineCount: 2 }])

    render(<DocumentFulfillmentPanel kind="shipment" sourceOrderId="sales-order-1" />)

    expect(await screen.findByText('SH-001')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(apiMocks.getSalesShipmentsForOrder).toHaveBeenCalledWith('sales-order-1')
    expect(apiMocks.getPurchaseReceiptsForOrder).not.toHaveBeenCalled()
  })
})
