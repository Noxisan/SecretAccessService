import { describe, it, expect } from 'vitest'
import { generatePassword } from './generator.js'
import { EFF_LARGE_WORDLIST } from './wordlist.js'
import type { GeneratePasswordOptions } from '../../shared/types.js'

const WORDSET = new Set(EFF_LARGE_WORDLIST)

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

  it('guarantees every selected class appears at the minimum length', async () => {
    // length === number of classes is the tightest case (one slot per class).
    // The guarantee is deterministic, so every one of many runs must satisfy it.
    const opts = { ...base, lowercase: true, uppercase: true, digits: true, symbols: true, length: 4 }
    for (let i = 0; i < 200; i++) {
      const pw = await generatePassword(opts)
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/[0-9]/)
      expect(pw).toMatch(/[^a-zA-Z0-9]/)
    }
  })

  it('respects exclude-ambiguous while still covering every class', async () => {
    const opts = {
      ...base, lowercase: true, uppercase: true, digits: true, symbols: true,
      excludeAmbiguous: true, length: 4
    }
    for (let i = 0; i < 100; i++) {
      const pw = await generatePassword(opts)
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/[0-9]/)
      expect([...pw].some((c) => '!@#$%^&*()-_=+[]{};:,.<>?/'.includes(c))).toBe(true)
      // No ambiguous characters slipped through.
      expect(pw).not.toMatch(/[Il1O0oB8S5Z2|`'"{}()/\\[\]]/)
    }
  })

  it('does not loop forever when length is smaller than the class count', async () => {
    // length 2 with 4 classes cannot contain all of them; generation must still
    // return a valid 2-char password rather than hang on the coverage check.
    const pw = await generatePassword({
      ...base, lowercase: true, uppercase: true, digits: true, symbols: true, length: 2
    })
    expect(pw).toHaveLength(2)
  })
})

describe('EFF diceware wordlist', () => {
  // Drift guard: the renderer's entropy estimate hardcodes 7776 (see
  // entropy.ts WORDLIST_SIZE); this keeps the two in lockstep.
  it('is the full EFF large list of 7776 unique words', () => {
    expect(EFF_LARGE_WORDLIST).toHaveLength(7776)
    expect(WORDSET.size).toBe(7776)
  })

  it('contains only lowercase letters or internal hyphens', () => {
    for (const word of EFF_LARGE_WORDLIST) expect(word).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })
})

describe('generatePassword — passphrase mode', () => {
  // A space separator is used for counting so the list's few hyphenated words
  // (e.g. "t-shirt") are not mis-split.
  it('produces the requested number of words', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 5, separator: ' ' })
    expect(phrase.split(' ')).toHaveLength(5)
  })

  it('honours a custom separator', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 4, separator: '.' })
    expect(phrase.split('.')).toHaveLength(4)
  })

  it('draws every word from the EFF list', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 8, separator: ' ' })
    for (const word of phrase.split(' ')) expect(WORDSET.has(word)).toBe(true)
  })

  it('defaults to 5 words when count is omitted', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', separator: ' ' })
    expect(phrase.split(' ')).toHaveLength(5)
  })

  it('samples the larger range without collapsing to a few words', async () => {
    // Exercises the two-byte uniformIndex path many times; 200 draws from 7776
    // words should yield well over 100 distinct words.
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 200, separator: ' ' })
    expect(new Set(phrase.split(' ')).size).toBeGreaterThan(100)
  })

  it('capitalizes the first letter of every word when asked', async () => {
    const phrase = await generatePassword({
      ...base, mode: 'passphrase', words: 5, separator: ' ', capitalize: true
    })
    for (const word of phrase.split(' ')) expect(word[0]).toBe(word[0]?.toUpperCase())
    // Each capitalized word still maps back to a list word when lower-cased.
    for (const word of phrase.split(' ')) expect(WORDSET.has(word.toLowerCase())).toBe(true)
  })

  it('appends a trailing digit when wordNumber is set', async () => {
    for (let i = 0; i < 30; i++) {
      const phrase = await generatePassword({
        ...base, mode: 'passphrase', words: 4, separator: '-', wordNumber: true
      })
      expect(phrase).toMatch(/[0-9]$/)
      // The body before the digit is still four hyphen-joined words.
      expect(phrase.replace(/[0-9]$/, '').split('-')).toHaveLength(4)
    }
  })

  it('omits capitalization and digits by default', async () => {
    const phrase = await generatePassword({ ...base, mode: 'passphrase', words: 5, separator: ' ' })
    expect(phrase).not.toMatch(/[0-9]/)
    expect(phrase).toBe(phrase.toLowerCase())
  })
})
