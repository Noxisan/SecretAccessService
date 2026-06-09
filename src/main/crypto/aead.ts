import { getSodium } from './sodium.js'

/**
 * XChaCha20-Poly1305 AEAD (CLAUDE.md §3).
 *
 * The 192-bit (24-byte) nonce makes random nonces safe — no counter state to
 * manage — and the cipher is constant-time without AES-NI hardware. Decryption
 * is authenticated: a Poly1305 tag mismatch throws and we NEVER return partial
 * plaintext.
 */

export const NONCE_BYTES = 24 // crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
export const KEY_BYTES = 32 // crypto_aead_xchacha20poly1305_ietf_KEYBYTES

export async function randomNonce(): Promise<Uint8Array> {
  const sodium = await getSodium()
  return sodium.randombytes_buf(NONCE_BYTES)
}

export interface Sealed {
  nonce: Uint8Array
  /** ciphertext with the 16-byte Poly1305 tag appended */
  ciphertext: Uint8Array
}

/**
 * Encrypt `plaintext` under `key`. `associatedData` (e.g. the serialized vault
 * header) is authenticated but not encrypted — tampering with it fails decrypt.
 */
export async function seal(
  plaintext: Uint8Array,
  key: Uint8Array,
  associatedData: Uint8Array | null = null
): Promise<Sealed> {
  const sodium = await getSodium()
  assertKey(key)
  const nonce = sodium.randombytes_buf(NONCE_BYTES)
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    associatedData,
    null, // no secret nonce
    nonce,
    key
  )
  return { nonce, ciphertext }
}

/**
 * Decrypt and verify. Throws on any tag mismatch or malformed input — callers
 * should treat a throw as "wrong password or tampered vault", never retry with
 * a relaxed mode.
 */
export async function open(
  sealed: Sealed,
  key: Uint8Array,
  associatedData: Uint8Array | null = null
): Promise<Uint8Array> {
  const sodium = await getSodium()
  assertKey(key)
  if (sealed.nonce.length !== NONCE_BYTES) {
    throw new Error(`Invalid nonce length: expected ${NONCE_BYTES}, got ${sealed.nonce.length}`)
  }
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, // no secret nonce
    sealed.ciphertext,
    associatedData,
    sealed.nonce,
    key
  )
}

function assertKey(key: Uint8Array): void {
  if (key.length !== KEY_BYTES) {
    throw new Error(`Invalid key length: expected ${KEY_BYTES}, got ${key.length}`)
  }
}
