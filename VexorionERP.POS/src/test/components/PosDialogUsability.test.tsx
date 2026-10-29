import { describe, expect, it, vi } from 'vitest'
import { QuickCustomerDialog } from '../../components/pos/QuickCustomerDialog'
import { StockConflictDialog } from '../../components/pos/StockConflictDialog'
import { renderWithProviders, screen, userEvent } from '../testUtils'

describe('POS dialog usability', () => {
  it('keeps quick-customer validation inside the dialog', async () => {
    const onCreate = vi.fn()
    renderWithProviders(
      <QuickCustomerDialog
        open
        quickCustomer={{ name: '', phoneNumber: '', email: '' }}
        onClose={vi.fn()}
        onChange={vi.fn()}
        onCreate={onCreate}
      />,
    )

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a customer name.')).toBeInTheDocument()
  })

  it('supports keyboard creation when the customer name is present', async () => {
    const onCreate = vi.fn()
    renderWithProviders(
      <QuickCustomerDialog
        open
        quickCustomer={{ name: 'Walk-in Customer', phoneNumber: '', email: '' }}
        onClose={vi.fn()}
        onChange={vi.fn()}
        onCreate={onCreate}
      />,
    )

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), '{Enter}')
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it('states that a stock-conflicted sale was not completed and exposes recovery choices', async () => {
    const onAdjust = vi.fn()
    const onCancel = vi.fn()
    renderWithProviders(
      <StockConflictDialog
        open
        insufficientItems={[{ productId: 'product-1', requested: 3, available: 1 }]}
        cart={[{ productId: 'product-1', productName: 'Coffee', unitPrice: 4, quantity: 3, discountAmount: 0 }]}
        onAdjust={onAdjust}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText(/sale was not completed/i)).toBeInTheDocument()
    expect(screen.getByText(/Coffee: requested 3, available 1/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Adjust Cart' }))
    expect(onAdjust).toHaveBeenCalledOnce()
  })
})
