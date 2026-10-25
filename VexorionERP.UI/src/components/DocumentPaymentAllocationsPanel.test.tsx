import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import DocumentPaymentAllocationsPanel from './DocumentPaymentAllocationsPanel'

const apiMocks = vi.hoisted(() => ({ getCustomerPaymentsForInvoice: vi.fn(), getVendorPaymentsForInvoice: vi.fn() }))
const translate = (key: string) => ({
  'orderWorkflow.review.allocationsTitle': 'Payment allocations',
  'orderWorkflow.review.noAllocations': 'No allocations.',
  'orderWorkflow.review.allocationsLoadError': 'Unable to load allocations.',
  'orderWorkflow.review.loading': 'Loading...',
  'orderWorkflow.review.paymentDate': 'Payment date',
  'orderWorkflow.review.referenceNumber': 'Reference',
  'orderWorkflow.review.paymentMethod': 'Method',
  'orderWorkflow.review.amount': 'Amount',
}[key] ?? key)

vi.mock('../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...apiMocks }))
vi.mock('../app/CurrencyContext', () => ({ useCurrency: () => ({ formatMoney: (amount: number) => `$${amount.toFixed(2)}` }) }))
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

describe('DocumentPaymentAllocationsPanel', () => {
  it('loads only the selected invoice allocations and shows payment details', async () => {
    apiMocks.getCustomerPaymentsForInvoice.mockResolvedValue([{
      id: 'payment-1',
      paymentDate: '2026-10-20',
      amount: 42.5,
      referenceNumber: 'PAY-001',
      paymentMethod: 'Bank transfer',
    }])

    render(<DocumentPaymentAllocationsPanel kind="customer" invoiceId="invoice-1" />)

    expect(await screen.findByText('PAY-001')).toBeInTheDocument()
    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.getByText('$42.50')).toBeInTheDocument()
    expect(apiMocks.getCustomerPaymentsForInvoice).toHaveBeenCalledWith('invoice-1')
    expect(apiMocks.getVendorPaymentsForInvoice).not.toHaveBeenCalled()
  })
})