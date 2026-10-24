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
      'common.labels.searchOrFilter': 'Search or filter',
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
import MasterDataListPage from './MasterDataListPage'
import MasterDataSearchField from './MasterDataSearchField'

describe('page primitives', () => {
  it('provides the same accessible search control for custom master-data lists', () => {
    const onChange = vi.fn()
    render(<MasterDataSearchField value="SKU-1" onChange={onChange} />)
    const search = screen.getByRole('textbox', { name: 'Search or filter' })
    expect(search).toHaveValue('SKU-1')
    fireEvent.change(search, { target: { value: 'SKU-2' } })
    expect(onChange).toHaveBeenCalledWith('SKU-2')
  })

  it('composes a consistent master-data list shell with shared feedback, permissions, filters, and body', () => {
    const onRetry = vi.fn()
    render(
      <MasterDataListPage
        title="Customers"
        description="Customer records"
        filters={<label>Search customers <input /></label>}
        metrics={<PageMetric label="Active" value="4" />}
        error="Could not load customers."
        onRetry={onRetry}
        canManage={false}
        requiredPermission="customers.manage"
      >
        <div role="table">Customer rows</div>
      </MasterDataListPage>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Page filters' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Page metrics' })).toHaveTextContent('Active4')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Could not load customers.')).toBeInTheDocument()
    expect(screen.getByText('authorization.readOnly')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

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
    expect(screen.queryByRole('heading', { name: '4' })).not.toBeInTheDocument()
  })

  it('renders live feedback and exposes retry for recoverable failures', () => {
    const onRetry = vi.fn()
    render(<PageFeedback error="Could not load customers." onRetry={onRetry} retryLabel="Try again" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load customers.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('announces successful feedback as a status, not an urgent alert', () => {
    render(<PageFeedback success="Customer saved." />)

    expect(screen.getByRole('status')).toHaveTextContent('Customer saved.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders accessible loading, empty, error, and body states', () => {
    const onRetry = vi.fn()
    const { rerender } = render(<PageLoadingState label="Loading customer tools" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading customer tools')

    rerender(<PageEmptyState title="No customers" description="Create the first customer." />)
    expect(screen.getByRole('heading', { level: 2, name: 'No customers' })).toBeInTheDocument()

    rerender(<PageErrorState title="Customers unavailable" onRetry={onRetry} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Customers unavailable' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()

    rerender(<PageBody labelledBy="records-heading"><div id="records-heading">Customer records</div></PageBody>)
    expect(screen.getByRole('region', { name: 'Customer records' })).toBeInTheDocument()
  })
})
