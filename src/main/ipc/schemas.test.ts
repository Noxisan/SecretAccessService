import { describe, it, expect } from 'vitest'
import {
  openExternalSchema,
  vaultItemSchema,
  categorySchema,
  settingsSchema,
  generatePasswordSchema,
  masterPasswordSchema,
  clipboardCopySchema,
  importSchema
} from './schemas.js'

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown): boolean =>
  schema.safeParse(v).success

const loginItem = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'i1',
  title: 'Acme',
  categoryId: null,
  favorite: false,
  colorTag: null,
  createdAt: 0,
  updatedAt: 0,
  notes: '',
  customFields: [],
  kind: 'login',
  username: 'alice',
  password: 's3cret',
  url: 'https://example.com',
  totp: null,
  passwordHistory: [],
  ...overrides
})

describe('openExternalSchema (protocol-handler guard)', () => {
  it('accepts http and https URLs', () => {
    expect(ok(openExternalSchema, { url: 'https://example.com' })).toBe(true)
    expect(ok(openExternalSchema, { url: 'http://example.com/path?q=1' })).toBe(true)
  })

  it('rejects non-web schemes that could trigger local handlers', () => {
    for (const url of [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,<script>',
      'ftp://example.com',
      'vbscript:msgbox',
      'example.com', // no scheme
      '  https://example.com' // leading space defeats the ^ anchor
    ]) {
      expect(ok(openExternalSchema, { url })).toBe(false)
    }
  })

  it('rejects an over-long URL', () => {
    expect(ok(openExternalSchema, { url: 'https://e.com/' + 'a'.repeat(4000) })).toBe(false)
  })
})

describe('colorTag validation', () => {
  it('accepts a #rrggbb hex value or null', () => {
    expect(ok(categorySchema, { id: 'c', name: 'X', colorTag: '#7c3aed', order: 0 })).toBe(true)
    expect(ok(categorySchema, { id: 'c', name: 'X', colorTag: null, order: 0 })).toBe(true)
  })

  it('rejects non-hex / shorthand / unprefixed colors', () => {
    for (const colorTag of ['red', '#abc', '7c3aed', '#xyzxyz', '#7c3ae', '#7c3aedff']) {
      expect(ok(categorySchema, { id: 'c', name: 'X', colorTag, order: 0 })).toBe(false)
    }
  })
})

describe('vaultItemSchema (discriminated union)', () => {
  it('accepts a well-formed login item', () => {
    expect(ok(vaultItemSchema, loginItem())).toBe(true)
  })

  it('rejects an unknown kind', () => {
    expect(ok(vaultItemSchema, loginItem({ kind: 'malware' }))).toBe(false)
  })

  it('rejects a login missing a required field', () => {
    const noPassword = loginItem()
    delete noPassword.password
    expect(ok(vaultItemSchema, noPassword)).toBe(false)
  })

  it('rejects an empty title and an over-long title', () => {
    expect(ok(vaultItemSchema, loginItem({ title: '' }))).toBe(false)
    expect(ok(vaultItemSchema, loginItem({ title: 'a'.repeat(501) }))).toBe(false)
  })

  it('enforces card numeric bounds (expMonth 1..12)', () => {
    const card = {
      id: 'c1', title: 'Card', categoryId: null, favorite: false, colorTag: null,
      createdAt: 0, updatedAt: 0, notes: '', customFields: [],
      kind: 'card', cardholder: 'A', number: '4111', brand: 'Visa',
      expMonth: 13, expYear: 2030, cvv: '123'
    }
    expect(ok(vaultItemSchema, card)).toBe(false)
    expect(ok(vaultItemSchema, { ...card, expMonth: 12 })).toBe(true)
  })

  it('caps customFields to prevent unbounded payloads', () => {
    const many = Array.from({ length: 101 }, (_, i) => ({
      id: `f${i}`, label: 'l', value: 'v', secret: false
    }))
    expect(ok(vaultItemSchema, loginItem({ customFields: many }))).toBe(false)
  })
})

describe('generatePasswordSchema', () => {
  const base = {
    length: 20, uppercase: true, lowercase: true, digits: true,
    symbols: true, excludeAmbiguous: false, mode: 'characters'
  }
  it('accepts a valid request', () => {
    expect(ok(generatePasswordSchema, base)).toBe(true)
  })
  it('rejects length outside 4..256 and unknown modes', () => {
    expect(ok(generatePasswordSchema, { ...base, length: 3 })).toBe(false)
    expect(ok(generatePasswordSchema, { ...base, length: 257 })).toBe(false)
    expect(ok(generatePasswordSchema, { ...base, mode: 'morse' })).toBe(false)
  })
})

describe('settingsSchema', () => {
  const base = {
    language: 'en', theme: 'system', accent: '#7c3aed', autoLockMinutes: 5,
    clipboardClearSeconds: 30, maxFailedAttempts: 10, travelHiddenCategoryIds: [], uiScale: 1
  }
  it('accepts valid settings', () => {
    expect(ok(settingsSchema, base)).toBe(true)
  })
  it('rejects bad theme, bad accent, and out-of-range timers', () => {
    expect(ok(settingsSchema, { ...base, theme: 'neon' })).toBe(false)
    expect(ok(settingsSchema, { ...base, accent: 'purple' })).toBe(false)
    expect(ok(settingsSchema, { ...base, autoLockMinutes: -1 })).toBe(false)
    expect(ok(settingsSchema, { ...base, clipboardClearSeconds: 9999 })).toBe(false)
  })
  it('bounds uiScale to a sane range and rejects extremes', () => {
    expect(ok(settingsSchema, { ...base, uiScale: 1.25 })).toBe(true)
    expect(ok(settingsSchema, { ...base, uiScale: 0.5 })).toBe(false)
    expect(ok(settingsSchema, { ...base, uiScale: 3 })).toBe(false)
  })
})

describe('credential and copy schemas', () => {
  it('masterPassword requires 1..1024 chars', () => {
    expect(ok(masterPasswordSchema, { masterPassword: '' })).toBe(false)
    expect(ok(masterPasswordSchema, { masterPassword: 'x' })).toBe(true)
    expect(ok(masterPasswordSchema, { masterPassword: 'a'.repeat(1025) })).toBe(false)
  })

  it('clipboard clearSeconds is bounded to 0..600', () => {
    expect(ok(clipboardCopySchema, { text: 'hi', clearSeconds: 30 })).toBe(true)
    expect(ok(clipboardCopySchema, { text: 'hi', clearSeconds: 601 })).toBe(false)
    expect(ok(clipboardCopySchema, { text: 'hi' })).toBe(true) // optional
  })
})

describe('importSchema', () => {
  it('defaults mode to merge', () => {
    const parsed = importSchema.parse({ filePath: '/tmp/x.csv' })
    expect(parsed.mode).toBe('merge')
  })
  it('rejects an unknown conflict mode and an empty path', () => {
    expect(ok(importSchema, { filePath: '/tmp/x', mode: 'obliterate' })).toBe(false)
    expect(ok(importSchema, { filePath: '' })).toBe(false)
  })
})
