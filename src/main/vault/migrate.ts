import type { VaultData } from '../../shared/types.js'
import { FORMAT_VERSION } from './format.js'

/**
 * Migrate a decrypted payload from an older schema to the current one. Runs
 * after a successful decrypt, before the data is handed to the rest of the app.
 * Keep migrations pure and additive; never drop user data.
 */
export function migrateVaultData(data: VaultData): VaultData {
  const current = data
  // Future: while (current.schemaVersion < CURRENT_SCHEMA) { ...step up... }
  if (current.schemaVersion > FORMAT_VERSION) {
    throw new Error(
      `Vault was written by a newer version (schema ${current.schemaVersion}). Update S.A.S to open it.`
    )
  }
  return current
}

export function emptyVaultData(): VaultData {
  return {
    schemaVersion: FORMAT_VERSION,
    categories: [],
    items: []
  }
}
