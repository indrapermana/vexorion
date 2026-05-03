/// <reference types="vitest/globals" />

import { formatCurrency } from './formatters'

describe('formatCurrency', () => {
  it('formats a number as USD by default', () => {
    const result = formatCurrency(1234.5)
    expect(result).toContain('1,234.50')
  })

  it('respects a custom currency code', () => {
    const result = formatCurrency(500, 'EUR')
    expect(result).toContain('500')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('rounds to 2 decimal places', () => {
    const result = formatCurrency(9.999)
    expect(result).toContain('10.00')
  })
})
