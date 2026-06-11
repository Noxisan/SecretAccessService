/**
 * Types shared across the process boundary. These describe DECRYPTED data as it
 * travels over IPC on demand — none of it is ever persisted in plaintext, and
 * the renderer only holds it transiently in memory while the vault is unlocked.
 */

export type VaultItemKind = 'login' | 'note' | 'card' | 'identity' | 'totp' | 'passkey'

export interface VaultItemBase {
  id: string
  kind: VaultItemKind
  title: string
  categoryId: string | null
  favorite: boolean
  /** small colored dot marker, hex string or null */
  colorTag: string | null
  createdAt: number
  updatedAt: number
  notes: string
  customFields: CustomField[]
}

export interface CustomField {
  id: string
  label: string
  value: string
  secret: boolean
}

export interface LoginItem extends VaultItemBase {
  kind: 'login'
  username: string
  password: string
  url: string
  /** optional embedded TOTP seed (otpauth URI) */
  totp: string | null
  /** previous passwords, newest first */
  passwordHistory: PasswordHistoryEntry[]
}

export interface PasswordHistoryEntry {
  password: string
  replacedAt: number
}

export interface SecureNoteItem extends VaultItemBase {
  kind: 'note'
}

export interface CardItem extends VaultItemBase {
  kind: 'card'
  cardholder: string
  number: string
  brand: string
  expMonth: number
  expYear: number
  cvv: string
}

export interface IdentityItem extends VaultItemBase {
  kind: 'identity'
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
}

export interface TotpItem extends VaultItemBase {
  kind: 'totp'
  /** otpauth:// URI */
  uri: string
  issuer: string
  account: string
}

export interface PasskeyItem extends VaultItemBase {
  kind: 'passkey'
  /** Relying Party domain, e.g. "example.com" */
  rpId: string
  /** Relying Party display name, e.g. "Example Inc." */
  rpName: string
  /** Username / email associated with the passkey credential */
  userName: string
  /** Display name shown during authentication prompts */
  displayName: string
  /** Credential ID in base64 (opaque reference; the private key stays in the OS/hardware) */
  credentialId: string
}

export type VaultItem =
  | LoginItem
  | SecureNoteItem
  | CardItem
  | IdentityItem
  | TotpItem
  | PasskeyItem

export interface Category {
  id: string
  name: string
  colorTag: string | null
  order: number
}

/** The full decrypted vault payload (the part that gets AEAD-sealed). */
export interface VaultData {
  schemaVersion: number
  categories: Category[]
  items: VaultItem[]
}

export type ThemeMode = 'light' | 'dark' | 'system'

/** Sort orders for the main item list. */
export type VaultItemSortKey = 'az' | 'za' | 'newest' | 'oldest' | 'kind'

/** App-level settings — stored OUTSIDE the vault (CLAUDE.md §6). */
export interface AppSettings {
  language: string
  theme: ThemeMode
  accent: string
  autoLockMinutes: number
  clipboardClearSeconds: number
  /** After this many consecutive wrong-password attempts, wipe the vault. 0 = disabled. */
  maxFailedAttempts: number
  /** Category IDs that are hidden while travel mode is active. */
  travelHiddenCategoryIds: string[]
  /** UI scale factor applied to the root font size (1 = 100%). Scales the whole
   * rem-based interface proportionally. */
  uiScale: number
  /** Persisted sort order for the main item list. */
  itemSort: VaultItemSortKey
  /** Clear a copied secret from the clipboard immediately when the vault locks. */
  clearClipboardOnLock: boolean
  /** Lock the vault when the application window is minimized. */
  lockOnMinimize: boolean
  /** Max previous passwords kept per login (0 disables history; hard ceiling 50). */
  passwordHistoryLimit: number
  /** Last-used password generator options — restored when the generator modal opens. */
  generatorDefaults?: GeneratePasswordOptions | undefined
}

export type VaultStatus = 'absent' | 'locked' | 'unlocked'

/** Password-generator request shape — shared contract across the IPC boundary. */
export interface GeneratePasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
  mode: 'characters' | 'passphrase'
  words?: number | undefined
  separator?: string | undefined
  /** Passphrase: capitalize the first letter of each word. */
  capitalize?: boolean | undefined
  /** Passphrase: append a random digit so the result contains a number. */
  wordNumber?: boolean | undefined
}
