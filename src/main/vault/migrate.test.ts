import { describe, it, expect } from 'vitest'
import { migrateVaultData, emptyVaultData } from './migrate.js'
import { FORMAT_VERSION } from './format.js'
import type { VaultData } from '../../shared/types.js'

const data = (overrides: Partial<VaultData> = {}): VaultData => ({
  schemaVersion: FORMAT_VERSION,
  categories: [],
  items: [],
  ...overrides
})

describe('migrateVaultData', () => {
  it('returns current-version data unchanged', () => {
    const input = data({
      categories: [{ id: 'c1', name: 'Work', colorTag: null, order: 0 }],
      items: []
    })
    expect(migrateVaultData(input)).toEqual(input)
  })

  it('preserves user items rather than dropping them', () => {
    const input = data({
      items: [
        {
          id: 'i1',
          kind: 'note',
          title: 'Secret',
          categoryId: null,
          favorite: false,
          colorTag: null,
          createdAt: 1,
          updatedAt: 1,
          notes: 'remember',
          customFields: []
        }
      ]
    })
    expect(migrateVaultData(input).items).toHaveLength(1)
    expect(migrateVaultData(input).items[0]?.id).toBe('i1')
  })

  it('throws when the vault was written by a newer schema', () => {
    expect(() => migrateVaultData(data({ schemaVersion: FORMAT_VERSION + 1 }))).toThrow(
      /newer version/
    )
  })

  it('accepts an older schema version (forward-compatible read)', () => {
    // schemaVersion below the current one is allowed; future step-up migrations
    // will run here. For now it must not throw.
    const input = data({ schemaVersion: 0 })
    expect(() => migrateVaultData(input)).not.toThrow()
  })
})

describe('emptyVaultData', () => {
  it('produces a current-version vault with no categories or items', () => {
    const empty = emptyVaultData()
    expect(empty.schemaVersion).toBe(FORMAT_VERSION)
    expect(empty.categories).toEqual([])
    expect(empty.items).toEqual([])
  })

  it('round-trips through migrateVaultData unchanged', () => {
    expect(migrateVaultData(emptyVaultData())).toEqual(emptyVaultData())
  })
})
