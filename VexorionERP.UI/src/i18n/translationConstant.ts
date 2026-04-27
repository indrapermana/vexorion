export const TranslationLanguages = {
  enUS: 'enUS',
  idID: 'idID',
  esES: 'esES',
} as const

export type TranslationLanguage = (typeof TranslationLanguages)[keyof typeof TranslationLanguages]

export const TranslationLanguageStorageKey = 'vexorionerp.ui.language'
export const DefaultTranslationLanguage: TranslationLanguage = TranslationLanguages.enUS

export type LanguageOption = {
  code: TranslationLanguage
  countryCode: 'US' | 'ID' | 'ES'
  i18nIsoCountryLocale: 'en' | 'id' | 'es'
  translationKey: 'language.english' | 'language.indonesian' | 'language.spanish'
  flag: string
}

export const LanguageOptions: LanguageOption[] = [
  {
    code: TranslationLanguages.enUS,
    countryCode: 'US',
    i18nIsoCountryLocale: 'en',
    translationKey: 'language.english',
    flag: '🇺🇸',
  },
  {
    code: TranslationLanguages.idID,
    countryCode: 'ID',
    i18nIsoCountryLocale: 'id',
    translationKey: 'language.indonesian',
    flag: '🇮🇩',
  },
  {
    code: TranslationLanguages.esES,
    countryCode: 'ES',
    i18nIsoCountryLocale: 'es',
    translationKey: 'language.spanish',
    flag: '🇪🇸',
  },
]

export function normalizeTranslationLanguage(language: string | null | undefined): TranslationLanguage {
  if (!language) {
    return DefaultTranslationLanguage
  }

  const normalized = language.toLowerCase()

  if (normalized.startsWith('id')) {
    return TranslationLanguages.idID
  }

  if (normalized.startsWith('es')) {
    return TranslationLanguages.esES
  }

  return TranslationLanguages.enUS
}
