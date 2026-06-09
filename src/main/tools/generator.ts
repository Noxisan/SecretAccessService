import { randomBytes } from '../crypto/index.js'
import type { GeneratePasswordOptions } from '../../shared/types.js'

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

async function pick(alphabet: string): Promise<string> {
  const idx = await uniformByte(alphabet.length)
  return alphabet[idx] as string
}

export async function generatePassword(opts: GeneratePasswordOptions): Promise<string> {
  if (opts.mode === 'passphrase') {
    return generatePassphrase(opts)
  }

  let alphabet = ''
  if (opts.lowercase) alphabet += LOWER
  if (opts.uppercase) alphabet += UPPER
  if (opts.digits) alphabet += DIGITS
  if (opts.symbols) alphabet += SYMBOLS
  if (opts.excludeAmbiguous) {
    alphabet = [...alphabet].filter((c) => !AMBIGUOUS.has(c)).join('')
  }
  if (alphabet.length === 0) {
    throw new Error('Select at least one character class.')
  }

  const out: string[] = []
  for (let i = 0; i < opts.length; i++) {
    out.push(await pick(alphabet))
  }
  return out.join('')
}

// A compact EFF-style-ish embedded list keeps the generator fully offline. A
// larger diceware list can be loaded later without changing this interface.
const WORDLIST = [
  'anchor', 'bishop', 'cactus', 'dapple', 'ember', 'fathom', 'gadget', 'harbor',
  'igloo', 'jungle', 'kindle', 'lantern', 'meadow', 'nebula', 'orchard', 'pebble',
  'quartz', 'ripple', 'saffron', 'timber', 'umbra', 'velvet', 'walnut', 'xenon',
  'yonder', 'zephyr', 'amber', 'beacon', 'cinder', 'dynamo', 'echo', 'flint',
  'granite', 'hollow', 'ivory', 'jasper', 'kelp', 'lumen', 'marble', 'nectar'
]

async function generatePassphrase(opts: GeneratePasswordOptions): Promise<string> {
  const count = opts.words ?? 5
  const sep = opts.separator ?? '-'
  const words: string[] = []
  for (let i = 0; i < count; i++) {
    words.push(await pick2(WORDLIST))
  }
  return words.join(sep)
}

async function pick2(list: readonly string[]): Promise<string> {
  const idx = await uniformByte(list.length)
  return list[idx] as string
}
