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
        onBackToCatalog={vi.fn()}
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

  it('names compact cart lines and their quantity, discount, and removal controls', async () => {
    const user = userEvent.setup()
    const onLineQtyChange = vi.fn()
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
        onBackToCatalog={vi.fn()}
        onRemoveCartLine={vi.fn()}
        onLineDiscountChange={vi.fn()}
        onLineQtyChange={onLineQtyChange}
        onPaymentAmountChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onDeliveryChange={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByRole('list', { name: 'Cart line items' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Qty: Coffee' })).toHaveValue(2)
    expect(screen.getByRole('spinbutton', { name: 'Discount: Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove: Coffee' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Increase quantity: Coffee' }))
    expect(onLineQtyChange).toHaveBeenCalledWith('product-1', 3)
  })

  it('shows a product-specific stock warning when cart quantity exceeds availability', () => {
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
        stockByProduct={{ 'product-1': 1 }}
        onBackToCatalog={vi.fn()}
        onRemoveCartLine={vi.fn()}
        onLineDiscountChange={vi.fn()}
        onLineQtyChange={vi.fn()}
        onPaymentAmountChange={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onDeliveryChange={vi.fn()}
        onCheckout={vi.fn()}
      />,
    )

    expect(screen.getByText('Requested 2; 1 available')).toBeInTheDocument()
  })
})
