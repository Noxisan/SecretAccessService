import { getSodium } from './sodium.js'

export { getSodium } from './sodium.js'
export {
  deriveKey,
  generateSalt,
  calibrateKdf,
  DEFAULT_KDF_PARAMS,
  KEY_BYTES,
  SALT_BYTES,
  type KdfParams
} from './kdf.js'
export { seal, open, randomNonce, NONCE_BYTES, type Sealed } from './aead.js'

/** Overwrite secret bytes in place. Call on every key/derivation on lock/quit. */
export async function memzero(...buffers: Array<Uint8Array | null | undefined>): Promise<void> {
  const sodium = await getSodium()
  for (const buf of buffers) {
    if (buf && buf.length > 0) sodium.memzero(buf)
  }
}

/** Constant-time equality for secret comparison (e.g. verification tokens). */
export async function constantTimeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  const sodium = await getSodium()
  if (a.length !== b.length) return false
  return sodium.memcmp(a, b)
}

/** Cryptographically secure random bytes. */
export async function randomBytes(length: number): Promise<Uint8Array> {
  const sodium = await getSodium()
  return sodium.randombytes_buf(length)
}
