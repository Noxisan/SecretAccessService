import type { VaultItem } from '@shared/types'

/**
 * Pure presentation/search helpers for vault items.
 *
 * These intentionally live apart from the `ItemList` component so they can be
 * unit-tested in isolation — in particular the security property that search
 * never reads secret fields (passwords, card numbers/CVV, TOTP secrets).
 */

/** Returns the text to copy for quick-copy, or null if not applicable. */
export function quickCopyText(item: VaultItem): string | null {
  switch (item.kind) {
    case 'login':
      return item.password || null
    case 'card':
      return item.number || null
    case 'identity':
      return item.email || null
    default:
      return null
  }
}

/** The accessible label for an item's quick-copy action. */
export function quickCopyLabel(item: VaultItem, t: (k: string) => string): string {
  switch (item.kind) {
    case 'login':
      return t('items.copyPassword')
    case 'card':
      return t('items.copyCardNumber')
    case 'identity':
      return t('items.copyEmail')
    default:
      return t('generator.copy')
  }
}

/**
 * Search across user-visible, non-secret fields of an item.
 *
 * `q` is expected to be already lower-cased and trimmed by the caller. Secret
 * material (login password, card number/CVV, TOTP/passkey secrets) is never
 * matched, so a query equal to a secret will not reveal which entry holds it.
 */
export function matches(item: VaultItem, q: string): boolean {
  if (item.title.toLowerCase().includes(q)) return true
  switch (item.kind) {
    case 'login':
      return item.username.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    case 'note':
      return item.notes.toLowerCase().includes(q)
    case 'card':
      return item.cardholder.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q)
    case 'identity':
      return (
        item.firstName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
      )
    case 'totp':
      return item.issuer.toLowerCase().includes(q) || item.account.toLowerCase().includes(q)
    case 'passkey':
      return item.rpId.toLowerCase().includes(q) || item.userName.toLowerCase().includes(q)
  }
}

/** A muted second line — non-secret preview text. */
export function subtitle(item: VaultItem): string {
  switch (item.kind) {
    case 'login':
      return item.username || item.url
    case 'card':
      return item.cardholder
    case 'identity':
      return [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email
    case 'totp':
      return item.issuer || item.account
    case 'passkey':
      return item.rpId || item.userName
    default:
      return ''
  }
}
