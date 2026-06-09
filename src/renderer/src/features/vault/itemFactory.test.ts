import { describe, it, expect } from 'vitest'
import { createBlankItem, applyPasswordHistory, finalizeItem } from './itemFactory.js'
import type { LoginItem } from '../../../../shared/types.js'

function login(overrides: Partial<LoginItem> = {}): LoginItem {
  return {
    id: 'x',
    kind: 'login',
    title: 'Acme',
    categoryId: null,
    favorite: false,
    colorTag: null,
    createdAt: 1,
    updatedAt: 1,
    notes: '',
    customFields: [],
    username: 'u',
    password: 'old',
    url: '',
    totp: null,
    passwordHistory: [],
    ...overrides
  }
}

describe('createBlankItem', () => {
  it('creates a login with the login-specific fields and a unique id', () => {
    const a = createBlankItem('login', null)
    const b = createBlankItem('login', 'cat-1')
    expect(a.kind).toBe('login')
    expect(a.id).not.toBe(b.id)
    expect(b.categoryId).toBe('cat-1')
    if (a.kind === 'login') {
      expect(a.passwordHistory).toEqual([])
      expect(a.totp).toBeNull()
    }
  })

  it('creates a secure note without login fields', () => {
    const n = createBlankItem('note', null)
    expect(n.kind).toBe('note')
    expect('password' in n).toBe(false)
  })
})

describe('applyPasswordHistory', () => {
  it('archives the previous password when it changes', () => {
    const prev = login({ password: 'old' })
    const next = login({ password: 'new' })
    const result = applyPasswordHistory(prev, next)
    expect(result.passwordHistory).toHaveLength(1)
    expect(result.passwordHistory[0]?.password).toBe('old')
  })

  it('does nothing when the password is unchanged', () => {
    const prev = login({ password: 'same' })
    const next = login({ password: 'same' })
    expect(applyPasswordHistory(prev, next).passwordHistory).toHaveLength(0)
  })

  it('does nothing for a brand-new item (no previous)', () => {
    expect(applyPasswordHistory(null, login({ password: 'new' })).passwordHistory).toHaveLength(0)
  })

  it('caps history at 50 entries', () => {
    const history = Array.from({ length: 50 }, (_, i) => ({ password: `p${i}`, replacedAt: i }))
    const prev = login({ password: 'old' })
    const next = login({ password: 'new', passwordHistory: history })
    expect(applyPasswordHistory(prev, next).passwordHistory).toHaveLength(50)
  })
})

describe('finalizeItem', () => {
  it('updates updatedAt', () => {
    const out = finalizeItem(null, login({ updatedAt: 1 }))
    expect(out.updatedAt).toBeGreaterThan(1)
  })

  it('folds password history for logins', () => {
    const out = finalizeItem(login({ password: 'old' }), login({ password: 'new' }))
    if (out.kind === 'login') expect(out.passwordHistory).toHaveLength(1)
  })
})
