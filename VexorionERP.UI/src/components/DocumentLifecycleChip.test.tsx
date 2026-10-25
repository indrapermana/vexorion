import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DocumentLifecycleChip from './DocumentLifecycleChip'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => ({
    'orderWorkflow.lifecycle.order.3': 'Record another shipment or receipt for remaining quantities.',
    'orderWorkflow.lifecycle.orderStatusLabels.3': 'Partially processed',
    'orderWorkflow.lifecycle.orderStatusLabels.4': 'Completed',
    'orderWorkflow.lifecycle.invoiceStatusLabels.4': 'Paid',
    'orderWorkflow.lifecycle.order.4': 'Completed status explanation.',
    'orderWorkflow.lifecycle.invoice.4': 'Paid status explanation.',
    'orderWorkflow.lifecycle.shipmentStatusLabels.4': 'Shipped',
    'orderWorkflow.lifecycle.receiptStatusLabels.4': 'Posted',
    'orderWorkflow.lifecycle.shipment.4': 'Inventory was updated by this shipment.',
    'orderWorkflow.lifecycle.receipt.4': 'Inventory was updated by this receipt.',
    'orderWorkflow.lifecycle.unknown': 'Status details are unavailable.',
  }[key] ?? options?.defaultValue ?? key) }),
}))

describe('DocumentLifecycleChip', () => {
  it('exposes the lifecycle guidance alongside the visible status', () => {
    render(<DocumentLifecycleChip kind="order" status={3} label="Partially processed" color="warning" />)
    expect(screen.getByLabelText('Partially processed. Record another shipment or receipt for remaining quantities.')).toBeInTheDocument()
  })

  it('provides fallback guidance for unknown status codes', () => {
    render(<DocumentLifecycleChip kind="invoice" status={99} label="Status 99" color="default" />)
    expect(screen.getByLabelText('Status 99. Status details are unavailable.')).toBeInTheDocument()
  })

  it('resolves overlapping numeric statuses using the document type', () => {
    const { rerender } = render(<DocumentLifecycleChip kind="order" status={4} label="Completed" color="success" />)
    expect(screen.getByLabelText('Completed. Completed status explanation.')).toBeInTheDocument()
    rerender(<DocumentLifecycleChip kind="invoice" status={4} label="Paid" color="success" />)
    expect(screen.getByLabelText('Paid. Paid status explanation.')).toBeInTheDocument()
  })

  it.each([
    ['shipment', 'Shipped', 'Inventory was updated by this shipment.'],
    ['receipt', 'Posted', 'Inventory was updated by this receipt.'],
  ] as const)('explains the %s lifecycle state', (kind, label, explanation) => {
    render(<DocumentLifecycleChip kind={kind} status={4} label={label} color="success" />)
    expect(screen.getByLabelText(`${label}. ${explanation}`)).toBeInTheDocument()
  })
})