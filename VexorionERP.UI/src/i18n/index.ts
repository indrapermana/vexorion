import i18n from 'i18next'
import countries from 'i18n-iso-countries'
import enCountries from 'i18n-iso-countries/langs/en.json'
import esCountries from 'i18n-iso-countries/langs/es.json'
import idCountries from 'i18n-iso-countries/langs/id.json'
import { initReactI18next } from 'react-i18next'
import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'
import {
  DefaultTranslationLanguage,
  TranslationLanguageStorageKey,
  TranslationLanguages,
  normalizeTranslationLanguage,
} from './translationConstant'

countries.registerLocale(enCountries)
countries.registerLocale(esCountries)
countries.registerLocale(idCountries)

const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : null
const savedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem(TranslationLanguageStorageKey) : null
const initialLanguage = normalizeTranslationLanguage(savedLanguage ?? browserLanguage)

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      [TranslationLanguages.enUS]: { translation: enUS },
      [TranslationLanguages.idID]: { translation: idID },
      [TranslationLanguages.esES]: { translation: esES },
    },
    lng: initialLanguage,
    fallbackLng: DefaultTranslationLanguage,
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TranslationLanguageStorageKey, normalizeTranslationLanguage(language))
  }
})

export { countries }
export default i18n
