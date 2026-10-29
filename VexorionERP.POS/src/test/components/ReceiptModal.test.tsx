import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../testUtils'
import { ReceiptModal, type ReceiptData, type ReceiptLine } from '../../components/pos/ReceiptModal'

const BASE_LINE: ReceiptLine = {
  productId: 'prod-1',
  productName: 'Widget A',
  unitPrice: 50,
  quantity: 2,
  discountAmount: 0,
}

const BASE_DATA: ReceiptData = {
  completedAt: '2026-05-03T10:00:00.000Z',
  customerLabel: 'Alice Smith',
  currencyCode: 'USD',
  lines: [BASE_LINE],
  paymentAmount: 100,
  paymentMethod: 'Cash',
  isDelivery: false,
  orderId: 'ORD-001',
  invoiceId: 'INV-001',
}

describe('ReceiptModal', () => {
  it('renders nothing when data is null', () => {
    renderWithProviders(
      <ReceiptModal open data={null} onClose={vi.fn()} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when data is provided', () => {
    renderWithProviders(
      <ReceiptModal open data={BASE_DATA} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders all product names', () => {
    const data: ReceiptData = {
      ...BASE_DATA,
      lines: [
        { ...BASE_LINE, productName: 'Widget A' },
        { ...BASE_LINE, productId: 'prod-2', productName: 'Gadget B', unitPrice: 25, quantity: 1 },
      ],
    }
    renderWithProviders(<ReceiptModal open data={data} onClose={vi.fn()} />)
    expect(screen.getByText('Widget A')).toBeInTheDocument()
    expect(screen.getByText('Gadget B')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Receipt' })).toBeInTheDocument()
  })

  it('shows orderId and invoiceId references', () => {
    renderWithProviders(<ReceiptModal open data={BASE_DATA} onClose={vi.fn()} />)
    expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
    expect(screen.getByText(/INV-001/)).toBeInTheDocument()
  })

  it('shows the customer label', () => {
    renderWithProviders(<ReceiptModal open data={BASE_DATA} onClose={vi.fn()} />)
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(<ReceiptModal open data={BASE_DATA} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: /close|tutup|cerrar/i })
    closeBtn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
