import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'

const resources = {
  enUS: { translation: enUS },
  esES: { translation: esES },
  idID: { translation: idID },
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'enUS',
    lng: localStorage.getItem('language') ?? 'enUS',
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng)
})

export default i18n
