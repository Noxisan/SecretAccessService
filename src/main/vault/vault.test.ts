import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VaultManager } from './vault.js'
import type { KdfParams } from '../crypto/index.js'
import type { LoginItem } from '../../shared/types.js'

// Light KDF so the suite stays fast; real vaults use the §3 defaults.
const FAST: KdfParams = { algorithm: 'argon2id', opsLimit: 2, memLimitKib: 8 * 1024 }
const PW = 'a-strong-master-password'

function login(id: string, title: string): LoginItem {
  return {
    id, kind: 'login', title, categoryId: null, favorite: false, colorTag: null,
    createdAt: 1, updatedAt: 1, notes: '', customFields: [],
    username: 'user', password: 'p@ss', url: 'https://example.com',
    totp: null, passwordHistory: []
  }
}

let dir: string
let vaultPath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sas-vault-'))
  vaultPath = join(dir, 'vault.sas')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('VaultManager', () => {
  it('creates, persists, and reports existence', async () => {
    const v = new VaultManager(vaultPath)
    expect(await v.exists()).toBe(false)
    await v.create(PW, FAST)
    expect(await v.exists()).toBe(true)
    expect(v.isUnlocked).toBe(true)
  })

  it('round-trips items through lock/unlock', async () => {
    const v = new VaultManager(vaultPath)
    await v.create(PW, FAST)
    await v.update((d) => ({ ...d, items: [login('1', 'GitHub')] }))
    await v.lock()
    expect(v.isUnlocked).toBe(false)

    const v2 = new VaultManager(vaultPath)
    await v2.unlock(PW)
    expect(v2.read().items.map((i) => i.title)).toEqual(['GitHub'])
  })

  it('rejects the wrong master password', async () => {
    const v = new VaultManager(vaultPath)
    await v.create(PW, FAST)
    await v.lock()
    const v2 = new VaultManager(vaultPath)
    await expect(v2.unlock('wrong-password')).rejects.toThrow()
  })

  it('rejects a tampered ciphertext', async () => {
    const v = new VaultManager(vaultPath)
    await v.create(PW, FAST)
    await v.lock()
    const file = JSON.parse(await readFile(vaultPath, 'utf8'))
    file.ciphertext = file.ciphertext.slice(0, -4) + 'AAAA'
    await writeFile(vaultPath, JSON.stringify(file))
    const v2 = new VaultManager(vaultPath)
    await expect(v2.unlock(PW)).rejects.toThrow()
  })

  it('rejects a tampered header (KDF params as associated data)', async () => {
    const v = new VaultManager(vaultPath)
    await v.create(PW, FAST)
    await v.lock()
    const file = JSON.parse(await readFile(vaultPath, 'utf8'))
    // Flip an authenticated header field without touching ciphertext.
    file.header.kdfParams.opsLimit = file.header.kdfParams.opsLimit + 1
    await writeFile(vaultPath, JSON.stringify(file))
    const v2 = new VaultManager(vaultPath)
    await expect(v2.unlock(PW)).rejects.toThrow()
  })

  it('changes the master password and re-encrypts', async () => {
    const v = new VaultManager(vaultPath)
    await v.create(PW, FAST)
    await v.update((d) => ({ ...d, items: [login('1', 'Mail')] }))
    await v.changeMasterPassword('new-master-password', FAST)
    await v.lock()

    const v2 = new VaultManager(vaultPath)
    await expect(v2.unlock(PW)).rejects.toThrow() // old password no longer works
    const v3 = new VaultManager(vaultPath)
    await v3.unlock('new-master-password')
    expect(v3.read().items).toHaveLength(1)
  })
})
