import { describe, it, expect } from 'vitest'
import { analyzeVault, WEAK_SCORE, OLD_DAYS } from './analyzeVault'
import type { LoginItem } from '@shared/types'

function makeLogin(overrides: Partial<LoginItem> = {}): LoginItem {
  const now = Date.now()
  return {
    id: Math.random().toString(36).slice(2),
    kind: 'login',
    title: 'Test',
    categoryId: null,
    favorite: false,
    colorTag: null,
    createdAt: now,
    updatedAt: now,
    notes: '',
    customFields: [],
    username: 'user',
    password: 'hunter2',
    url: '',
    totp: null,
    passwordHistory: [],
    ...overrides
  }
}

describe('analyzeVault', () => {
  it('returns empty issues for an empty vault', () => {
    const { issues, totalLogins, safeCount } = analyzeVault([], new Map())
    expect(issues).toHaveLength(0)
    expect(totalLogins).toBe(0)
    expect(safeCount).toBe(0)
  })

  it('flags a weak password', () => {
    const item = makeLogin({ password: '123' })
    const { issues } = analyzeVault([item], new Map())
    expect(issues).toHaveLength(1)
    expect(issues[0]!.reasons).toContain('weak')
  })

  it('does not flag a strong password', () => {
    const item = makeLogin({ password: 'xK9$mP2@qLnWv5#rTy8!' })
    const { issues } = analyzeVault([item], new Map())
    const weakFlag = issues.find((i) => i.item.id === item.id)
    expect(weakFlag?.reasons ?? []).not.toContain('weak')
  })

  it('flags reused passwords across multiple items', () => {
    const pw = 'SharedPassword1!'
    const a = makeLogin({ password: pw })
    const b = makeLogin({ password: pw })
    const { issues } = analyzeVault([a, b], new Map())
    const ids = issues.map((i) => i.item.id)
    expect(ids).toContain(a.id)
    expect(ids).toContain(b.id)
    issues.forEach((i) => expect(i.reasons).toContain('reused'))
  })

  it('does not flag unique passwords as reused', () => {
    const a = makeLogin({ password: 'UniquePass1!' })
    const b = makeLogin({ password: 'OtherPass2@' })
    const { issues } = analyzeVault([a, b], new Map())
    issues.forEach((i) => expect(i.reasons).not.toContain('reused'))
  })

  it('flags a password older than OLD_DAYS', () => {
    const old = Date.now() - (OLD_DAYS + 1) * 24 * 60 * 60 * 1000
    const item = makeLogin({ updatedAt: old, password: 'StrongAndOld99!' })
    const { issues } = analyzeVault([item], new Map())
    const found = issues.find((i) => i.item.id === item.id)
    expect(found?.reasons).toContain('old')
  })

  it('does not flag a recently updated password as old', () => {
    const item = makeLogin({ updatedAt: Date.now() - 10_000 })
    const { issues } = analyzeVault([item], new Map())
    const found = issues.find((i) => i.item.id === item.id)
    expect(found?.reasons ?? []).not.toContain('old')
  })

  it('flags a breached password when breach count > 0', () => {
    const item = makeLogin({ password: 'hunter2' })
    const breaches = new Map([[item.id, 42]])
    const { issues } = analyzeVault([item], breaches)
    const found = issues.find((i) => i.item.id === item.id)
    expect(found?.reasons).toContain('breached')
  })

  it('does not flag a breach when count is 0', () => {
    const item = makeLogin({ password: 'hunter2' })
    const breaches = new Map([[item.id, 0]])
    const { issues } = analyzeVault([item], breaches)
    const found = issues.find((i) => i.item.id === item.id)
    expect(found?.reasons ?? []).not.toContain('breached')
  })

  it('tallies totalLogins and safeCount correctly', () => {
    const safe = makeLogin({ password: 'xK9$mP2@qLnWv5#rTy8!' })
    const weak = makeLogin({ password: '123' })
    const { totalLogins, safeCount, issues } = analyzeVault([safe, weak], new Map())
    expect(totalLogins).toBe(2)
    expect(issues.length + safeCount).toBe(totalLogins)
  })

  it('accumulates multiple reasons on one item', () => {
    const old = Date.now() - (OLD_DAYS + 1) * 24 * 60 * 60 * 1000
    const a = makeLogin({ password: '123', updatedAt: old })
    const b = makeLogin({ password: '123', updatedAt: old })
    const { issues } = analyzeVault([a, b], new Map())
    const found = issues.find((i) => i.item.id === a.id)
    expect(found?.reasons).toContain('weak')
    expect(found?.reasons).toContain('reused')
    expect(found?.reasons).toContain('old')
  })

  it('exports WEAK_SCORE and OLD_DAYS as positive numbers', () => {
    expect(WEAK_SCORE).toBeGreaterThan(0)
    expect(OLD_DAYS).toBeGreaterThan(0)
  })
})
