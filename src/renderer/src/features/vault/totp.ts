import * as OTPAuth from 'otpauth'

/** A point-in-time snapshot of a TOTP credential, ready to render. */
export interface TotpSnapshot {
  /** The current one-time code (zero-padded to the configured digit count). */
  code: string
  /** Whole seconds remaining before the code rolls over (1..period). */
  secondsLeft: number
  /** The credential's step length in seconds (typically 30). */
  period: number
}

const BASE32_RE = /^[A-Z2-7]+=*$/

/**
 * Parse a TOTP credential from either a full `otpauth://` URI or a bare base32
 * secret (what many sites display instead of a QR code, e.g. "JBSW Y3DP EHPK").
 *
 * Returns `null` (never throws) for malformed input or non-TOTP URIs such as
 * `otpauth://hotp/...`, so callers can treat a bad scan/paste as "no code". A
 * bare secret yields a TOTP with the standard defaults (SHA1, 6 digits, 30 s).
 */
export function parseTotp(input: string): OTPAuth.TOTP | null {
  const value = input.trim()
  if (!value) return null

  if (/^otpauth:\/\//i.test(value)) {
    try {
      const parsed = OTPAuth.URI.parse(value)
      return parsed instanceof OTPAuth.TOTP ? parsed : null
    } catch {
      return null
    }
  }

  // Treat the input as a bare base32 secret. Strip the spaces/hyphens sites use
  // for readability and normalise case before validating the alphabet.
  const cleaned = value.replace(/[\s-]/g, '').toUpperCase()
  if (cleaned.length < 8 || !BASE32_RE.test(cleaned)) return null
  try {
    return new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(cleaned) })
  } catch {
    return null
  }
}

/**
 * Compute the code and countdown for a TOTP credential at a given instant.
 *
 * Time is injected (`now`, ms since epoch) rather than read from the clock so
 * the result is deterministic and unit-testable. `secondsLeft` is reported in
 * the range `1..period` — at an exact step boundary the code that just became
 * valid has its full `period` remaining.
 */
export function computeTotp(totp: OTPAuth.TOTP, now: number = Date.now()): TotpSnapshot {
  const period = totp.period
  const elapsed = Math.floor(now / 1000) % period
  const secondsLeft = period - elapsed
  const code = totp.generate({ timestamp: now })
  return { code, secondsLeft, period }
}
