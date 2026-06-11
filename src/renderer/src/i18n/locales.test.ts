import { describe, it, expect } from 'vitest'
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

type Json = Record<string, unknown>

/** Flatten a translation object into [dotted.key, value] pairs at the leaves. */
function leafEntries(obj: Json, prefix = ''): Array<[string, unknown]> {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? leafEntries(v as Json, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v] as [string, unknown]]
  )
}

const others: Record<string, Json> = { zh, hi, es, fr, ar, bn, pt, ru, ur, de }
const enKeys = new Set(leafEntries(en as Json).map(([k]) => k))

describe('locale key parity', () => {
  it('English defines a non-trivial set of keys', () => {
    expect(enKeys.size).toBeGreaterThan(100)
  })

  it('every language has exactly the same keys as English', () => {
    for (const [lng, data] of Object.entries(others)) {
      const keys = new Set(leafEntries(data).map(([k]) => k))
      const missing = [...enKeys].filter((k) => !keys.has(k))
      const extra = [...keys].filter((k) => !enKeys.has(k))
      // Reporting lng keeps the failure message actionable.
      expect({ lng, missing, extra }).toEqual({ lng, missing: [], extra: [] })
    }
  })

  it('no translation value is blank or non-string', () => {
    for (const [lng, data] of Object.entries({ en: en as Json, ...others })) {
      const bad = leafEntries(data)
        .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
        .map(([k]) => k)
      expect({ lng, bad }).toEqual({ lng, bad: [] })
    }
  })
})
