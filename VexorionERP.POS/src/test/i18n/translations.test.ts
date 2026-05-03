import { describe, it, expect } from 'vitest'
import type { TranslationKey, Dictionary } from '../../app/i18n/types'
import en from '../../app/i18n/locales/enUS'
import id from '../../app/i18n/locales/idID'
import es from '../../app/i18n/locales/esES'

const locales: Record<string, Dictionary> = { en, id, es }

// Derive the exhaustive key list from the TypeScript type at test time by
// importing the enUS dictionary, which is typed as Dictionary (= Record<TranslationKey, string>)
// so it must include every key.
const allKeys = Object.keys(en) as TranslationKey[]

describe('i18n — all TranslationKeys are present in every locale', () => {
  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} contains all ${allKeys.length} keys`, () => {
      const missing = allKeys.filter((k) => !(k in dict))
      expect(missing, `Missing keys in ${name}: ${missing.join(', ')}`).toHaveLength(0)
    })
  }
})

describe('i18n — no extra / unexpected keys in any locale', () => {
  const keySet = new Set<string>(allKeys)
  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} has no extra keys`, () => {
      const extra = Object.keys(dict).filter((k) => !keySet.has(k as TranslationKey))
      expect(extra, `Extra keys in ${name}: ${extra.join(', ')}`).toHaveLength(0)
    })
  }
})

describe('i18n — values are non-empty strings', () => {
  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} has no empty values`, () => {
      const empty = Object.entries(dict)
        .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
        .map(([k]) => k)
      expect(empty, `Empty values in ${name}: ${empty.join(', ')}`).toHaveLength(0)
    })
  }
})
