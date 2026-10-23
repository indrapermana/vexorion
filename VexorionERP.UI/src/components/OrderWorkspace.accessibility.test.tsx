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
        metrics={[]}
        alerts={[
          { severity: 'warning', message: 'Create a customer first.' },
          { severity: 'info', message: 'You have view-only access.' },
          { severity: 'error', message: 'Could not load sales orders.' },
        ]}
        grid={null}
        linesPanel={null}
      />,
    )

    expect(screen.getAllByRole('status')).toHaveLength(2)
    const statusMessages = screen.getAllByRole('status').map((element) => element.textContent)
    expect(statusMessages).toEqual(expect.arrayContaining(['Create a customer first.', 'You have view-only access.']))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load sales orders.')
  })
})
