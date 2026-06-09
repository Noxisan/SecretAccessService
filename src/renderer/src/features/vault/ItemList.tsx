import { useMemo, useState } from 'react'
import type { JSX, ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Plus, KeyRound, StickyNote, CreditCard, IdCard, Timer } from 'lucide-react'
import { useAppStore } from '../../store/app'
import type { VaultItem, VaultItemKind } from '@shared/types'

const KIND_ICON: Record<VaultItemKind, ComponentType<{ size?: number }>> = {
  login: KeyRound,
  note: StickyNote,
  card: CreditCard,
  identity: IdCard,
  totp: Timer
}

/** Main content: the filtered list of vault items + the add menu. */
export default function ItemList(): JSX.Element {
  const { t } = useTranslation()
  const vault = useAppStore((s) => s.vault)
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId)
  const showFavoritesOnly = useAppStore((s) => s.showFavoritesOnly)
  const search = useAppStore((s) => s.search)
  const openEditor = useAppStore((s) => s.openItemEditor)
  const [addMenu, setAddMenu] = useState(false)

  const items = useMemo<VaultItem[]>(() => {
    const all = vault?.items ?? []
    const q = search.trim().toLowerCase()
    return all
      .filter((i) => (showFavoritesOnly ? i.favorite : true))
      .filter((i) => (selectedCategoryId ? i.categoryId === selectedCategoryId : true))
      .filter((i) => (q ? matches(i, q) : true))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [vault, selectedCategoryId, showFavoritesOnly, search])

  function add(kind: VaultItemKind): void {
    setAddMenu(false)
    openEditor(null, kind)
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">
          {showFavoritesOnly ? t('sidebar.favorites') : t('sidebar.allItems')}
          <span className="ml-2 text-[var(--text-muted)]">{items.length}</span>
        </h2>
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
                {(['login', 'note'] as const).map((kind) => {
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

      {items.length === 0 ? (
        <div className="mt-16 text-center text-sm text-[var(--text-muted)]">{t('items.empty')}</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind]
            return (
              <li key={item.id}>
                <button
                  onClick={() => openEditor(item)}
                  className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left hover:border-[var(--accent)]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[var(--radius)] bg-[var(--bg)] text-[var(--text-muted)]">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[var(--text)]">{item.title}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {subtitle(item) || t(`items.kind.${item.kind}`)}
                    </span>
                  </span>
                  {item.colorTag && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: item.colorTag }}
                    />
                  )}
                  {item.favorite && <Star size={15} className="text-[var(--warning)]" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Search across the user-visible, non-secret fields of an item. */
function matches(item: VaultItem, q: string): boolean {
  if (item.title.toLowerCase().includes(q)) return true
  if (item.kind === 'login') {
    return item.username.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
  }
  return false
}

/** A muted second line: username/url for logins, nothing secret. */
function subtitle(item: VaultItem): string {
  if (item.kind === 'login') return item.username || item.url
  return ''
}
