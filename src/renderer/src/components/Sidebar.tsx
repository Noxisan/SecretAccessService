import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, LayoutGrid, Plus, Folder } from 'lucide-react'
import { useAppStore } from '../store/app'

/** Left sidebar: All items, Favorites, and user categories with color dots. */
export default function Sidebar(): JSX.Element {
  const { t } = useTranslation()
  const vault = useAppStore((s) => s.vault)
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId)
  const showFavoritesOnly = useAppStore((s) => s.showFavoritesOnly)
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const setShowFavoritesOnly = useAppStore((s) => s.setShowFavoritesOnly)

  const categories = [...(vault?.categories ?? [])].sort((a, b) => a.order - b.order)

  const row = (active: boolean): string =>
    `flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-1.5 text-sm ${
      active
        ? 'bg-[var(--bg-elevated)] text-[var(--text)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
    }`

  const allActive = !selectedCategoryId && !showFavoritesOnly

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-sidebar)] p-2">
      <button className={row(allActive)} onClick={() => setSelectedCategory(null)}>
        <LayoutGrid size={16} />
        {t('sidebar.allItems')}
      </button>
      <button className={row(showFavoritesOnly)} onClick={() => setShowFavoritesOnly(true)}>
        <Star size={16} />
        {t('sidebar.favorites')}
      </button>

      <div className="mt-4 mb-1 flex items-center justify-between px-2.5">
        <span className="text-xs font-medium tracking-wide text-[var(--text-muted)] uppercase">
          {t('sidebar.categories')}
        </span>
        <button
          className="text-[var(--text-muted)] hover:text-[var(--accent)]"
          title={t('sidebar.addCategory')}
          aria-label={t('sidebar.addCategory')}
        >
          <Plus size={15} />
        </button>
      </div>

      {categories.map((c) => (
        <button
          key={c.id}
          className={row(selectedCategoryId === c.id)}
          onClick={() => setSelectedCategory(c.id)}
        >
          {c.colorTag ? (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: c.colorTag }}
            />
          ) : (
            <Folder size={16} />
          )}
          <span className="truncate">{c.name}</span>
        </button>
      ))}
    </nav>
  )
}
