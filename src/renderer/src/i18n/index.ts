import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../locales/en/translation.json'
import zh from '../../locales/zh/translation.json'
import hi from '../../locales/hi/translation.json'
import es from '../../locales/es/translation.json'
import fr from '../../locales/fr/translation.json'
import ar from '../../locales/ar/translation.json'
import bn from '../../locales/bn/translation.json'
import pt from '../../locales/pt/translation.json'
import ru from '../../locales/ru/translation.json'
import ur from '../../locales/ur/translation.json'
import de from '../../locales/de/translation.json'

/**
 * i18n setup (CLAUDE.md §6). Top-10 most-spoken world languages + German.
 * RTL (ar/ur) is handled in App via the `dir` attribute on <html>.
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ur', 'de'
] as const

export const RTL_LANGUAGES = new Set(['ar', 'ur'])

/** Native (endonym) display names for each supported language. */
export const LANGUAGE_NAMES: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  en: 'English',
  zh: '中文',
  hi: 'हिंदी',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  bn: 'বাংলা',
  pt: 'Português',
  ru: 'Русский',
  ur: 'اردو',
  de: 'Deutsch'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    hi: { translation: hi },
    es: { translation: es },
    fr: { translation: fr },
    ar: { translation: ar },
    bn: { translation: bn },
    pt: { translation: pt },
    ru: { translation: ru },
    ur: { translation: ur },
    de: { translation: de }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false
})

export default i18n
