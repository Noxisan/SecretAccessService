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

/**
 * Safely parse an `otpauth://` URI into a TOTP credential.
 *
 * Returns `null` (never throws) for malformed input or for non-TOTP URIs such
 * as `otpauth://hotp/...`, so callers can treat a bad QR scan as "no code".
 */
export function parseTotp(uri: string): OTPAuth.TOTP | null {
  try {
    const parsed = OTPAuth.URI.parse(uri)
    return parsed instanceof OTPAuth.TOTP ? parsed : null
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
