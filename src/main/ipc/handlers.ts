import { ipcMain, clipboard, dialog, type BrowserWindow } from 'electron'
import { createHash } from 'node:crypto'
import { get as httpsGet } from 'node:https'
import { readFile, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { IPC } from '../../shared/ipc.js'
import type { AppSettings, VaultData, VaultStatus, VaultItem, LoginItem } from '../../shared/types.js'
import { VaultManager } from '../vault/vault.js'
import { generatePassword } from '../tools/generator.js'
import {
  deriveKey, generateSalt, seal, open, memzero, DEFAULT_KDF_PARAMS
} from '../crypto/index.js'
import {
  FORMAT_VERSION, CIPHER, b64, unb64, headerAad, type VaultFile
} from '../vault/format.js'
import {
  masterPasswordSchema,
  vaultItemSchema,
  categorySchema,
  idSchema,
  generatePasswordSchema,
  clipboardCopySchema,
  breachCheckSchema,
  settingsSchema,
  changePasswordSchema,
  exportSchema,
  importSchema
} from './schemas.js'
import type { SettingsStore } from '../settings.js'

/**
 * k-anonymity HIBP range query (CLAUDE.md §8).
 * Only the first 5 hex chars of the SHA-1 hash leave the process.
 * Returns the breach count for the given password (0 = not found).
 */
async function hibpRangeQuery(password: string): Promise<number> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  const body = await new Promise<string>((resolve, reject) => {
    const req = httpsGet(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { headers: { 'User-Agent': 'SAS-PasswordManager/0.3 (offline-first; k-anon)' } },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('HIBP timeout')) })
  })

  for (const line of body.split('\r\n')) {
    const [s, count] = line.split(':')
    if (s?.toUpperCase() === suffix) return parseInt(count ?? '0', 10)
  }
  return 0
}

/** Encrypt vault data with a standalone password and write to a .sasbak file. */
async function encryptBackup(data: VaultData, password: string): Promise<VaultFile> {
  const salt = await generateSalt()
  const key = await deriveKey(password, salt, DEFAULT_KDF_PARAMS)
  try {
    const plaintext = new TextEncoder().encode(JSON.stringify(data))
    const sealed = await seal(plaintext, key)
    const saltB64 = await b64(salt)
    const header = {
      formatVersion: FORMAT_VERSION,
      kdf: 'argon2id' as const,
      kdfParams: DEFAULT_KDF_PARAMS,
      salt: saltB64,
      cipher: CIPHER,
      nonce: await b64(sealed.nonce)
    }
    return { header, ciphertext: await b64(sealed.ciphertext) }
  } finally {
    await memzero(key, salt)
  }
}

/** Decrypt a .sasbak backup file. Returns the VaultData or throws on wrong password/corrupt. */
async function decryptBackup(file: VaultFile, password: string): Promise<VaultData> {
  const salt = await unb64(file.header.salt)
  const key = await deriveKey(password, salt, file.header.kdfParams)
  try {
    const nonce = await unb64(file.header.nonce)
    const ciphertext = await unb64(file.ciphertext)
    const aad = headerAad(file.header)
    const plaintext = await open({ ciphertext, nonce }, key, aad)
    return JSON.parse(new TextDecoder().decode(plaintext)) as VaultData
  } finally {
    await memzero(key, salt)
  }
}

/**
 * Parse a CSV export from Bitwarden, LastPass, or a generic fallback.
 * Returns an array of VaultItem objects (login items only for safety).
 * The CSV is plaintext — callers should warn users before importing.
 */
function parseCsv(csv: string): VaultItem[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const header = lines[0]?.split(',').map((h) => h.trim().toLowerCase().replace(/^"(.*)"$/, '$1')) ?? []

  const now = Date.now()

  const col = (row: string[], ...names: string[]): string => {
    for (const name of names) {
      const idx = header.indexOf(name)
      if (idx !== -1 && row[idx] !== undefined) return row[idx]?.replace(/^"(.*)"$/, '$1') ?? ''
    }
    return ''
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = ''
      } else {
        current += ch
      }
    }
    result.push(current)
    return result
  }

  const items: VaultItem[] = []
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const row = parseRow(line)
    const title = col(row, 'name', 'title', 'label') || 'Imported item'
    const username = col(row, 'login_username', 'username', 'user name', 'login')
    const password = col(row, 'login_password', 'password', 'pass')
    const url = col(row, 'login_uri', 'url', 'uri', 'website', 'login_uri_1')
    const notes = col(row, 'notes', 'extra', 'comment', 'comments')
    const totp = col(row, 'login_totp', 'totp', 'one time password') || null

    const item: LoginItem = {
      id: crypto.randomUUID(),
      kind: 'login',
      title,
      categoryId: null,
      favorite: false,
      colorTag: null,
      createdAt: now,
      updatedAt: now,
      notes,
      customFields: [],
      username,
      password,
      url,
      totp,
      passwordHistory: []
    }
    items.push(item)
  }
  return items
}

/**
 * Registers every IPC handler with strict zod validation. Each handler validates
 * its payload before touching the vault; validation failures throw and surface
 * to the renderer as a rejected promise (never a partial mutation).
 */
export function registerIpcHandlers(opts: {
  vault: VaultManager
  settings: SettingsStore
  getWindow: () => BrowserWindow | null
  onActivity: () => void
}): void {
  const { vault, settings, onActivity } = opts

  // Failed-unlock attempt counter (CLAUDE.md §8 self-destruct). Resets on
  // successful unlock or app restart. Scoped here so it survives across calls.
  let failedAttempts = 0

  const handle = <T>(channel: string, fn: (arg: unknown) => Promise<T> | T): void => {
    ipcMain.handle(channel, async (_event, arg) => {
      onActivity() // any IPC counts as user activity → resets idle auto-lock
      return fn(arg)
    })
  }

  const parse = <S extends z.ZodTypeAny>(schema: S, arg: unknown): z.infer<S> => {
    const result = schema.safeParse(arg)
    if (!result.success) {
      throw new Error(`Invalid IPC payload: ${result.error.issues[0]?.message ?? 'unknown'}`)
    }
    return result.data
  }

  handle<VaultStatus>(IPC.vaultStatus, async () => {
    if (!(await vault.exists())) return 'absent'
    return vault.isUnlocked ? 'unlocked' : 'locked'
  })

  handle<boolean>(IPC.vaultExists, () => vault.exists())

  handle<void>(IPC.vaultCreate, async (arg) => {
    const { masterPassword } = parse(masterPasswordSchema, arg)
    await vault.create(masterPassword)
    failedAttempts = 0
  })

  // Irreversible: discards any existing vault and creates a fresh one. The
  // renderer gates this behind an explicit destructive confirmation.
  handle<void>(IPC.vaultRecreate, async (arg) => {
    const { masterPassword } = parse(masterPasswordSchema, arg)
    await vault.recreate(masterPassword)
    failedAttempts = 0
  })

  handle<void>(IPC.vaultUnlock, async (arg) => {
    const { masterPassword } = parse(masterPasswordSchema, arg)
    const max = settings.get().maxFailedAttempts

    // If the vault was already destroyed this session, refuse immediately.
    if (max > 0 && failedAttempts >= max) {
      throw new Error('panicked')
    }

    try {
      await vault.unlock(masterPassword)
      failedAttempts = 0
    } catch {
      failedAttempts++
      if (max > 0 && failedAttempts >= max) {
        // Panic: zero the key and delete the vault file. Irreversible.
        await vault.destroy()
        throw new Error('panicked')
      }
      // Embed the current count so the renderer can show a warning.
      throw new Error(`wrong:${failedAttempts}/${max}`)
    }
  })

  handle<void>(IPC.vaultLock, async () => {
    await vault.lock()
  })

  handle<void>(IPC.vaultChangePassword, async (arg) => {
    const { currentPassword, newPassword } = parse(changePasswordSchema, arg)
    if (!vault.isUnlocked) throw new Error('Vault is not unlocked.')
    // Re-verify the current password before allowing the change. vault.unlock()
    // throws without modifying state if the password is wrong, and re-derives the
    // same key (leaving the vault unlocked) if correct.
    await vault.unlock(currentPassword)
    await vault.changeMasterPassword(newPassword)
  })

  handle<VaultData>(IPC.vaultRead, () => vault.read())

  handle<VaultData>(IPC.itemUpsert, async (arg) => {
    const item = parse(vaultItemSchema, arg)
    await vault.update((data) => {
      const items = data.items.filter((i) => i.id !== item.id)
      items.push(item)
      return { ...data, items }
    })
    return vault.read()
  })

  handle<VaultData>(IPC.itemDelete, async (arg) => {
    const { id } = parse(idSchema, arg)
    await vault.update((data) => ({ ...data, items: data.items.filter((i) => i.id !== id) }))
    return vault.read()
  })

  handle<VaultData>(IPC.categoryUpsert, async (arg) => {
    const category = parse(categorySchema, arg)
    await vault.update((data) => {
      const categories = data.categories.filter((c) => c.id !== category.id)
      categories.push(category)
      return { ...data, categories }
    })
    return vault.read()
  })

  handle<VaultData>(IPC.categoryDelete, async (arg) => {
    const { id } = parse(idSchema, arg)
    await vault.update((data) => ({
      ...data,
      categories: data.categories.filter((c) => c.id !== id),
      // orphaned items fall back to "uncategorized"
      items: data.items.map((i) => (i.categoryId === id ? { ...i, categoryId: null } : i))
    }))
    return vault.read()
  })

  handle<string>(IPC.generatePassword, async (arg) => {
    const opts = parse(generatePasswordSchema, arg)
    return generatePassword(opts)
  })

  handle<void>(IPC.clipboardCopy, async (arg) => {
    const { text, clearSeconds } = parse(clipboardCopySchema, arg)
    clipboard.writeText(text)
    const delay = clearSeconds ?? settings.get().clipboardClearSeconds
    if (delay > 0) {
      setTimeout(() => {
        // Only clear if it's still our secret sitting there.
        if (clipboard.readText() === text) clipboard.clear()
      }, delay * 1000)
    }
  })

  handle<AppSettings>(IPC.settingsGet, () => settings.get())

  handle<AppSettings>(IPC.settingsSet, async (arg) => {
    const next = parse(settingsSchema, arg)
    await settings.set(next)
    return settings.get()
  })

  // Returns breach count (0 = clean). Throws on network error so the renderer
  // can surface an error state rather than silently showing a false zero.
  handle<number>(IPC.checkBreached, async (arg) => {
    const { password } = parse(breachCheckSchema, arg)
    return hibpRangeQuery(password)
  })

  // Export: open a save dialog, encrypt the vault with the provided password, write .sasbak
  handle<{ filePath: string | null }>(IPC.vaultExport, async (arg) => {
    const { password } = parse(exportSchema, arg)
    const saveOpts = {
      title: 'Export encrypted vault backup',
      defaultPath: `sas-backup-${new Date().toISOString().slice(0, 10)}.sasbak`,
      filters: [{ name: 'SAS Backup', extensions: ['sasbak'] }, { name: 'All files', extensions: ['*'] }]
    }
    const win = opts.getWindow()
    const result = await (win ? dialog.showSaveDialog(win, saveOpts) : dialog.showSaveDialog(saveOpts))
    if (result.canceled || !result.filePath) return { filePath: null }
    const data = vault.read()
    const file = await encryptBackup(data, password)
    await writeFile(result.filePath, JSON.stringify(file), 'utf8')
    return { filePath: result.filePath }
  })

  // Import: read a .sasbak or .csv file and merge/replace items in the vault.
  // Returns the count of items imported.
  handle<{ imported: number; replaced: boolean }>(IPC.vaultImport, async (arg) => {
    const { filePath, password, mode } = parse(importSchema, arg)
    const content = await readFile(filePath, 'utf8')
    const lower = filePath.toLowerCase()
    let incoming: VaultItem[]

    if (lower.endsWith('.sasbak')) {
      if (!password) throw new Error('Password required to decrypt backup file.')
      const file = JSON.parse(content) as VaultFile
      const backup = await decryptBackup(file, password)
      incoming = backup.items
    } else if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
      incoming = parseCsv(content)
    } else {
      // Try JSON (e.g. a raw vault dump) then fall back to CSV
      try {
        const parsed = JSON.parse(content) as { items?: VaultItem[] }
        incoming = parsed.items ?? []
      } catch {
        incoming = parseCsv(content)
      }
    }

    if (incoming.length === 0) throw new Error('No importable items found in the file.')

    if (mode === 'replace') {
      await vault.update((data) => ({ ...data, items: incoming }))
    } else {
      await vault.update((data) => {
        const existingIds = new Set(data.items.map((i) => i.id))
        const newItems = incoming.filter((i) => !existingIds.has(i.id))
        return { ...data, items: [...data.items, ...newItems] }
      })
    }

    return { imported: incoming.length, replaced: mode === 'replace' }
  })

  // Lightweight heartbeat: the renderer sends this on mouse/keyboard activity so
  // the idle auto-lock timer resets even when no vault IPC calls are in flight.
  // No payload; no return value. onActivity() is already called by the `handle`
  // wrapper above, so just registering the channel is sufficient.
  handle<void>(IPC.activityPing, () => { /* side-effect via onActivity() wrapper */ })
}
