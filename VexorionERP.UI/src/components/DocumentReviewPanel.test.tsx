import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import DocumentReviewPanel from './DocumentReviewPanel'

const translate = (key: string) => ({
  'orderWorkflow.review.title': 'Document review',
  'orderWorkflow.review.loading': 'Loading details...',
  'orderWorkflow.review.loadError': 'Unable to load details.',
}[key] ?? key)
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
vi.mock('./DocumentAuditPanel', () => ({ default: () => null }))
vi.mock('@vexorion/ui', () => ({
  VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
  VxBox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxPaper: ({ children }: { children?: ReactNode }) => <section>{children}</section>,
  VxStack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

describe('DocumentReviewPanel', () => {
  it('loads and displays selected document details', async () => {
    type InvoiceDetails = { customerName: string, dueDate: string }
    const loadDetails = vi.fn<() => Promise<InvoiceDetails>>().mockResolvedValue({ customerName: 'Northwind', dueDate: '2026-11-10' })

    render(
      <DocumentReviewPanel
        entityId="invoice-1"
        entityName="SalesInvoice"
        documentNumber="INV-001"
        canViewAudit={false}
        loadDetails={loadDetails}
        getFields={(details) => [
          { label: 'Customer', value: details.customerName },
          { label: 'Due date', value: details.dueDate },
        ]}
      />,
    )

    expect(await screen.findByText('Northwind')).toBeInTheDocument()
    expect(screen.getByText('2026-11-10')).toBeInTheDocument()
    expect(screen.getByText('Document review: INV-001')).toBeInTheDocument()
    expect(loadDetails).toHaveBeenCalledWith('invoice-1')
  })
})