import { createHash } from 'node:crypto'

/**
 * Pure helpers for the HaveIBeenPwned k-anonymity range query (CLAUDE.md §8).
 *
 * The network call itself lives in the IPC layer; the security-sensitive parts —
 * deriving the SHA-1 hash, splitting it so that only a 5-char prefix ever leaves
 * the device, and matching the returned suffix list locally — live here so they
 * can be unit-tested in isolation. A bug in suffix matching would either leak a
 * "breached" verdict for the wrong password or silently miss a real breach.
 */

/** A password's SHA-1 hash split into the publishable prefix and the secret suffix. */
export interface HashSplit {
  /** Full uppercase hex SHA-1 digest. */
  full: string
  /** First 5 hex chars — the ONLY part sent to the HIBP range endpoint. */
  prefix: string
  /** Remaining 35 hex chars — compared locally, never transmitted. */
  suffix: string
}

/** Hash a password with SHA-1 and split it for a k-anonymity range query. */
export function hashPassword(password: string): HashSplit {
  const full = createHash('sha1').update(password).digest('hex').toUpperCase()
  return { full, prefix: full.slice(0, 5), suffix: full.slice(5) }
}

/**
 * Parse a HIBP range response body and return the breach count for `suffix`.
 *
 * The body is a list of `SUFFIX:COUNT` lines. We tolerate either `\r\n` or `\n`
 * line endings, surrounding whitespace, and mixed case, and return `0` when the
 * suffix is absent or the count is unparseable (fail-closed: "not known breached").
 */
export function parseRangeResponse(body: string, suffix: string): number {
  const target = suffix.trim().toUpperCase()
  for (const line of body.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const s = line.slice(0, idx).trim().toUpperCase()
    if (s !== target) continue
    const count = parseInt(line.slice(idx + 1).trim(), 10)
    return Number.isFinite(count) && count > 0 ? count : 0
  }
  return 0
}
