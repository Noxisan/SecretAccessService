/**
 * The single source of truth for the main↔renderer contract. Channel names live
 * here so the preload allow-list, the main handlers, and the renderer client all
 * agree. NO secrets or keys cross this boundary except decrypted item payloads
 * requested on demand while unlocked.
 */
export const IPC = {
  vaultStatus: 'vault:status',
  vaultExists: 'vault:exists',
  vaultCreate: 'vault:create',
  vaultRecreate: 'vault:recreate',
  vaultUnlock: 'vault:unlock',
  vaultLock: 'vault:lock',
  vaultRead: 'vault:read',
  itemUpsert: 'vault:item:upsert',
  itemDelete: 'vault:item:delete',
  categoryUpsert: 'vault:category:upsert',
  categoryDelete: 'vault:category:delete',
  generatePassword: 'tools:generatePassword',
  clipboardCopy: 'tools:clipboardCopy',
  checkBreached: 'tools:checkBreached',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  // main → renderer (pushed)
  evtLocked: 'evt:locked'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
