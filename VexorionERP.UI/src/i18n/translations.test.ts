import { describe, expect, it } from 'vitest'
import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'
import { getIntlLocale } from './translationConstant'

function flatten(value: unknown, prefix = '', result: Record<string, string> = {}) {
  if (!value || typeof value !== 'object') return result

  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (entry && typeof entry === 'object') flatten(entry, path, result)
    else if (typeof entry === 'string') result[path] = entry
  }

  return result
}

function placeholders(value: string) {
  return [...value.matchAll(/{{\s*([^},\s]+).*?}}/g)].map((match) => match[1]).sort()
}

const locales = { enUS: flatten(enUS), idID: flatten(idID), esES: flatten(esES) }
const referenceKeys = Object.keys(locales.enUS).sort()

describe('Main UI translations', () => {
  it.each([
    ['enUS', 'en-US'], ['idID', 'id-ID'], ['esES', 'es-ES'], ['es-ES', 'es-ES'], [undefined, 'en-US'],
  ])('maps application locale %s to the Intl locale %s', (language, expected) => {
    expect(getIntlLocale(language)).toBe(expected)
    expect(() => new Intl.NumberFormat(getIntlLocale(language))).not.toThrow()
    expect(() => new Intl.DateTimeFormat(getIntlLocale(language))).not.toThrow()
  })

  for (const [locale, dictionary] of Object.entries(locales)) {
    it(`${locale} has the exact English key set`, () => {
      expect(Object.keys(dictionary).sort()).toEqual(referenceKeys)
    })

    it(`${locale} has non-empty values and matching interpolation variables`, () => {
      for (const key of referenceKeys) {
        expect(dictionary[key]?.trim(), `${locale}.${key}`).not.toBe('')
        expect(placeholders(dictionary[key]), `${locale}.${key}`).toEqual(placeholders(locales.enUS[key]))
      }
    })
  }
})
