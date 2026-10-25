import { VxFormControlLabel, VxSwitch } from '@vexorion/ui'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderWorkspace from './OrderWorkspace'

describe('OrderWorkspace accessibility', () => {
  it('announces non-error feedback as status and errors as alerts', () => {
    render(
      <OrderWorkspace
        title="Sales orders"
        description="Manage sales orders."
        createLabel="New sales order"
        onCreate={() => {}}
          filters={<VxFormControlLabel control={<VxSwitch checked onChange={() => {}} />} label="Outstanding only" />}
          metrics={[{ icon: <span aria-hidden="true">M</span>, label: 'Open invoices', value: 2 }]}
        alerts={[
          { severity: 'warning', message: 'Create a customer first.' },
          { severity: 'info', message: 'You have view-only access.' },
          { severity: 'error', message: 'Could not load sales orders.' },
        ]}
        grid={<div role="grid">Invoice rows</div>}
        linesPanel={<div>Invoice lines</div>}
        documentsPanel={<div>Related documents</div>}
        editor={<div>Invoice editor</div>}
        deleteDialog={<div>Delete invoice confirmation</div>}
      />,
    )

    expect(screen.getAllByRole('status')).toHaveLength(2)
    const statusMessages = screen.getAllByRole('status').map((element) => element.textContent)
    expect(statusMessages).toEqual(expect.arrayContaining(['Create a customer first.', 'You have view-only access.']))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load sales orders.')
    expect(screen.getByRole('region', { name: 'common.pageFilters' })).toHaveTextContent('Outstanding only')
    expect(screen.getByText('Open invoices')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('grid')).toHaveTextContent('Invoice rows')
    expect(screen.getByText('Invoice lines')).toBeInTheDocument()
    expect(screen.getByText('Related documents')).toBeInTheDocument()
    expect(screen.getByText('Invoice editor')).toBeInTheDocument()
    expect(screen.getByText('Delete invoice confirmation')).toBeInTheDocument()
  })
})
