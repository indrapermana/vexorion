import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'
import type { Dictionary, Locale } from './types'

export const translations: Record<Locale, Dictionary> = {
  en: enUS,
  id: idID,
  es: esES,
}
