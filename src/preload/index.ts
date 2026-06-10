import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc.js'
import type {
  AppSettings,
  VaultData,
  VaultItem,
  Category,
  VaultStatus,
  GeneratePasswordOptions
} from '../shared/types.js'

/**
 * The ONLY bridge between renderer and main (CLAUDE.md §4). Every method maps to
 * a single allow-listed IPC channel — no raw `ipcRenderer` is exposed, so the
 * renderer cannot invoke arbitrary channels. The raw key never crosses here;
 * the renderer only ever receives decrypted item data on demand.
 */
const api = {
  vault: {
    status: (): Promise<VaultStatus> => ipcRenderer.invoke(IPC.vaultStatus),
    exists: (): Promise<boolean> => ipcRenderer.invoke(IPC.vaultExists),
    create: (masterPassword: string): Promise<void> =>
      ipcRenderer.invoke(IPC.vaultCreate, { masterPassword }),
    recreate: (masterPassword: string): Promise<void> =>
      ipcRenderer.invoke(IPC.vaultRecreate, { masterPassword }),
    unlock: (masterPassword: string): Promise<void> =>
      ipcRenderer.invoke(IPC.vaultUnlock, { masterPassword }),
    lock: (): Promise<void> => ipcRenderer.invoke(IPC.vaultLock),
    read: (): Promise<VaultData> => ipcRenderer.invoke(IPC.vaultRead),
    upsertItem: (item: VaultItem): Promise<VaultData> =>
      ipcRenderer.invoke(IPC.itemUpsert, item),
    deleteItem: (id: string): Promise<VaultData> => ipcRenderer.invoke(IPC.itemDelete, { id }),
    upsertCategory: (category: Category): Promise<VaultData> =>
      ipcRenderer.invoke(IPC.categoryUpsert, category),
    deleteCategory: (id: string): Promise<VaultData> =>
      ipcRenderer.invoke(IPC.categoryDelete, { id })
  },
  tools: {
    generatePassword: (opts: GeneratePasswordOptions): Promise<string> =>
      ipcRenderer.invoke(IPC.generatePassword, opts),
    copyToClipboard: (text: string, clearSeconds?: number): Promise<void> =>
      ipcRenderer.invoke(IPC.clipboardCopy, { text, clearSeconds }),
    /** k-anonymity HIBP check — returns breach count, 0 = clean. */
    checkBreached: (password: string): Promise<number> =>
      ipcRenderer.invoke(IPC.checkBreached, { password })
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsGet),
    set: (settings: AppSettings): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.settingsSet, settings)
  },
  /** Subscribe to the main-process "vault was locked" event. Returns an unsubscribe fn. */
  onLocked: (cb: () => void): (() => void) => {
    const listener = (): void => cb()
    ipcRenderer.on(IPC.evtLocked, listener)
    return () => ipcRenderer.removeListener(IPC.evtLocked, listener)
  }
}

contextBridge.exposeInMainWorld('sas', api)

export type SasApi = typeof api
