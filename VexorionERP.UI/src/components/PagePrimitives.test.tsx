/// <reference types="vitest/globals" />

import { fireEvent, render, screen } from '@testing-library/react'
import { VxButton } from '@vexorion/ui'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.pageFilters': 'Page filters',
      'common.pageMetrics': 'Page metrics',
      'common.retry': 'Retry',
    } as Record<string, string>)[key] ?? key,
  }),
}))
import {
  PageBody,
  PageEmptyState,
  PageErrorState,
  PageFeedback,
  PageHeader,
  PageLoadingState,
  PageMetric,
} from './PagePrimitives'

describe('page primitives', () => {
  it('provides a consistent heading, primary action, filters, and metrics structure', () => {
    render(
      <PageHeader
        title="Customers"
        description="Manage customer records."
        primaryAction={<VxButton>Add customer</VxButton>}
        filters={<label>Search <input /></label>}
        metrics={<PageMetric label="Active" value="4" />}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add customer' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Page filters' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Page metrics' })).toHaveTextContent('Active4')
  })

  it('renders live feedback and exposes retry for recoverable failures', () => {
    const onRetry = vi.fn()
    render(<PageFeedback error="Could not load customers." onRetry={onRetry} retryLabel="Try again" />)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders accessible loading, empty, error, and body states', () => {
    const onRetry = vi.fn()
    const { rerender } = render(<PageLoadingState label="Loading customer tools" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading customer tools')

    rerender(<PageEmptyState title="No customers" description="Create the first customer." />)
    expect(screen.getByText('No customers')).toBeInTheDocument()

    rerender(<PageErrorState title="Customers unavailable" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()

    rerender(<PageBody labelledBy="records-heading"><div id="records-heading">Customer records</div></PageBody>)
    expect(screen.getByRole('region', { name: 'Customer records' })).toBeInTheDocument()
  })
})
