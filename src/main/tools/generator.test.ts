import { describe, it, expect } from 'vitest'
import { generatePassword } from './generator.js'
import type { GeneratePasswordOptions } from '../../shared/types.js'

const base: GeneratePasswordOptions = {
  length: 20,
  uppercase: false,
  lowercase: false,
  digits: false,
  symbols: false,
  excludeAmbiguous: false,
  mode: 'characters'
}

describe('generatePassword — character mode', () => {
  it('respects the requested length', async () => {
    const pw = await generatePassword({ ...base, lowercase: true, length: 32 })
    expect(pw).toHaveLength(32)
  })

  it('only emits characters from the selected classes', async () => {
    expect(await generatePassword({ ...base, lowercase: true })).toMatch(/^[a-z]+$/)
    expect(await generatePassword({ ...base, uppercase: true })).toMatch(/^[A-Z]+$/)
    expect(await generatePassword({ ...base, digits: true })).toMatch(/^[0-9]+$/)
  })

  it('excludes ambiguous characters when asked', async () => {
    // digits pool minus ambiguous {0,1,2,5,8} → only {3,4,6,7,9}
    const pw = await generatePassword({
      ...base,
      digits: true,
      excludeAmbiguous: true,
      length: 200
    })
    expect(pw).toMatch(/^[34679]+$/)
  })

  it('mixes multiple selected classes over a long sample', async () => {
    const pw = await generatePassword({
      ...base,
      lowercase: true,
      uppercase: true,
      digits: true,
      length: 400
    })
    expect(pw).toMatch(/[a-z]/)
    expect(pw).toMatch(/[A-Z]/)
    expect(pw).toMatch(/[0-9]/)
    expect(pw).not.toMatch(/[^a-zA-Z0-9]/)
  })

  it('throws when no character class is selected', async () => {
    await expect(generatePassword({ ...base })).rejects.toThrow()
  })

  it('does not produce a biased distribution that omits part of the pool', async () => {
    // Over a large sample of a 5-char pool, every member should appear.
    const pw = await generatePassword({ ...base, digits: true, excludeAmbiguous: true, length: 500 })
    for (const ch of '34679') expect(pw).toContain(ch)
  })
})

describe('generatePassword — passphrase mode', () => {
  it('produces the requested number of words', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 5, separator: '-' })
    expect(phrase.split('-')).toHaveLength(5)
  })

  it('honours a custom separator', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 4, separator: '.' })
    expect(phrase.split('.')).toHaveLength(4)
    expect(phrase).not.toContain('-')
  })

  it('uses only dictionary words (lowercase letters)', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 6, separator: ' ' })
    for (const word of phrase.split(' ')) expect(word).toMatch(/^[a-z]+$/)
  })

  it('defaults to 5 words when count is omitted', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase' })
    expect(phrase.split('-')).toHaveLength(5)
  })
})
