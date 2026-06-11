import { describe, it, expect } from 'vitest'
import { headerAad, FORMAT_VERSION, CIPHER, type VaultHeader } from './format.js'

const decode = (b: Uint8Array): string => new TextDecoder().decode(b)

function header(overrides: Partial<VaultHeader> = {}): VaultHeader {
  return {
    formatVersion: FORMAT_VERSION,
    kdf: 'argon2id',
    kdfParams: { algorithm: 'argon2id', opsLimit: 3, memLimitKib: 262144 },
    salt: 'c2FsdHNhbHRzYWx0c2FsdA',
    cipher: CIPHER,
    nonce: 'bm9uY2Vub25jZW5vbmNlbm9uY2U',
    ...overrides
  }
}

describe('headerAad', () => {
  it('is deterministic for equal headers', () => {
    expect(decode(headerAad(header()))).toBe(decode(headerAad(header())))
  })

  it('emits a canonical field order independent of input key order', () => {
    // Build a header whose keys are inserted in a different order; the AAD must
    // be identical because headerAad re-serializes in a fixed order.
    const reordered = {
      cipher: CIPHER,
      nonce: 'bm9uY2Vub25jZW5vbmNlbm9uY2U',
      salt: 'c2FsdHNhbHRzYWx0c2FsdA',
      kdfParams: { memLimitKib: 262144, algorithm: 'argon2id' as const, opsLimit: 3 },
      kdf: 'argon2id' as const,
      formatVersion: FORMAT_VERSION
    }
    expect(decode(headerAad(reordered))).toBe(decode(headerAad(header())))
  })

  it('excludes the nonce so it is not part of the authenticated header', () => {
    const a = headerAad(header({ nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA' }))
    const b = headerAad(header({ nonce: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBB' }))
    expect(decode(a)).toBe(decode(b))
    expect(decode(a)).not.toContain('AAAAAAAA')
  })

  // Every security-relevant field must change the AAD — otherwise a downgrade or
  // parameter-tamper would not be detected on decrypt.
  it.each([
    ['formatVersion', header({ formatVersion: 2 })],
    ['salt', header({ salt: 'ZGlmZmVyZW50c2FsdGRpZmZlcmVudA' })],
    ['cipher opsLimit', header({ kdfParams: { algorithm: 'argon2id', opsLimit: 4, memLimitKib: 262144 } })],
    ['memLimitKib', header({ kdfParams: { algorithm: 'argon2id', opsLimit: 3, memLimitKib: 131072 } })]
  ])('changes when %s changes', (_label, tampered) => {
    expect(decode(headerAad(tampered))).not.toBe(decode(headerAad(header())))
  })

  it('covers exactly version, kdf, kdfParams, salt, and cipher (no nonce)', () => {
    const parsed = JSON.parse(decode(headerAad(header())))
    expect(Object.keys(parsed).sort()).toEqual(
      ['cipher', 'formatVersion', 'kdf', 'kdfParams', 'salt'].sort()
    )
    expect(parsed).not.toHaveProperty('nonce')
  })
})
