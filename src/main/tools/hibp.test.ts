import { describe, it, expect } from 'vitest'
import { hashPassword, parseRangeResponse } from './hibp.js'

describe('hashPassword', () => {
  it('derives the known SHA-1 of "password" and splits k-anonymity prefix/suffix', () => {
    const { full, prefix, suffix } = hashPassword('password')
    expect(full).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8')
    expect(prefix).toBe('5BAA6')
    expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8')
  })

  it('uppercases the hash and keeps prefix at exactly 5 chars', () => {
    const { full, prefix, suffix } = hashPassword('P@ssw0rd')
    expect(full).toBe('21BD12DC183F740EE76F27B78EB39C8AD972A757')
    expect(prefix).toHaveLength(5)
    expect(suffix).toHaveLength(35)
    expect(prefix + suffix).toBe(full)
  })

  it('never embeds the full hash in the transmitted prefix (privacy invariant)', () => {
    const { full, prefix } = hashPassword('correct horse battery staple')
    // Only 5 of 40 hex chars leave the device.
    expect(full.startsWith(prefix)).toBe(true)
    expect(full.slice(0, 5)).toBe(prefix)
  })
})

describe('parseRangeResponse', () => {
  const suffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8' // "password"

  it('returns the breach count for a matching suffix', () => {
    const body = ['0018A45C4D1DEF81644B54AB7F969B88D65:1', `${suffix}:9659365`].join('\r\n')
    expect(parseRangeResponse(body, suffix)).toBe(9659365)
  })

  it('returns 0 when the suffix is not present', () => {
    const body = '0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2'
    expect(parseRangeResponse(body, suffix)).toBe(0)
  })

  it('matches case-insensitively and tolerates a lowercase query suffix', () => {
    const body = `${suffix}:42`
    expect(parseRangeResponse(body, suffix.toLowerCase())).toBe(42)
    expect(parseRangeResponse(body.toLowerCase(), suffix)).toBe(42)
  })

  it('tolerates plain \\n line endings and surrounding whitespace', () => {
    const body = `  AAAA:1 \n ${suffix} : 7 \nBBBB:3`
    expect(parseRangeResponse(body, suffix)).toBe(7)
  })

  it('returns 0 for an empty body', () => {
    expect(parseRangeResponse('', suffix)).toBe(0)
  })

  it('ignores malformed lines without a colon', () => {
    const body = `garbage-line-no-colon\n${suffix}:5`
    expect(parseRangeResponse(body, suffix)).toBe(5)
  })

  it('fails closed (0) when the count is non-numeric or non-positive', () => {
    expect(parseRangeResponse(`${suffix}:notanumber`, suffix)).toBe(0)
    expect(parseRangeResponse(`${suffix}:0`, suffix)).toBe(0)
    expect(parseRangeResponse(`${suffix}:-4`, suffix)).toBe(0)
  })
})
