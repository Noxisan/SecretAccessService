import { getSodium } from './sodium.js'

/**
 * Argon2id master-password → key derivation.
 *
 * libsodium's `crypto_pwhash` is Argon2id (PHC winner) with parallelism fixed
 * at 1 — which matches our target parameters. Only `opsLimit` (iterations) and
 * `memLimit` (memory) are tunable, and both are persisted per-vault in the
 * header so they can be raised over time without breaking old vaults.
 */

export const KEY_BYTES = 32 // XChaCha20-Poly1305 key length
export const SALT_BYTES = 16 // crypto_pwhash_SALTBYTES

/** 2026 desktop defaults (CLAUDE.md §3): memory ≥ 256 MiB, iterations ≥ 3. */
export const DEFAULT_KDF_PARAMS: KdfParams = {
  algorithm: 'argon2id',
  opsLimit: 3,
  memLimitKib: 256 * 1024 // 256 MiB expressed in KiB
}

export interface KdfParams {
  algorithm: 'argon2id'
  /** Iteration count (libsodium opsLimit). */
  opsLimit: number
  /** Memory cost in KiB (libsodium memLimit / 1024). */
  memLimitKib: number
}

export async function generateSalt(): Promise<Uint8Array> {
  const sodium = await getSodium()
  return sodium.randombytes_buf(SALT_BYTES)
}

/**
 * Derive a 32-byte key from the master password. The returned key lives only in
 * main-process memory; callers must `memzero` it on lock/quit.
 */
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
  params: KdfParams
): Promise<Uint8Array> {
  const sodium = await getSodium()
  if (salt.length !== SALT_BYTES) {
    throw new Error(`Invalid salt length: expected ${SALT_BYTES}, got ${salt.length}`)
  }
  if (params.algorithm !== 'argon2id') {
    throw new Error(`Unsupported KDF algorithm: ${params.algorithm}`)
  }
  return sodium.crypto_pwhash(
    KEY_BYTES,
    masterPassword,
    salt,
    params.opsLimit,
    params.memLimitKib * 1024, // memLimit is bytes
    sodium.crypto_pwhash_ALG_ARGON2ID13
  )
}

/**
 * Calibrate `opsLimit` for the current machine, holding memory fixed, so a
 * derivation lands in the target wall-clock window (~0.5–1.0 s). Never lowers
 * below the secure defaults.
 */
export async function calibrateKdf(
  targetMs = 750,
  memLimitKib = DEFAULT_KDF_PARAMS.memLimitKib,
  maxOps = 12
): Promise<KdfParams> {
  const probeSalt = await generateSalt()
  let opsLimit = DEFAULT_KDF_PARAMS.opsLimit
  for (; opsLimit <= maxOps; opsLimit++) {
    const params: KdfParams = { algorithm: 'argon2id', opsLimit, memLimitKib }
    const start = performance.now()
    await deriveKey('calibration-probe', probeSalt, params)
    if (performance.now() - start >= targetMs) {
      return params
    }
  }
  return { algorithm: 'argon2id', opsLimit: maxOps, memLimitKib }
}
