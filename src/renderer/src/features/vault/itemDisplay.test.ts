import { describe, it, expect } from 'vitest'
import type {
  CardItem,
  IdentityItem,
  LoginItem,
  PasskeyItem,
  SecureNoteItem,
  TotpItem
} from '../../../../shared/types.js'
import { quickCopyText, quickCopyLabel, matches, subtitle } from './itemDisplay.js'

const base = {
  id: 'x',
  title: 'Acme',
  categoryId: null as string | null,
  favorite: false,
  colorTag: null as string | null,
  createdAt: 1,
  updatedAt: 1,
  notes: '',
  customFields: []
}

const login = (o: Partial<LoginItem> = {}): LoginItem => ({
  ...base,
  kind: 'login',
  username: 'alice',
  password: 'S3cr3t-PW',
  url: 'https://example.com',
  totp: 'otpauth://totp/Acme:alice?secret=NB2W45DFOIZA',
  passwordHistory: [],
  ...o
})
const note = (o: Partial<SecureNoteItem> = {}): SecureNoteItem => ({
  ...base,
  kind: 'note',
  ...o
})
const card = (o: Partial<CardItem> = {}): CardItem => ({
  ...base,
  kind: 'card',
  cardholder: 'Alice Smith',
  number: '4111111111111111',
  brand: 'Visa',
  expMonth: 4,
  expYear: 2030,
  cvv: '123',
  ...o
})
const identity = (o: Partial<IdentityItem> = {}): IdentityItem => ({
  ...base,
  kind: 'identity',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  phone: '555-1234',
  address: '1 Main St',
  ...o
})
const totp = (o: Partial<TotpItem> = {}): TotpItem => ({
  ...base,
  kind: 'totp',
  uri: 'otpauth://totp/GitHub:alice?secret=JBSWY3DPEHPK3PXP',
  issuer: 'GitHub',
  account: 'alice',
  ...o
})
const passkey = (o: Partial<PasskeyItem> = {}): PasskeyItem => ({
  ...base,
  kind: 'passkey',
  rpId: 'example.com',
  rpName: 'Example Inc.',
  userName: 'alice',
  displayName: 'Alice Smith',
  credentialId: 'AAAABBBBCCCCDDDD',
  ...o
})

describe('quickCopyText', () => {
  it('copies the secret/identifying field per kind', () => {
    expect(quickCopyText(login())).toBe('S3cr3t-PW')
    expect(quickCopyText(card())).toBe('4111111111111111')
    expect(quickCopyText(identity())).toBe('alice@example.com')
  })

  it('returns null when there is nothing to copy', () => {
    expect(quickCopyText(login({ password: '' }))).toBeNull()
    expect(quickCopyText(card({ number: '' }))).toBeNull()
    expect(quickCopyText(note())).toBeNull()
    expect(quickCopyText(totp())).toBeNull()
    expect(quickCopyText(passkey())).toBeNull()
  })
})

describe('quickCopyLabel', () => {
  const t = (k: string): string => k
  it('maps each copyable kind to its label key', () => {
    expect(quickCopyLabel(login(), t)).toBe('items.copyPassword')
    expect(quickCopyLabel(card(), t)).toBe('items.copyCardNumber')
    expect(quickCopyLabel(identity(), t)).toBe('items.copyEmail')
  })
  it('falls back to the generic copy label', () => {
    expect(quickCopyLabel(note(), t)).toBe('generator.copy')
    expect(quickCopyLabel(totp(), t)).toBe('generator.copy')
  })
})

describe('matches', () => {
  it('matches on the title for every kind', () => {
    expect(matches(login({ title: 'My Bank' }), 'bank')).toBe(true)
    expect(matches(note({ title: 'Wifi' }), 'wifi')).toBe(true)
  })

  it('matches visible per-kind fields', () => {
    expect(matches(login(), 'alice')).toBe(true) // username
    expect(matches(login(), 'example.com')).toBe(true) // url
    expect(matches(note({ notes: 'router password hint' }), 'router')).toBe(true)
    expect(matches(card(), 'visa')).toBe(true) // brand
    expect(matches(identity(), 'smith')).toBe(true) // lastName
    expect(matches(totp(), 'github')).toBe(true) // issuer
    expect(matches(passkey(), 'example.com')).toBe(true) // rpId
  })

  // The headline security property: a query equal to a secret must not reveal
  // which entry holds it.
  it('never matches secret material', () => {
    expect(matches(login(), 's3cr3t-pw')).toBe(false) // password
    expect(matches(login(), 'nb2w45dfoiza')).toBe(false) // embedded TOTP seed
    expect(matches(card(), '4111111111111111')).toBe(false) // card number
    expect(matches(card(), '123')).toBe(false) // CVV
    expect(matches(totp(), 'jbswy3dpehpk3pxp')).toBe(false) // TOTP secret
    expect(matches(passkey(), 'aaaabbbbccccdddd')).toBe(false) // credential id
  })

  it('does not search the notes of non-note kinds', () => {
    expect(matches(login({ notes: 'sekrit memo' }), 'sekrit')).toBe(false)
  })
})

describe('subtitle', () => {
  it('prefers the most identifying non-secret field', () => {
    expect(subtitle(login())).toBe('alice')
    expect(subtitle(login({ username: '' }))).toBe('https://example.com')
    expect(subtitle(card())).toBe('Alice Smith')
    expect(subtitle(identity())).toBe('Alice Smith')
    expect(subtitle(identity({ firstName: '', lastName: '' }))).toBe('alice@example.com')
    expect(subtitle(totp())).toBe('GitHub')
    expect(subtitle(passkey())).toBe('example.com')
  })

  it('returns an empty string for notes (no preview line)', () => {
    expect(subtitle(note())).toBe('')
  })
})
