import type { GeneratePasswordOptions } from '@shared/types'

/**
 * Informational entropy estimate for the generator's preview meter. These pool
 * sizes mirror the alphabets in `src/main/tools/generator.ts`; keep them in sync
 * if the engine's character sets change. This is a UI hint, not a security
 * boundary — the actual generation happens (and is tested) in the main process.
 */
const CLASS_SIZE = { lowercase: 26, uppercase: 26, digits: 10, symbols: 26 } as const
// How many members of each class are in the "ambiguous" exclusion set.
const AMBIGUOUS_IN_CLASS = { lowercase: 2, uppercase: 5, digits: 5, symbols: 7 } as const
// Size of the engine's diceware list (EFF large list). A unit test in
// generator.test.ts asserts the real list length, so the two cannot drift.
const WORDLIST_SIZE = 7776

export type StrengthLevel = 'veryWeak' | 'weak' | 'fair' | 'strong' | 'veryStrong'

export interface StrengthEstimate {
  bits: number
  level: StrengthLevel
  /** 1–5, for rendering filled segments */
  score: number
}

export function estimatePoolSize(opts: GeneratePasswordOptions): number {
  let pool = 0
  for (const cls of ['lowercase', 'uppercase', 'digits', 'symbols'] as const) {
    if (opts[cls]) {
      pool += CLASS_SIZE[cls] - (opts.excludeAmbiguous ? AMBIGUOUS_IN_CLASS[cls] : 0)
    }
  }
  return pool
}

export function estimateStrength(opts: GeneratePasswordOptions): StrengthEstimate {
  let bits: number
  if (opts.mode === 'passphrase') {
    bits = (opts.words ?? 5) * Math.log2(WORDLIST_SIZE)
  } else {
    const pool = estimatePoolSize(opts)
    bits = pool > 1 ? opts.length * Math.log2(pool) : 0
  }
  bits = Math.round(bits)

  let level: StrengthLevel
  let score: number
  if (bits < 28) {
    level = 'veryWeak'
    score = 1
  } else if (bits < 36) {
    level = 'weak'
    score = 2
  } else if (bits < 60) {
    level = 'fair'
    score = 3
  } else if (bits < 128) {
    level = 'strong'
    score = 4
  } else {
    level = 'veryStrong'
    score = 5
  }
  return { bits, level, score }
}
