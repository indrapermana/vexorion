import { describe, expect, it, vi } from 'vitest'
import { userEvent } from '../testUtils'
import { renderWithProviders, screen } from '../testUtils'
import { CartSummaryPanel } from '../../components/pos/CartSummaryPanel'

describe('CartSummaryPanel accessibility', () => {
  it('names the delivery transaction switch', () => {
    renderWithProviders(
      <CartSummaryPanel
        cart={[]}
        subtotal={0}
        discountTotal={0}
        grandTotal={0}
        changeAmount={0}
        currencyCode="USD"
        paymentAmount={0}
        paymentMethod="Cash"
        isDelivery={false}
        isProcessing={false}
        canCheckout={false}
        stockByProduct={{}}
        onRemoveCartLine={vi.fn()}
        onLineDiscountChange={vi.fn()}
        onLineQtyChange={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onDeliveryChange={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByRole('switch', { name: 'Delivery transaction' })).not.toBeChecked()
  })

  it('names the cart table and gives each line editor and action product context', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CartSummaryPanel
        cart={[{
          productId: 'product-1',
          productName: 'Coffee',
          unitPrice: 4,
          quantity: 2,
          discountAmount: 0,
        }]}
        subtotal={8}
        discountTotal={0}
        grandTotal={8}
        changeAmount={0}
        currencyCode="USD"
        paymentAmount={8}
        paymentMethod="Cash"
        isDelivery={false}
        isProcessing={false}
        canCheckout
        stockByProduct={{ 'product-1': 10 }}
        onRemoveCartLine={vi.fn()}
        onLineDiscountChange={vi.fn()}
        onLineQtyChange={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onDeliveryChange={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByRole('table', { name: 'Cart' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Qty: Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Discount: Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove: Coffee' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Qty: Coffee' }))
    expect(screen.getByRole('spinbutton', { name: 'Qty: Coffee' })).toHaveValue(2)
  })
})
