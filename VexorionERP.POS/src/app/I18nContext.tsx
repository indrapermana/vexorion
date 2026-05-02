import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { translations } from './i18n/translations'
import type { Locale, TranslationKey } from './i18n/types'

const LOCALE_STORAGE_KEY = 'vexorion.pos.locale'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function normalizeLocale(value: string | null): Locale {
  if (value === 'id' || value === 'es') {
    return value
  }

  return 'en'
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) {
    return template
  }

  return Object.entries(vars).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY)))

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
        setLocaleState(nextLocale)
      },
      t: (key, vars) => interpolate(translations[locale][key] ?? translations.en[key], vars),
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}
