import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../locales/en/translation.json'
import de from '../../locales/de/translation.json'

/**
 * i18n setup (CLAUDE.md §6). Ship the top-10 most-spoken languages + German.
 * `en` and `de` are wired here; the remaining locale folders follow the same
 * structure and register the same way. RTL (ar/ur) is handled in App via `dir`.
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ur', 'de'
] as const

export const RTL_LANGUAGES = new Set(['ar', 'ur'])

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false
})

export default i18n
