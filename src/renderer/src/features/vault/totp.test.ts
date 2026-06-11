import { describe, it, expect } from 'vitest'
import * as OTPAuth from 'otpauth'
import { parseTotp, computeTotp } from './totp'

// RFC 6238 Appendix B reference secret: the ASCII string "12345678901234567890".
const RFC_SECRET = OTPAuth.Secret.fromUTF8('12345678901234567890')

function makeUri(opts: Partial<{ digits: number; period: number; algorithm: string }> = {}): string {
  return new OTPAuth.TOTP({
    issuer: 'ACME',
    label: 'alice@example.com',
    algorithm: opts.algorithm ?? 'SHA1',
    digits: opts.digits ?? 6,
    period: opts.period ?? 30,
    secret: RFC_SECRET
  }).toString()
}

describe('parseTotp', () => {
  it('parses a valid otpauth://totp URI', () => {
    const totp = parseTotp(makeUri())
    expect(totp).toBeInstanceOf(OTPAuth.TOTP)
    expect(totp?.period).toBe(30)
  })

  it('returns null for malformed input instead of throwing', () => {
    expect(parseTotp('not a uri')).toBeNull()
    expect(parseTotp('')).toBeNull()
    expect(parseTotp('https://example.com')).toBeNull()
  })

  it('returns null for non-TOTP otpauth URIs (e.g. HOTP)', () => {
    const hotp = new OTPAuth.HOTP({ secret: RFC_SECRET }).toString()
    expect(hotp.startsWith('otpauth://hotp/')).toBe(true)
    expect(parseTotp(hotp)).toBeNull()
  })

  it('accepts a bare base32 secret with standard defaults', () => {
    const totp = parseTotp('JBSWY3DPEHPK3PXP')
    expect(totp).toBeInstanceOf(OTPAuth.TOTP)
    expect(totp?.period).toBe(30)
    expect(totp?.digits).toBe(6)
    expect(totp?.algorithm).toBe('SHA1')
  })

  it('tolerates spaces, hyphens, and lower case in a pasted secret', () => {
    const grouped = parseTotp('jbsw y3dp-ehpk 3pxp')
    const plain = parseTotp('JBSWY3DPEHPK3PXP')!
    expect(grouped).toBeInstanceOf(OTPAuth.TOTP)
    // Same secret → identical code at the same instant.
    expect(computeTotp(grouped!, 0).code).toBe(computeTotp(plain, 0).code)
  })

  it('rejects strings that are not valid base32 or are too short', () => {
    expect(parseTotp('not-base32!!!')).toBeNull() // contains non-base32 chars
    expect(parseTotp('ABC189')).toBeNull() // 0/1/8/9 are outside the base32 alphabet
    expect(parseTotp('JBSW')).toBeNull() // too short to be a real secret
  })
})

describe('computeTotp', () => {
  it('matches the RFC 6238 SHA1 test vector (T=59 → 94287082)', () => {
    const totp = parseTotp(makeUri({ digits: 8 }))!
    const snap = computeTotp(totp, 59 * 1000)
    expect(snap.code).toBe('94287082')
  })

  it('produces the same code as otpauth for a given timestamp', () => {
    const totp = parseTotp(makeUri())!
    const now = 1_700_000_000_000
    expect(computeTotp(totp, now).code).toBe(totp.generate({ timestamp: now }))
  })

  it('reports a full period remaining at an exact step boundary', () => {
    const totp = parseTotp(makeUri({ period: 30 }))!
    // now = 0 → elapsed 0s into the window → whole period remains
    expect(computeTotp(totp, 0).secondsLeft).toBe(30)
  })

  it('counts seconds down to 1 at the end of the window', () => {
    const totp = parseTotp(makeUri({ period: 30 }))!
    // 29s into the 30s window → 1 second left
    expect(computeTotp(totp, 29 * 1000).secondsLeft).toBe(1)
  })

  it('respects a custom period', () => {
    const totp = parseTotp(makeUri({ period: 60 }))!
    const snap = computeTotp(totp, 10 * 1000)
    expect(snap.period).toBe(60)
    expect(snap.secondsLeft).toBe(50)
  })
})
