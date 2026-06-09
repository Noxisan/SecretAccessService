import _sodium from 'libsodium-wrappers-sumo'

/**
 * libsodium loads its WASM asynchronously. Every crypto entrypoint must await
 * `getSodium()` before touching the library. We resolve the singleton once.
 *
 * The "-sumo" build is mandatory: the standard build omits `crypto_pwhash`
 * (Argon2id), which the KDF depends on.
 */
let ready: Promise<typeof _sodium> | null = null

export async function getSodium(): Promise<typeof _sodium> {
  if (ready === null) {
    ready = _sodium.ready.then(() => _sodium)
  }
  return ready
}

export type Sodium = typeof _sodium
