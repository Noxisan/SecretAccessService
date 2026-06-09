import { getSodium } from '../crypto/index.js'
import type { KdfParams } from '../crypto/index.js'

/**
 * On-disk vault file format (CLAUDE.md §3).
 *
 *   { formatVersion, kdf, kdfParams, salt, cipher, nonce } + ciphertext
 *
 * The header is stored as base64 fields in a JSON envelope. The header is also
 * fed to the AEAD as associated data, so tampering with KDF params, salt, or
 * version is detected on decrypt. Bump FORMAT_VERSION on any change and add a
 * migration in migrate.ts.
 */
export const FORMAT_VERSION = 1

export const CIPHER = 'xchacha20poly1305-ietf' as const
export type CipherId = typeof CIPHER

export interface VaultHeader {
  formatVersion: number
  kdf: 'argon2id'
  kdfParams: KdfParams
  /** base64 (original variant) */
  salt: string
  cipher: CipherId
  /** base64 (original variant) */
  nonce: string
}

export interface VaultFile {
  header: VaultHeader
  /** base64 ciphertext (with appended Poly1305 tag) */
  ciphertext: string
}

export async function b64(bytes: Uint8Array): Promise<string> {
  const sodium = await getSodium()
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL)
}

export async function unb64(text: string): Promise<Uint8Array> {
  const sodium = await getSodium()
  return sodium.from_base64(text, sodium.base64_variants.ORIGINAL)
}

/**
 * Canonical serialization of the header for use as AEAD associated data. Must be
 * deterministic, so we emit keys in a fixed order rather than relying on
 * JSON.stringify insertion order.
 *
 * The `nonce` is deliberately EXCLUDED: it is generated during sealing (so it is
 * not yet known when we build the AAD), and it is already authenticated as the
 * AEAD public-nonce input. Everything security-relevant — version, KDF params,
 * salt, cipher — is covered, so a downgrade/parameter-tamper fails decrypt.
 */
export function headerAad(header: VaultHeader): Uint8Array {
  const canonical = JSON.stringify({
    formatVersion: header.formatVersion,
    kdf: header.kdf,
    kdfParams: {
      algorithm: header.kdfParams.algorithm,
      opsLimit: header.kdfParams.opsLimit,
      memLimitKib: header.kdfParams.memLimitKib
    },
    salt: header.salt,
    cipher: header.cipher
  })
  return new TextEncoder().encode(canonical)
}
