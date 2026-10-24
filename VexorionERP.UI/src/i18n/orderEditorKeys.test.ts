import { describe, expect, it } from 'vitest'
import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'

const dialogModules = import.meta.glob('../features/{salesOrders,salesInvoices,purchaseOrders,purchaseInvoices}/components/*{Editor,LineEditor}Dialog.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

function resolves(locale: unknown, key: string) {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale) !== undefined
}

describe('sales and purchasing dialog translation keys', () => {
  it('resolves every literal t() key in all locales', () => {
    const missing: string[] = []

    for (const [file, contents] of Object.entries(dialogModules)) {
      for (const match of contents.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)) {
        const key = match[1]
        for (const [name, locale] of [['en', enUS], ['id', idID], ['es', esES]] as const) {
          if (!resolves(locale, key)) missing.push(`${name}: ${key} (${file})`)
        }
      }
    }

    expect(Object.keys(dialogModules).length).toBeGreaterThanOrEqual(8)
    expect(missing).toEqual([])
  })
})
