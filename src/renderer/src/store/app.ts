import { create } from 'zustand'
import type { AppSettings, VaultData, VaultStatus, VaultItem, VaultItemKind } from '@shared/types'

/**
 * Renderer state. CRITICAL: decrypted vault data lives here ONLY in transient
 * memory while unlocked — it is NEVER persisted (no zustand persist middleware,
 * no localStorage). On lock we drop it entirely.
 */
interface AppState {
  status: VaultStatus
  vault: VaultData | null
  settings: AppSettings | null
  selectedCategoryId: string | null
  showFavoritesOnly: boolean
  search: string
  generatorOpen: boolean
  /** Item editor: open + the item being edited (null = creating a new one). */
  editorOpen: boolean
  editorItem: VaultItem | null
  editorCreateKind: VaultItemKind
  settingsOpen: boolean

  setStatus: (status: VaultStatus) => void
  setVault: (vault: VaultData | null) => void
  setSettings: (settings: AppSettings) => void
  setSelectedCategory: (id: string | null) => void
  setShowFavoritesOnly: (v: boolean) => void
  setSearch: (q: string) => void
  setGeneratorOpen: (open: boolean) => void
  openItemEditor: (item: VaultItem | null, kind?: VaultItemKind) => void
  closeItemEditor: () => void
  setSettingsOpen: (open: boolean) => void
  /** Wipe all decrypted state from renderer memory. */
  clearSecrets: () => void
}

export const useAppStore = create<AppState>((set) => ({
  status: 'absent',
  vault: null,
  settings: null,
  selectedCategoryId: null,
  showFavoritesOnly: false,
  search: '',
  generatorOpen: false,
  editorOpen: false,
  editorItem: null,
  editorCreateKind: 'login',
  settingsOpen: false,

  setStatus: (status) => set({ status }),
  setVault: (vault) => set({ vault }),
  setSettings: (settings) => set({ settings }),
  setSelectedCategory: (selectedCategoryId) => set({ selectedCategoryId, showFavoritesOnly: false }),
  setShowFavoritesOnly: (showFavoritesOnly) => set({ showFavoritesOnly, selectedCategoryId: null }),
  setSearch: (search) => set({ search }),
  setGeneratorOpen: (generatorOpen) => set({ generatorOpen }),
  openItemEditor: (item, kind = 'login') =>
    set({ editorOpen: true, editorItem: item, editorCreateKind: item?.kind ?? kind }),
  closeItemEditor: () => set({ editorOpen: false, editorItem: null }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  clearSecrets: () =>
    set({
      vault: null,
      status: 'locked',
      search: '',
      generatorOpen: false,
      editorOpen: false,
      editorItem: null
    })
}))
