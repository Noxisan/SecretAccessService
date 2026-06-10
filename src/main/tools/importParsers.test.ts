import { describe, it, expect } from 'vitest'
import { parseCsv, parseBitwardenJson, isBitwardenJson } from './importParsers.js'
import type { LoginItem, CardItem, IdentityItem, SecureNoteItem } from '../../shared/types.js'

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe('parseCsv', () => {
  it('returns empty array for header-only CSV', () => {
    expect(parseCsv('name,username,password,url,notes')).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('parses a Bitwarden-style CSV row', () => {
    const csv = `name,login_username,login_password,login_uri,notes
GitHub,user@example.com,s3cr3t,https://github.com,personal account`
    const items = parseCsv(csv)
    expect(items).toHaveLength(1)
    const item = items[0] as LoginItem
    expect(item.kind).toBe('login')
    expect(item.title).toBe('GitHub')
    expect(item.username).toBe('user@example.com')
    expect(item.password).toBe('s3cr3t')
    expect(item.url).toBe('https://github.com')
    expect(item.notes).toBe('personal account')
    expect(item.totp).toBeNull()
  })

  it('parses a LastPass-style CSV (username/password columns)', () => {
    const csv = `name,url,username,password,extra
Work Email,https://mail.example.com,alice,hunter2,`
    const items = parseCsv(csv)
    expect(items).toHaveLength(1)
    const item = items[0] as LoginItem
    expect(item.title).toBe('Work Email')
    expect(item.username).toBe('alice')
    expect(item.password).toBe('hunter2')
    expect(item.url).toBe('https://mail.example.com')
  })

  it('falls back to "Imported item" when title column is absent', () => {
    const csv = `username,password
alice,hunter2`
    const items = parseCsv(csv)
    expect(items[0]?.title).toBe('Imported item')
  })

  it('handles quoted fields with embedded commas', () => {
    const csv = `name,username,password,url,notes
"Site, Inc.",user,pass,https://example.com,"notes, with comma"`
    const items = parseCsv(csv)
    expect(items).toHaveLength(1)
    const item = items[0] as LoginItem
    expect(item.title).toBe('Site, Inc.')
    expect(item.notes).toBe('notes, with comma')
  })

  it('handles RFC 4180 escaped double-quotes inside quoted fields', () => {
    const csv = `name,password
"She said ""hello""",p4ss`
    const items = parseCsv(csv)
    expect((items[0] as LoginItem).title).toBe('She said "hello"')
  })

  it('parses a TOTP column when present', () => {
    const csv = `name,login_username,login_password,login_uri,login_totp
MyApp,user,pass,https://app.example.com,otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP`
    const items = parseCsv(csv)
    const item = items[0] as LoginItem
    expect(item.totp).toBe('otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP')
  })

  it('sets totp to null when TOTP column is empty', () => {
    const csv = `name,login_username,login_password,login_totp
NoTotp,user,pass,`
    const items = parseCsv(csv)
    expect((items[0] as LoginItem).totp).toBeNull()
  })

  it('skips blank lines', () => {
    const csv = `name,password
Row1,pass1

Row2,pass2
`
    expect(parseCsv(csv)).toHaveLength(2)
  })

  it('assigns unique IDs to every item', () => {
    const csv = `name,password
A,p1
B,p2
C,p3`
    const items = parseCsv(csv)
    const ids = items.map((i) => i.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('sets favorite=false, colorTag=null, categoryId=null by default', () => {
    const csv = `name,password\nX,y`
    const item = parseCsv(csv)[0]!
    expect(item.favorite).toBe(false)
    expect(item.colorTag).toBeNull()
    expect(item.categoryId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isBitwardenJson
// ---------------------------------------------------------------------------

describe('isBitwardenJson', () => {
  it('returns true for a minimal valid Bitwarden export', () => {
    const bw = JSON.stringify({ items: [{ type: 1 }] })
    expect(isBitwardenJson(bw)).toBe(true)
  })

  it('returns true for all supported Bitwarden types', () => {
    for (const t of [1, 2, 3, 4]) {
      expect(isBitwardenJson(JSON.stringify({ items: [{ type: t }] }))).toBe(true)
    }
  })

  it('returns false for a native SAS JSON (no type field)', () => {
    const sas = JSON.stringify({ items: [{ kind: 'login', id: 'abc' }] })
    expect(isBitwardenJson(sas)).toBe(false)
  })

  it('returns false for an empty items array', () => {
    expect(isBitwardenJson(JSON.stringify({ items: [] }))).toBe(false)
  })

  it('returns false for malformed JSON', () => {
    expect(isBitwardenJson('{not json')).toBe(false)
  })

  it('returns false for a plain CSV string', () => {
    expect(isBitwardenJson('name,password\nfoo,bar')).toBe(false)
  })

  it('returns false when type value is out of range', () => {
    expect(isBitwardenJson(JSON.stringify({ items: [{ type: 99 }] }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parseBitwardenJson
// ---------------------------------------------------------------------------

describe('parseBitwardenJson', () => {
  it('returns empty array for an empty items list', () => {
    expect(parseBitwardenJson(JSON.stringify({ items: [] }))).toEqual([])
  })

  it('returns empty array for malformed JSON', () => {
    expect(parseBitwardenJson('{not json')).toEqual([])
  })

  it('throws on encrypted=true exports', () => {
    const enc = JSON.stringify({ encrypted: true, items: [] })
    expect(() => parseBitwardenJson(enc)).toThrow('Bitwarden encrypted')
  })

  it('parses a login item (type 1)', () => {
    const bw = JSON.stringify({
      items: [{
        type: 1,
        name: 'GitHub',
        favorite: false,
        notes: 'personal',
        login: {
          username: 'alice',
          password: 's3cr3t',
          uris: [{ uri: 'https://github.com' }],
          totp: null
        }
      }]
    })
    const items = parseBitwardenJson(bw)
    expect(items).toHaveLength(1)
    const item = items[0] as LoginItem
    expect(item.kind).toBe('login')
    expect(item.title).toBe('GitHub')
    expect(item.username).toBe('alice')
    expect(item.password).toBe('s3cr3t')
    expect(item.url).toBe('https://github.com')
    expect(item.notes).toBe('personal')
    expect(item.totp).toBeNull()
    expect(item.passwordHistory).toEqual([])
  })

  it('captures TOTP seed from login items', () => {
    const uri = 'otpauth://totp/Example?secret=JBSWY3DPEHPK3PXP'
    const bw = JSON.stringify({ items: [{ type: 1, name: 'X', login: { totp: uri } }] })
    const item = parseBitwardenJson(bw)[0] as LoginItem
    expect(item.totp).toBe(uri)
  })

  it('uses first URI when multiple URIs are present', () => {
    const bw = JSON.stringify({
      items: [{ type: 1, name: 'X', login: { uris: [{ uri: 'https://a.com' }, { uri: 'https://b.com' }] } }]
    })
    expect((parseBitwardenJson(bw)[0] as LoginItem).url).toBe('https://a.com')
  })

  it('parses a secure note (type 2)', () => {
    const bw = JSON.stringify({ items: [{ type: 2, name: 'My Note', notes: 'secret content' }] })
    const item = parseBitwardenJson(bw)[0] as SecureNoteItem
    expect(item.kind).toBe('note')
    expect(item.title).toBe('My Note')
    expect(item.notes).toBe('secret content')
  })

  it('parses a card item (type 3)', () => {
    const bw = JSON.stringify({
      items: [{
        type: 3,
        name: 'Visa',
        card: {
          cardholderName: 'Alice Smith',
          brand: 'Visa',
          number: '4111111111111111',
          expMonth: '12',
          expYear: '2028',
          code: '123'
        }
      }]
    })
    const item = parseBitwardenJson(bw)[0] as CardItem
    expect(item.kind).toBe('card')
    expect(item.cardholder).toBe('Alice Smith')
    expect(item.brand).toBe('Visa')
    expect(item.number).toBe('4111111111111111')
    expect(item.expMonth).toBe(12)
    expect(item.expYear).toBe(2028)
    expect(item.cvv).toBe('123')
  })

  it('clamps card expMonth to 1–12', () => {
    const bw = JSON.stringify({ items: [{ type: 3, name: 'C', card: { expMonth: '99', expYear: '2030' } }] })
    expect((parseBitwardenJson(bw)[0] as CardItem).expMonth).toBe(12)
  })

  it('parses an identity item (type 4)', () => {
    const bw = JSON.stringify({
      items: [{
        type: 4,
        name: 'Personal ID',
        identity: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          phone: '+1-555-0100',
          address1: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
          country: 'US'
        }
      }]
    })
    const item = parseBitwardenJson(bw)[0] as IdentityItem
    expect(item.kind).toBe('identity')
    expect(item.firstName).toBe('Alice')
    expect(item.lastName).toBe('Smith')
    expect(item.email).toBe('alice@example.com')
    expect(item.phone).toBe('+1-555-0100')
    expect(item.address).toBe('123 Main St, Springfield, IL, 62701, US')
  })

  it('maps custom fields and marks secret fields (type 1 = hidden)', () => {
    const bw = JSON.stringify({
      items: [{
        type: 1,
        name: 'App',
        login: {},
        fields: [
          { name: 'API Key', value: 'abc123', type: 1 },
          { name: 'Env', value: 'production', type: 0 }
        ]
      }]
    })
    const item = parseBitwardenJson(bw)[0] as LoginItem
    expect(item.customFields).toHaveLength(2)
    expect(item.customFields[0]?.label).toBe('API Key')
    expect(item.customFields[0]?.secret).toBe(true)
    expect(item.customFields[1]?.label).toBe('Env')
    expect(item.customFields[1]?.secret).toBe(false)
  })

  it('sets favorite=true when Bitwarden marks the item as favorite', () => {
    const bw = JSON.stringify({ items: [{ type: 2, name: 'N', favorite: true }] })
    expect(parseBitwardenJson(bw)[0]?.favorite).toBe(true)
  })

  it('skips items with unknown type values', () => {
    const bw = JSON.stringify({
      items: [
        { type: 1, name: 'Login', login: {} },
        { type: 99, name: 'Unknown' }
      ]
    })
    expect(parseBitwardenJson(bw)).toHaveLength(1)
  })

  it('assigns a unique ID to every item', () => {
    const bw = JSON.stringify({
      items: [
        { type: 1, name: 'A', login: {} },
        { type: 2, name: 'B' },
        { type: 1, name: 'C', login: {} }
      ]
    })
    const ids = parseBitwardenJson(bw).map((i) => i.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('handles missing login/card/identity sub-objects gracefully', () => {
    const bw = JSON.stringify({ items: [{ type: 1, name: 'Bare' }] })
    const item = parseBitwardenJson(bw)[0] as LoginItem
    expect(item.username).toBe('')
    expect(item.password).toBe('')
    expect(item.url).toBe('')
  })

  it('uses "Imported item" as fallback title when name is missing', () => {
    const bw = JSON.stringify({ items: [{ type: 2 }] })
    expect(parseBitwardenJson(bw)[0]?.title).toBe('Imported item')
  })
})
