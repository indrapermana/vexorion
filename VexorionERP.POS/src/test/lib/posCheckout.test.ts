import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../lib/api/core'
import { checkoutSale } from '../../lib/api/pos'

describe('checkoutSale', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends one atomic request carrying the idempotency key', async () => {
    const request = vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ data: { salesInvoiceId: 'inv-1' } } as never)

    const body = {
      idempotencyKey: 'key-1',
      shiftId: 'shift-1',
      customerId: 'customer-1',
      warehouseId: 'warehouse-1',
      isDelivery: false,
      notes: null,
      paymentMethod: 'CASH',
      paymentAmount: 20,
      lines: [{ productId: 'product-1', quantity: 2, unitPrice: 10, discountAmount: 0 }],
    }

    const response = await checkoutSale(body)

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith({ url: '/pos/checkout', method: 'POST', data: body })
    expect(response.salesInvoiceId).toBe('inv-1')
  })
})
