import { describe, it, expect } from 'vitest'
import {
  deriveKey,
  generateSalt,
  seal,
  open,
  constantTimeEqual,
  randomBytes,
  memzero,
  type KdfParams
} from './index.js'

// Use light KDF params so tests stay fast; production uses the §3 defaults.
const FAST: KdfParams = { algorithm: 'argon2id', opsLimit: 2, memLimitKib: 8 * 1024 }

describe('KDF (Argon2id)', () => {
  it('derives a deterministic 32-byte key for the same password+salt', async () => {
    const salt = await generateSalt()
    const a = await deriveKey('correct horse battery staple', salt, FAST)
    const b = await deriveKey('correct horse battery staple', salt, FAST)
    expect(a.length).toBe(32)
    expect(await constantTimeEqual(a, b)).toBe(true)
  })

  it('produces different keys for different salts', async () => {
    const s1 = await generateSalt()
    const s2 = await generateSalt()
    const a = await deriveKey('pw', s1, FAST)
    const b = await deriveKey('pw', s2, FAST)
    expect(await constantTimeEqual(a, b)).toBe(false)
  })
})

describe('AEAD (XChaCha20-Poly1305)', () => {
  it('round-trips plaintext', async () => {
    const key = await randomBytes(32)
    const msg = new TextEncoder().encode('vault contents here')
    const sealed = await seal(msg, key)
    const out = await open(sealed, key)
    expect(new TextDecoder().decode(out)).toBe('vault contents here')
  })

  it('uses a fresh nonce per seal', async () => {
    const key = await randomBytes(32)
    const msg = new TextEncoder().encode('x')
    const a = await seal(msg, key)
    const b = await seal(msg, key)
    expect(await constantTimeEqual(a.nonce, b.nonce)).toBe(false)
  })

  it('rejects a tampered ciphertext (no best-effort decrypt)', async () => {
    const key = await randomBytes(32)
    const sealed = await seal(new TextEncoder().encode('secret'), key)
    const tampered = { ...sealed, ciphertext: Uint8Array.from(sealed.ciphertext) }
    tampered.ciphertext[0] = (tampered.ciphertext[0] ?? 0) ^ 0xff
    await expect(open(tampered, key)).rejects.toThrow()
  })

  it('rejects the wrong key', async () => {
    const key = await randomBytes(32)
    const other = await randomBytes(32)
    const sealed = await seal(new TextEncoder().encode('secret'), key)
    await expect(open(sealed, other)).rejects.toThrow()
  })

  it('authenticates associated data (tamper-evident header)', async () => {
    const key = await randomBytes(32)
    const aad = new TextEncoder().encode('formatVersion:1')
    const sealed = await seal(new TextEncoder().encode('secret'), key, aad)
    const wrongAad = new TextEncoder().encode('formatVersion:2')
    await expect(open(sealed, key, wrongAad)).rejects.toThrow()
  })
})

describe('memzero', () => {
  it('zeroes a buffer in place', async () => {
    const buf = await randomBytes(16)
    await memzero(buf)
    expect(buf.every((b) => b === 0)).toBe(true)
  })
})
