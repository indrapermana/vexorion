import { afterEach, describe, expect, it, vi } from 'vitest'

function formatStamp(value: Date) {
  return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(value.getDate()).padStart(2, '0')}${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}${String(value.getSeconds()).padStart(2, '0')}`
}

describe('generateDocumentNumber', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it('formats document numbers as PREFIX-YYYYMMDDHHMMSS', async () => {
    vi.useFakeTimers()
    const now = new Date(2026, 4, 3, 14, 5, 6)
    vi.setSystemTime(now)

    const { generateDocumentNumber } = await import('../../lib/posDocuments')

    expect(generateDocumentNumber('INV-POS')).toBe(`INV-POS-${formatStamp(now)}`)
  })

  it('guarantees unique values even when called twice in the same second', async () => {
    vi.useFakeTimers()
    const now = new Date(2026, 4, 3, 14, 5, 6)
    vi.setSystemTime(now)

    const { generateDocumentNumber } = await import('../../lib/posDocuments')

    const first = generateDocumentNumber('INV-POS')
    const second = generateDocumentNumber('INV-POS')

    expect(first).toBe(`INV-POS-${formatStamp(now)}`)
    expect(second).toBe(`INV-POS-${formatStamp(new Date(2026, 4, 3, 14, 5, 7))}`)
    expect(second).not.toBe(first)
  })
})