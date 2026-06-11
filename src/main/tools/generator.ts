import { randomBytes } from '../crypto/index.js'
import type { GeneratePasswordOptions } from '../../shared/types.js'
import { EFF_LARGE_WORDLIST } from './wordlist.js'

/**
 * Cryptographically secure password / passphrase generator. All randomness comes
 * from libsodium's CSPRNG via `randomBytes`; we use rejection sampling to avoid
 * modulo bias.
 */

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/'
const AMBIGUOUS = new Set('Il1O0oB8S5Z2|`\'"{}[]()/\\'.split(''))

/** Unbiased index in [0, max) via rejection sampling on a single byte. */
async function uniformByte(max: number): Promise<number> {
  if (max <= 0 || max > 256) throw new Error('uniformByte range must be 1..256')
  const limit = 256 - (256 % max) // largest multiple of max ≤ 256
  // Pull bytes until one falls in the unbiased region.
  for (;;) {
    const [byte] = await randomBytes(1)
    if (byte !== undefined && byte < limit) return byte % max
  }
}

/**
 * Unbiased index in [0, max) for larger ranges (up to 65536) via rejection
 * sampling on two bytes. Used for the 7776-word diceware list, which overflows
 * the single-byte `uniformByte`.
 */
async function uniformIndex(max: number): Promise<number> {
  if (max <= 0 || max > 65536) throw new Error('uniformIndex range must be 1..65536')
  if (max <= 256) return uniformByte(max)
  const limit = 65536 - (65536 % max) // largest multiple of max ≤ 65536
  for (;;) {
    const [hi, lo] = await randomBytes(2)
    if (hi === undefined || lo === undefined) continue
    const val = (hi << 8) | lo
    if (val < limit) return val % max
  }
}

async function pick(alphabet: string): Promise<string> {
  const idx = await uniformByte(alphabet.length)
  return alphabet[idx] as string
}

/** True when `pw` contains at least one character from every class in `classes`. */
function coversAllClasses(pw: string, classes: string[]): boolean {
  const chars = [...pw]
  return classes.every((cls) => chars.some((ch) => cls.includes(ch)))
}

export async function generatePassword(opts: GeneratePasswordOptions): Promise<string> {
  if (opts.mode === 'passphrase') {
    return generatePassphrase(opts)
  }

  const classes: string[] = []
  if (opts.lowercase) classes.push(LOWER)
  if (opts.uppercase) classes.push(UPPER)
  if (opts.digits) classes.push(DIGITS)
  if (opts.symbols) classes.push(SYMBOLS)
  const selected = (
    opts.excludeAmbiguous
      ? classes.map((cls) => [...cls].filter((c) => !AMBIGUOUS.has(c)).join(''))
      : classes
  ).filter((cls) => cls.length > 0)

  if (selected.length === 0) {
    throw new Error('Select at least one character class.')
  }

  const alphabet = selected.join('')

  // Guarantee every selected class appears when the requested length can fit one
  // of each. We rejection-sample the whole password rather than forcing
  // characters into fixed positions, so the result stays uniform over the set of
  // passwords that contain all classes — no positional bias. For sensible
  // lengths this almost always passes on the first try; the attempt cap is just
  // a safety net against pathological inputs.
  const requireAllClasses = opts.length >= selected.length
  for (let attempt = 0; ; attempt++) {
    const out: string[] = []
    for (let i = 0; i < opts.length; i++) {
      out.push(await pick(alphabet))
    }
    const pw = out.join('')
    if (!requireAllClasses || attempt >= 1000 || coversAllClasses(pw, selected)) {
      return pw
    }
  }
}

async function generatePassphrase(opts: GeneratePasswordOptions): Promise<string> {
  const count = opts.words ?? 5
  const sep = opts.separator ?? '-'
  const words: string[] = []
  for (let i = 0; i < count; i++) {
    let word = await pick2(EFF_LARGE_WORDLIST)
    if (opts.capitalize) word = word.charAt(0).toUpperCase() + word.slice(1)
    words.push(word)
  }
  let phrase = words.join(sep)
  // Append a random digit so the passphrase satisfies "must contain a number".
  if (opts.wordNumber) phrase += String(await uniformByte(10))
  return phrase
}

async function pick2(list: readonly string[]): Promise<string> {
  const idx = await uniformIndex(list.length)
  return list[idx] as string
}
