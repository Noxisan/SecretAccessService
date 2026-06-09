import { useMemo } from 'react'
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

/** Main content: the filtered list of vault items. */
export default function ItemList(): JSX.Element {
  const { t } = useTranslation()
  const vault = useAppStore((s) => s.vault)
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId)
  const showFavoritesOnly = useAppStore((s) => s.showFavoritesOnly)
  const search = useAppStore((s) => s.search)

  const items = useMemo<VaultItem[]>(() => {
    const all = vault?.items ?? []
    const q = search.trim().toLowerCase()
    return all
      .filter((i) => (showFavoritesOnly ? i.favorite : true))
      .filter((i) => (selectedCategoryId ? i.categoryId === selectedCategoryId : true))
      .filter((i) => (q ? i.title.toLowerCase().includes(q) : true))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [vault, selectedCategoryId, showFavoritesOnly, search])

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">
          {showFavoritesOnly ? t('sidebar.favorites') : t('sidebar.allItems')}
          <span className="ml-2 text-[var(--text-muted)]">{items.length}</span>
        </h2>
        <button
          className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-sm text-[var(--accent-contrast)]"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={16} />
          {t('items.add')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-16 text-center text-sm text-[var(--text-muted)]">{t('items.empty')}</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind]
            return (
              <li key={item.id}>
                <button className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left hover:border-[var(--accent)]">
                  <span className="grid h-8 w-8 place-items-center rounded-[var(--radius)] bg-[var(--bg)] text-[var(--text-muted)]">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[var(--text)]">{item.title}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {t(`items.kind.${item.kind}`)}
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
