import { describe, it, expect } from 'vitest'
import { estimatePoolSize, estimateStrength } from './entropy.js'
import type { GeneratePasswordOptions } from '../../../../shared/types.js'

const base: GeneratePasswordOptions = {
  length: 16,
  uppercase: false,
  lowercase: false,
  digits: false,
  symbols: false,
  excludeAmbiguous: false,
  mode: 'characters'
}

describe('estimatePoolSize', () => {
  it('sums selected character classes', () => {
    expect(estimatePoolSize({ ...base, lowercase: true })).toBe(26)
    expect(estimatePoolSize({ ...base, lowercase: true, uppercase: true, digits: true })).toBe(62)
  })

  it('subtracts ambiguous members when excluded', () => {
    // digits 10 - 5 ambiguous = 5
    expect(estimatePoolSize({ ...base, digits: true, excludeAmbiguous: true })).toBe(5)
  })
})

describe('estimateStrength', () => {
  it('rates a long all-class password very strong', () => {
    const s = estimateStrength({
      ...base,
      length: 24,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true
    })
    expect(s.level).toBe('veryStrong')
    expect(s.score).toBe(5)
    expect(s.bits).toBeGreaterThanOrEqual(128)
  })

  it('rates a short digit-only PIN very weak', () => {
    const s = estimateStrength({ ...base, length: 4, digits: true })
    expect(s.level).toBe('veryWeak')
    expect(s.score).toBe(1)
  })

  it('scores passphrases from word count', () => {
    const few = estimateStrength({ ...base, mode: 'passphrase', words: 3 })
    const many = estimateStrength({ ...base, mode: 'passphrase', words: 10 })
    expect(many.bits).toBeGreaterThan(few.bits)
  })

  it('returns zero bits when no class is selected', () => {
    expect(estimateStrength({ ...base }).bits).toBe(0)
  })
})
