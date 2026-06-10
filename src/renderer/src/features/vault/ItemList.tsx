import { useMemo, useState } from 'react'
import type { JSX, ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Plus, KeyRound, StickyNote, CreditCard, IdCard, Timer, Fingerprint, Copy, Check } from 'lucide-react'
import { useAppStore } from '../../store/app'
import type { VaultItem, VaultItemKind } from '@shared/types'
import TotpCode from './TotpCode'

type SortKey = 'az' | 'za' | 'newest' | 'oldest' | 'kind'

const KIND_ICON: Record<VaultItemKind, ComponentType<{ size?: number }>> = {
  login: KeyRound,
  note: StickyNote,
  card: CreditCard,
  identity: IdCard,
  totp: Timer,
  passkey: Fingerprint
}

/** Main content: the filtered list of vault items + the add menu. */
export default function ItemList(): JSX.Element {
  const { t } = useTranslation()
  const vault = useAppStore((s) => s.vault)
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId)
  const showFavoritesOnly = useAppStore((s) => s.showFavoritesOnly)
  const search = useAppStore((s) => s.search)
  const openEditor = useAppStore((s) => s.openItemEditor)
  const clipboardClearSeconds = useAppStore((s) => s.settings?.clipboardClearSeconds)
  const travelMode = useAppStore((s) => s.travelMode)
  const travelHiddenIds = useAppStore((s) =>
    travelMode ? new Set(s.settings?.travelHiddenCategoryIds ?? []) : new Set<string>()
  )
  const [addMenu, setAddMenu] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('az')

  const items = useMemo<VaultItem[]>(() => {
    const all = vault?.items ?? []
    const q = search.trim().toLowerCase()
    const filtered = all
      .filter((i) => (showFavoritesOnly ? i.favorite : true))
      .filter((i) => (selectedCategoryId ? i.categoryId === selectedCategoryId : true))
      // Travel mode: hide items from categories marked as travel-hidden.
      .filter((i) => !i.categoryId || !travelHiddenIds.has(i.categoryId))
      .filter((i) => (q ? matches(i, q) : true))

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'za': return b.title.localeCompare(a.title)
        case 'newest': return b.updatedAt - a.updatedAt
        case 'oldest': return a.createdAt - b.createdAt
        case 'kind': return a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title)
        default: return a.title.localeCompare(b.title)
      }
    })
  }, [vault, selectedCategoryId, showFavoritesOnly, search, travelHiddenIds, sortBy])

  function add(kind: VaultItemKind): void {
    setAddMenu(false)
    openEditor(null, kind)
  }

  async function quickCopy(e: React.MouseEvent, item: VaultItem): Promise<void> {
    e.stopPropagation()
    const text = quickCopyText(item)
    if (!text) return
    await window.sas.tools.copyToClipboard(text, clipboardClearSeconds)
    setCopiedId(item.id)
    window.setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 1500)
  }

  async function quickCopyText_string(text: string, itemId: string): Promise<void> {
    await window.sas.tools.copyToClipboard(text, clipboardClearSeconds)
    setCopiedId(itemId)
    window.setTimeout(() => setCopiedId((prev) => (prev === itemId ? null : prev)), 1500)
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-medium text-[var(--text-muted)]">
          {showFavoritesOnly ? t('sidebar.favorites') : t('sidebar.allItems')}
          <span className="ml-2 text-[var(--text-muted)]">{items.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text-muted)] outline-none focus:border-[var(--accent)] hover:text-[var(--text)]"
            aria-label={t('items.sortBy')}
            title={t('items.sortBy')}
          >
            <option value="az">{t('items.sort.az')}</option>
            <option value="za">{t('items.sort.za')}</option>
            <option value="newest">{t('items.sort.newest')}</option>
            <option value="oldest">{t('items.sort.oldest')}</option>
            <option value="kind">{t('items.sort.kind')}</option>
          </select>
        <div className="relative">
          <button
            onClick={() => setAddMenu((v) => !v)}
            className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-sm text-[var(--accent-contrast)]"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={16} />
            {t('items.add')}
          </button>
          {addMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddMenu(false)} />
              <div className="absolute end-0 z-20 mt-1 w-44 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] py-1">
                {(['login', 'note', 'card', 'identity', 'totp', 'passkey'] as const).map((kind) => {
                  const Icon = KIND_ICON[kind]
                  return (
                    <button
                      key={kind}
                      onClick={() => add(kind)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg)]"
                    >
                      <Icon size={16} />
                      {t(`items.kind.${kind}`)}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-16 text-center text-sm text-[var(--text-muted)]">{t('items.empty')}</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind]
            const copyable = quickCopyText(item) !== null
            const isCopied = copiedId === item.id
            return (
              <li key={item.id}>
                <div className="group flex w-full items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 hover:border-[var(--accent)]">
                  {/* Main row — click to edit */}
                  <button
                    onClick={() => openEditor(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius)] bg-[var(--bg)] text-[var(--text-muted)]">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[var(--text)]">{item.title}</span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {subtitle(item) || t(`items.kind.${item.kind}`)}
                      </span>
                    </span>
                  </button>

                  {/* Right-side: TOTP live code, indicators, quick-copy */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.kind === 'totp' && item.uri && (
                      <TotpCode
                        uri={item.uri}
                        onCopy={(code) => void quickCopyText_string(code, item.id)}
                      />
                    )}
                    {item.colorTag && (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: item.colorTag }}
                      />
                    )}
                    {item.favorite && <Star size={15} className="text-[var(--warning)]" />}
                    {copyable && (
                      <button
                        onClick={(e) => void quickCopy(e, item)}
                        className="grid h-7 w-7 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--accent)] group-hover:opacity-100"
                        aria-label={quickCopyLabel(item, t)}
                        title={quickCopyLabel(item, t)}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Returns the text to copy for quick-copy, or null if not applicable. */
function quickCopyText(item: VaultItem): string | null {
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

function quickCopyLabel(item: VaultItem, t: (k: string) => string): string {
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

/** Search across user-visible, non-secret fields of an item. */
function matches(item: VaultItem, q: string): boolean {
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
function subtitle(item: VaultItem): string {
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
