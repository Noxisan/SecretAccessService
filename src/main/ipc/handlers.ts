import { ipcMain, clipboard, type BrowserWindow } from 'electron'
import { z } from 'zod'
import { IPC } from '../../shared/ipc.js'
import type { AppSettings, VaultData, VaultStatus } from '../../shared/types.js'
import { VaultManager } from '../vault/vault.js'
import { generatePassword } from '../tools/generator.js'
import {
  masterPasswordSchema,
  vaultItemSchema,
  categorySchema,
  idSchema,
  generatePasswordSchema,
  clipboardCopySchema,
  settingsSchema
} from './schemas.js'
import type { SettingsStore } from '../settings.js'

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
  })

  handle<void>(IPC.vaultUnlock, async (arg) => {
    const { masterPassword } = parse(masterPasswordSchema, arg)
    await vault.unlock(masterPassword)
  })

  handle<void>(IPC.vaultLock, async () => {
    await vault.lock()
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
}
