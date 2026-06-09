import { readFile, writeFile, rename, mkdir, access, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { VaultData } from '../../shared/types.js'
import {
  deriveKey,
  generateSalt,
  seal,
  open,
  memzero,
  DEFAULT_KDF_PARAMS,
  type KdfParams,
  type Sealed
} from '../crypto/index.js'
import {
  FORMAT_VERSION,
  CIPHER,
  b64,
  unb64,
  headerAad,
  type VaultFile,
  type VaultHeader
} from './format.js'
import { migrateVaultData, emptyVaultData } from './migrate.js'

/**
 * Owns the unlocked vault state and the derived key. The key lives ONLY here in
 * main-process memory and is zeroed on lock/quit. The renderer never receives
 * it — it requests decrypted items over IPC while unlocked.
 */
export class VaultManager {
  #path: string
  #key: Uint8Array | null = null
  #header: VaultHeader | null = null
  #data: VaultData | null = null

  constructor(vaultPath: string) {
    this.#path = vaultPath
  }

  get path(): string {
    return this.#path
  }

  get isUnlocked(): boolean {
    return this.#key !== null && this.#data !== null
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.#path)
      return true
    } catch {
      return false
    }
  }

  /** Create a brand-new vault sealed under `masterPassword`. Leaves it unlocked. */
  async create(masterPassword: string, kdfParams: KdfParams = DEFAULT_KDF_PARAMS): Promise<void> {
    if (await this.exists()) {
      throw new Error('A vault already exists at this location.')
    }
    const salt = await generateSalt()
    const key = await deriveKey(masterPassword, salt, kdfParams)
    const header: VaultHeader = {
      formatVersion: FORMAT_VERSION,
      kdf: 'argon2id',
      kdfParams,
      salt: await b64(salt),
      cipher: CIPHER,
      nonce: '' // filled by persist()
    }
    await memzero(salt)
    this.#key = key
    this.#header = header
    this.#data = emptyVaultData()
    await this.#persist()
  }

  /**
   * Destroy any existing vault file and create a fresh one. Used by the
   * "create a new vault" / reset flow when the user can't (or doesn't want to)
   * unlock the current vault — e.g. a forgotten master password or a corrupt
   * file. This is irreversible: the previous ciphertext is deleted.
   */
  async recreate(masterPassword: string, kdfParams: KdfParams = DEFAULT_KDF_PARAMS): Promise<void> {
    await this.lock()
    await rm(this.#path, { force: true })
    await this.create(masterPassword, kdfParams)
  }

  /** Derive the key, decrypt, and hold the unlocked state. Throws on bad password. */
  async unlock(masterPassword: string): Promise<void> {
    const raw = await readFile(this.#path, 'utf8')
    const file = JSON.parse(raw) as VaultFile
    const header = file.header
    if (header.cipher !== CIPHER) {
      throw new Error(`Unsupported cipher: ${header.cipher}`)
    }
    const salt = await unb64(header.salt)
    const key = await deriveKey(masterPassword, salt, header.kdfParams)
    await memzero(salt)

    const sealed: Sealed = {
      nonce: await unb64(header.nonce),
      ciphertext: await unb64(file.ciphertext)
    }
    let plaintext: Uint8Array
    try {
      // header is authenticated as associated data → tamper-evident
      plaintext = await open(sealed, key, headerAad(header))
    } catch {
      await memzero(key)
      // Do not leak whether it was a bad password vs. a corrupt file.
      throw new Error('Could not unlock vault: wrong master password or corrupted file.')
    }

    let data: VaultData
    try {
      data = JSON.parse(new TextDecoder().decode(plaintext)) as VaultData
      data = migrateVaultData(data)
    } finally {
      await memzero(plaintext)
    }

    this.#key = key
    this.#header = header
    this.#data = data
  }

  /** Read the in-memory decrypted data. Throws if locked. */
  read(): VaultData {
    if (!this.#data) throw new Error('Vault is locked.')
    return this.#data
  }

  /** Replace the in-memory data and re-seal to disk atomically. */
  async update(mutator: (data: VaultData) => VaultData): Promise<void> {
    if (!this.#data) throw new Error('Vault is locked.')
    this.#data = mutator(this.#data)
    await this.#persist()
  }

  /** Re-derive a new key from a new master password and re-encrypt. */
  async changeMasterPassword(newPassword: string, kdfParams?: KdfParams): Promise<void> {
    if (!this.#data || !this.#header) throw new Error('Vault is locked.')
    const params = kdfParams ?? this.#header.kdfParams
    const salt = await generateSalt()
    const newKey = await deriveKey(newPassword, salt, params)
    await memzero(this.#key)
    this.#key = newKey
    this.#header = {
      ...this.#header,
      kdfParams: params,
      salt: await b64(salt),
      nonce: ''
    }
    await memzero(salt)
    await this.#persist()
  }

  /** Zero the key and drop all decrypted state from memory. */
  async lock(): Promise<void> {
    await memzero(this.#key)
    this.#key = null
    this.#header = null
    this.#data = null
  }

  async #persist(): Promise<void> {
    if (!this.#key || !this.#header || !this.#data) {
      throw new Error('Cannot persist a locked vault.')
    }
    const plaintext = new TextEncoder().encode(JSON.stringify(this.#data))
    // A fresh random nonce every write — safe with XChaCha20's 192-bit nonce.
    // The header (minus nonce) is authenticated as associated data.
    const sealed = await seal(plaintext, this.#key, headerAad(this.#header))
    await memzero(plaintext)

    const header: VaultHeader = { ...this.#header, nonce: await b64(sealed.nonce) }
    this.#header = header
    const file: VaultFile = {
      header,
      ciphertext: await b64(sealed.ciphertext)
    }

    await mkdir(dirname(this.#path), { recursive: true })
    // Atomic write: temp file + rename, so a crash mid-write can't corrupt the vault.
    const tmp = `${this.#path}.tmp`
    await writeFile(tmp, JSON.stringify(file), { encoding: 'utf8', mode: 0o600 })
    await rename(tmp, this.#path)
  }
}
