import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import PaymentAllocationSummary from './PaymentAllocationSummary'

const copy: Record<string, string> = {
  'orderWorkflow.paymentAllocation.title': 'Allocation summary',
  'orderWorkflow.paymentAllocation.invoiceBalance': 'Invoice balance',
  'orderWorkflow.paymentAllocation.paymentAmount': 'Payment amount',
  'orderWorkflow.paymentAllocation.allocatedAmount': 'Allocated',
  'orderWorkflow.paymentAllocation.unappliedAmount': 'Unapplied',
  'orderWorkflow.paymentAllocation.remainingBalance': 'Balance after payment',
  'orderWorkflow.paymentAllocation.exceedsBalance': 'Payment exceeds the invoice balance.',
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: 'en-US' }, t: (key: string) => copy[key] ?? key }),
}))
vi.mock('@vexorion/ui', () => ({
  VxAlert: ({ children, severity }: { children?: ReactNode, severity: string }) => <div role="status" data-severity={severity}>{children}</div>,
  VxBox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxStack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

describe('PaymentAllocationSummary', () => {
  it('shows allocation and remaining balance for a partial payment', () => {
    render(<PaymentAllocationSummary invoiceBalance={100} paymentAmount={35} currencyCode="USD" />)

    expect(screen.getByText('Allocated')).toBeInTheDocument()
    expect(screen.getAllByText('$35.00')).toHaveLength(2)
    expect(screen.getByText('Balance after payment')).toBeInTheDocument()
    expect(screen.getByText('$65.00')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('data-severity', 'info')
  })

  it('warns when part of the payment cannot be applied', () => {
    render(<PaymentAllocationSummary invoiceBalance={100} paymentAmount={125} currencyCode="USD" />)

    expect(screen.getByText('$25.00')).toBeInTheDocument()
    expect(screen.getByText('Payment exceeds the invoice balance.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('data-severity', 'warning')
  })
})