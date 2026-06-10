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
 * keeps a history of credentials. No-op for new items or unchanged passwords.
 */
export function applyPasswordHistory(previous: VaultItem | null, next: LoginItem): LoginItem {
  if (!previous || previous.kind !== 'login') return next
  if (previous.password === '' || previous.password === next.password) return next
  const entry = { password: previous.password, replacedAt: Date.now() }
  return {
    ...next,
    passwordHistory: [entry, ...next.passwordHistory].slice(0, MAX_PASSWORD_HISTORY)
  }
}

/** Stamp updatedAt and fold in password history before persisting. */
export function finalizeItem(previous: VaultItem | null, draft: VaultItem): VaultItem {
  const stamped = { ...draft, updatedAt: Date.now() }
  if (stamped.kind === 'login') return applyPasswordHistory(previous, stamped)
  return stamped
}
