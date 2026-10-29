import { describe, expect, it, vi } from 'vitest'
import { userEvent } from '../testUtils'
import { renderWithProviders, screen } from '../testUtils'
import { CartSummaryPanel } from '../../components/pos/CartSummaryPanel'
import type { ComponentProps } from 'react'

const TEST_CART = [{
  productId: 'product-1',
  productName: 'Coffee',
  unitPrice: 4,
  quantity: 2,
  discountAmount: 0,
}]

function renderPaymentPanel(overrides: Partial<ComponentProps<typeof CartSummaryPanel>> = {}) {
  const props: ComponentProps<typeof CartSummaryPanel> = {
    cart: TEST_CART,
    subtotal: 8,
    discountTotal: 0,
    grandTotal: 8,
    changeAmount: 0,
    currencyCode: 'USD',
    paymentAmount: 8,
    paymentMethod: 'Cash',
    isDelivery: false,
    isProcessing: false,
    hasPendingAttempt: false,
    canCheckout: true,
    isOnline: true,
    stockByProduct: { 'product-1': 10 },
    onBackToCatalog: vi.fn(),
    onRemoveCartLine: vi.fn(),
    onLineDiscountChange: vi.fn(),
    onLineQtyChange: vi.fn(),
    onPaymentAmountChange: vi.fn(),
    onPaymentMethodChange: vi.fn(),
    onDeliveryChange: vi.fn(),
    onCheckout: vi.fn(),
    ...overrides,
  }

  const renderResult = renderWithProviders(<CartSummaryPanel {...props} />)
  return { props, ...renderResult }
}

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
        hasPendingAttempt={false}
        canCheckout={false}
        isOnline
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
        hasPendingAttempt={false}
        canCheckout
        isOnline
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
        hasPendingAttempt={false}
        canCheckout
        isOnline
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

  it('shows amount due and blocks an underpaid cash sale before submission', () => {
    renderPaymentPanel({ paymentAmount: 5 })

    expect(screen.getByText('Amount due')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Still due: $3.00')
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled()
  })

  it('supports exact cash and clear tender-method selection', async () => {
    const user = userEvent.setup()
    const onPaymentAmountChange = vi.fn()
    const onPaymentMethodChange = vi.fn()
    renderPaymentPanel({ paymentAmount: 5, onPaymentAmountChange, onPaymentMethodChange })

    await user.click(screen.getByRole('button', { name: 'Use exact amount' }))
    expect(onPaymentAmountChange).toHaveBeenCalledWith(8)

    const cardButton = screen.getByRole('button', { name: 'Card' })
    expect(cardButton).toHaveAttribute('aria-pressed', 'false')
    await user.click(cardButton)
    expect(onPaymentMethodChange).toHaveBeenCalledWith('Card')
  })

  it('explains same-sale recovery and prevents another submission while processing', () => {
    const { props, rerender } = renderPaymentPanel({ hasPendingAttempt: true })

    expect(screen.getByRole('status')).toHaveTextContent('same sale reference')
    expect(screen.getByRole('button', { name: 'Retry same sale' })).toBeEnabled()

    rerender(
      <CartSummaryPanel
        {...props}
        hasPendingAttempt={false}
        isProcessing
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Do not refresh or submit it again')
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled()
  })

  it('keeps the cart reviewable offline but blocks checkout without queuing a sale', () => {
    renderPaymentPanel({ isOnline: false })

    expect(screen.getByRole('status')).toHaveTextContent('does not queue offline checkout requests')
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled()
  })
})
