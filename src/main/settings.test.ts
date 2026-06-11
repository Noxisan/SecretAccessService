import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// settings.ts imports `app` from electron only to derive a default path; every
// test passes an explicit path, so a minimal stub is enough to load the module.
vi.mock('electron', () => ({ app: { getPath: (): string => tmpdir() } }))

import { SettingsStore, DEFAULT_SETTINGS } from './settings.js'

let dir: string
let file: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sas-settings-'))
  file = join(dir, 'settings.json')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('SettingsStore.load', () => {
  it('returns defaults when no file exists', async () => {
    const store = new SettingsStore(file)
    expect(await store.load()).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when the file is corrupt JSON', async () => {
    await writeFile(file, '{ not valid json', 'utf8')
    const store = new SettingsStore(file)
    expect(await store.load()).toEqual(DEFAULT_SETTINGS)
  })

  it('merges persisted values over defaults (new keys keep their default)', async () => {
    // An older settings file missing keys added later must not lose the defaults.
    await writeFile(file, JSON.stringify({ theme: 'dark', autoLockMinutes: 1 }), 'utf8')
    const loaded = await new SettingsStore(file).load()
    expect(loaded.theme).toBe('dark')
    expect(loaded.autoLockMinutes).toBe(1)
    // Untouched keys fall back to defaults.
    expect(loaded.accent).toBe(DEFAULT_SETTINGS.accent)
    expect(loaded.clipboardClearSeconds).toBe(DEFAULT_SETTINGS.clipboardClearSeconds)
  })
})

describe('SettingsStore.set / get', () => {
  it('persists settings and reflects them via get()', async () => {
    const store = new SettingsStore(file)
    await store.load()
    const next = { ...DEFAULT_SETTINGS, language: 'de', clipboardClearSeconds: 15 }
    await store.set(next)
    expect(store.get()).toEqual(next)
  })

  it('writes pretty-printed JSON that a fresh store reads back', async () => {
    await new SettingsStore(file).set({ ...DEFAULT_SETTINGS, language: 'fr' })
    const onDisk = await readFile(file, 'utf8')
    expect(onDisk).toContain('\n  ') // 2-space indented
    const reloaded = await new SettingsStore(file).load()
    expect(reloaded.language).toBe('fr')
  })

  it('creates the parent directory if it does not exist', async () => {
    const nested = join(dir, 'a', 'b', 'settings.json')
    const store = new SettingsStore(nested)
    await store.set({ ...DEFAULT_SETTINGS, accent: '#ff0000' })
    expect((await new SettingsStore(nested).load()).accent).toBe('#ff0000')
  })
})
