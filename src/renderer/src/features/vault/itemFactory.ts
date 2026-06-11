import type { CardItem, IdentityItem, LoginItem, PasskeyItem, TotpItem, VaultItem } from '@shared/types'

export type EditableKind = 'login' | 'note' | 'card' | 'identity' | 'totp' | 'passkey'

const MAX_PASSWORD_HISTORY = 50

export function createBlankItem(kind: EditableKind, categoryId: string | null): VaultItem {
  const now = Date.now()
  const base = {
    id: crypto.randomUUID(),
    title: '',
    categoryId,
    favorite: false,
    colorTag: null as string | null,
    createdAt: now,
    updatedAt: now,
    notes: '',
    customFields: []
  }
  switch (kind) {
    case 'note':
      return { ...base, kind: 'note' }
    case 'card':
      return {
        ...base,
        kind: 'card',
        cardholder: '',
        number: '',
        brand: '',
        expMonth: 1,
        expYear: new Date().getFullYear(),
        cvv: ''
      } satisfies CardItem
    case 'identity':
      return {
        ...base,
        kind: 'identity',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: ''
      } satisfies IdentityItem
    case 'totp':
      return {
        ...base,
        kind: 'totp',
        uri: '',
        issuer: '',
        account: ''
      } satisfies TotpItem
    case 'passkey':
      return {
        ...base,
        kind: 'passkey',
        rpId: '',
        rpName: '',
        userName: '',
        displayName: '',
        credentialId: ''
      } satisfies PasskeyItem
    default:
      return {
        ...base,
        kind: 'login',
        username: '',
        password: '',
        url: '',
        totp: null,
        passwordHistory: []
      } satisfies LoginItem
  }
}

/**
 * When a login's password changes on edit, archive the previous one so the user
 * keeps a history of credentials, then trim the history to `limit` entries.
 *
 * `limit` is the user's configured cap (0 keeps no history); it is clamped to
 * the hard ceiling of {@link MAX_PASSWORD_HISTORY}. Existing history beyond the
 * limit is pruned even when the password is unchanged, so lowering the setting
 * takes effect on the next save.
 */
export function applyPasswordHistory(
  previous: VaultItem | null,
  next: LoginItem,
  limit: number = MAX_PASSWORD_HISTORY
): LoginItem {
  const cap = Math.max(0, Math.min(Math.floor(limit), MAX_PASSWORD_HISTORY))
  const changed =
    previous?.kind === 'login' &&
    previous.password !== '' &&
    previous.password !== next.password
  const history = changed
    ? [{ password: previous.password, replacedAt: Date.now() }, ...next.passwordHistory]
    : next.passwordHistory
  return { ...next, passwordHistory: history.slice(0, cap) }
}

/** Stamp updatedAt and fold in password history before persisting. */
export function finalizeItem(
  previous: VaultItem | null,
  draft: VaultItem,
  limit: number = MAX_PASSWORD_HISTORY
): VaultItem {
  const stamped = { ...draft, updatedAt: Date.now() }
  if (stamped.kind === 'login') return applyPasswordHistory(previous, stamped, limit)
  return stamped
}
