import { afterEach, describe, expect, it, vi } from 'vitest'
import { printReceipt } from '../../lib/printReceipt'
import type { ReceiptData } from '../../components/pos/ReceiptModal'

function makeReceipt(overrides: Partial<ReceiptData> = {}): ReceiptData {
  return {
    completedAt: '2026-05-03T09:30:00.000Z',
    customerLabel: 'Alice <Admin>',
    currencyCode: 'USD',
    lines: [
      {
        productId: 'prod-1',
        productName: '<img src=x onerror=alert(1)>',
        unitPrice: 10,
        quantity: 2,
        discountAmount: 1,
      },
      {
        productId: 'prod-2',
        productName: 'Plain Item',
        unitPrice: 5,
        quantity: 1,
        discountAmount: 0,
      },
    ],
    paymentAmount: 30,
    paymentMethod: 'Cash & Card',
    isDelivery: true,
    orderId: 'SO-123',
    invoiceId: 'INV-456',
    shipmentId: 'SHP-789',
    paymentId: 'PAY-0001',
    ...overrides,
  }
}

describe('printReceipt', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('writes escaped receipt HTML with correct totals and reference lines', () => {
    vi.useFakeTimers()

    let writtenHtml = ''
    const fakeWindow = {
      document: {
        write: vi.fn((html: string) => {
          writtenHtml = html
        }),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    }

    vi.spyOn(window, 'open').mockReturnValue(fakeWindow as never)

    printReceipt(makeReceipt())

    expect(fakeWindow.document.write).toHaveBeenCalledOnce()
    expect(writtenHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(writtenHtml).toContain('Customer: Alice &lt;Admin&gt;')
    expect(writtenHtml).toContain('Subtotal</td><td class="right">USD 25.00</td>')
    expect(writtenHtml).toContain('Discount</td><td class="right">-USD 1.00</td>')
    expect(writtenHtml).toContain('TOTAL</td><td class="right">USD 24.00</td>')
    expect(writtenHtml).toContain('Paid (Cash &amp; Card)</td><td class="right">USD 30.00</td>')
    expect(writtenHtml).toContain('Change</td><td class="right">USD 6.00</td>')
    expect(writtenHtml).toContain('Order:    SO-123')
    expect(writtenHtml).toContain('Invoice:  INV-456')
    expect(writtenHtml).toContain('Shipment: SHP-789')
    expect(writtenHtml).toContain('Payment:  PAY-0001')
    expect(writtenHtml).not.toContain('Customer: Alice <Admin>')
    expect(writtenHtml).not.toContain('<img src=x onerror=alert(1)>')

    vi.runAllTimers()

    expect(fakeWindow.print).toHaveBeenCalledOnce()
    expect(fakeWindow.close).toHaveBeenCalledOnce()
  })

  it('alerts when the print popup is blocked', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'open').mockReturnValue(null)

    printReceipt(makeReceipt())

    expect(alertSpy).toHaveBeenCalledOnce()
  })
})