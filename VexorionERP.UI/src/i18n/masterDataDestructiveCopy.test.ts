import { describe, expect, it } from 'vitest'
import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'

describe('master-data destructive action copy', () => {
  it.each([
    ['en-US', enUS, /permanent/i, /(deactivate|inactive)/i],
    ['id-ID', idID, /permanen/i, /(nonaktifkan|tidak aktif)/i],
    ['es-ES', esES, /permanent/i, /(desactiva|inactivo)/i],
  ] as const)('distinguishes permanent deletion from reversible deactivation in %s', (_, locale, permanent, reversible) => {
    const confirmations = locale.pages.deleteConfirmations
    const copy = [
      confirmations.customer.consequence,
      confirmations.product.consequence,
      confirmations.supplier.consequence,
      confirmations.warehouse.consequence,
      confirmations.employee.consequence,
      confirmations.consultant.consequence,
      locale.pages.accounts.delete.consequence,
      locale.config.productCategories.deleteDialog.message,
      locale.components.products.identifiers.deleteDialog.message,
    ]

    for (const message of copy) {
      expect(message).toMatch(permanent)
      expect(message).toMatch(reversible)
    }
  })

  it('names the dependencies and cascading effects instead of promising unconditional deletion', () => {
    expect(enUS.pages.deleteConfirmations.customer.consequence).toMatch(/orders, invoices, or payments.*block deletion/i)
    expect(enUS.pages.deleteConfirmations.product.consequence).toMatch(/identifiers, inventory balances, and stored image/i)
    expect(enUS.pages.deleteConfirmations.warehouse.consequence).toMatch(/balances, movements, orders, receipts, or shipments/i)
    expect(enUS.pages.deleteConfirmations.employee.consequence).toMatch(/project assignments.*block deletion/i)
    expect(enUS.pages.accounts.delete.consequence).toMatch(/journal lines.*block deletion/i)
    expect(enUS.config.productCategories.deleteDialog.message).toMatch(/removes its assignments.*products remain/i)
  })
})
