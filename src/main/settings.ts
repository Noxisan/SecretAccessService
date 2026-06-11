import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { AppSettings } from '../shared/types.js'

/**
 * App settings live OUTSIDE the vault (CLAUDE.md §6) — language, theme, accent,
 * timeouts. Never store secrets here. Persisted as plain JSON in userData.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'system',
  accent: '#7c3aed', // electric violet
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  maxFailedAttempts: 10,
  travelHiddenCategoryIds: [],
  uiScale: 1,
  itemSort: 'az',
  clearClipboardOnLock: true,
  lockOnMinimize: false,
  minimizeToTrayOnClose: false,
  passwordHistoryLimit: 50,
  generatorDefaults: {
    length: 20,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
    mode: 'characters',
    words: 5,
    separator: '-'
  }
}

export class SettingsStore {
  #path: string
  #current: AppSettings = DEFAULT_SETTINGS

  constructor(settingsPath?: string) {
    this.#path = settingsPath ?? join(app.getPath('userData'), 'settings.json')
  }

  async load(): Promise<AppSettings> {
    try {
      const raw = await readFile(this.#path, 'utf8')
      this.#current = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
    } catch {
      this.#current = DEFAULT_SETTINGS
    }
    return this.#current
  }

  get(): AppSettings {
    return this.#current
  }

  async set(next: AppSettings): Promise<void> {
    this.#current = next
    await mkdir(dirname(this.#path), { recursive: true })
    await writeFile(this.#path, JSON.stringify(next, null, 2), 'utf8')
  }
}
