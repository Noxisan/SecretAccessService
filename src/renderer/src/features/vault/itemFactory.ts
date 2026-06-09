import type { LoginItem, SecureNoteItem, VaultItem } from '@shared/types'

/** Newly-created items are editor-only kinds for now: login + secure note. */
export type EditableKind = 'login' | 'note'

const MAX_PASSWORD_HISTORY = 50

export function createBlankItem(
  kind: EditableKind,
  categoryId: string | null
): LoginItem | SecureNoteItem {
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
  if (kind === 'note') {
    return { ...base, kind: 'note' }
  }
  return {
    ...base,
    kind: 'login',
    username: '',
    password: '',
    url: '',
    totp: null,
    passwordHistory: []
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
