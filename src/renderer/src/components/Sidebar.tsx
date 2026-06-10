import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, LayoutGrid, Plus, Folder, Check, X, Pencil, Trash2, ChevronLeft, ChevronRight, Plane } from 'lucide-react'
import { useAppStore } from '../store/app'
import type { Category } from '@shared/types'

const COLOR_PRESETS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (c: string | null) => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      {/* No-color swatch */}
      <button
        className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 ${
          value === null ? 'border-[var(--accent)]' : 'border-[var(--border)]'
        }`}
        style={{ background: 'transparent' }}
        onClick={() => onChange(null)}
        aria-label="No color"
      />
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          className="h-4 w-4 rounded-full transition-transform hover:scale-110"
          style={{
            background: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: '2px',
          }}
          onClick={() => onChange(c)}
          aria-label={c}
        />
      ))}
    </div>
  )
}

export default function Sidebar(): JSX.Element {
  const { t } = useTranslation()
  const vault = useAppStore((s) => s.vault)
  const setVault = useAppStore((s) => s.setVault)
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId)
  const showFavoritesOnly = useAppStore((s) => s.showFavoritesOnly)
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const setShowFavoritesOnly = useAppStore((s) => s.setShowFavoritesOnly)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const travelMode = useAppStore((s) => s.travelMode)
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)

  const travelHiddenIds = new Set(settings?.travelHiddenCategoryIds ?? [])

  const [addingName, setAddingName] = useState('')
  const [addingColor, setAddingColor] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const categories = [...(vault?.categories ?? [])]
    .sort((a, b) => a.order - b.order)
    .filter((c) => !travelMode || !travelHiddenIds.has(c.id))

  useEffect(() => {
    if (isAdding) addInputRef.current?.focus()
  }, [isAdding])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  function startAdding(): void {
    setIsAdding(true)
    setAddingName('')
    setAddingColor(null)
    setEditingId(null)
    setConfirmDeleteId(null)
  }

  async function commitAdd(): Promise<void> {
    const name = addingName.trim()
    if (!name) {
      setIsAdding(false)
      return
    }
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.order), -1)
    const newCat: Category = {
      id: crypto.randomUUID(),
      name,
      colorTag: addingColor,
      order: maxOrder + 1,
    }
    const data = await window.sas.vault.upsertCategory(newCat)
    setVault(data)
    setIsAdding(false)
    setAddingName('')
    setAddingColor(null)
  }

  function startEdit(cat: Category): void {
    setEditingId(cat.id)
    setEditName(cat.name)
    setIsAdding(false)
    setConfirmDeleteId(null)
  }

  async function commitEdit(cat: Category): Promise<void> {
    const name = editName.trim()
    if (!name) {
      setEditingId(null)
      return
    }
    const data = await window.sas.vault.upsertCategory({ ...cat, name })
    setVault(data)
    setEditingId(null)
  }

  async function deleteCategory(id: string): Promise<void> {
    const data = await window.sas.vault.deleteCategory(id)
    setVault(data)
    setConfirmDeleteId(null)
    if (selectedCategoryId === id) setSelectedCategory(null)
  }

  async function toggleTravelHidden(id: string): Promise<void> {
    if (!settings) return
    const current = new Set(settings.travelHiddenCategoryIds)
    if (current.has(id)) current.delete(id)
    else current.add(id)
    const updated = await window.sas.settings.set({
      ...settings,
      travelHiddenCategoryIds: [...current],
    })
    setSettings(updated)
  }

  const row = (active: boolean): string =>
    `flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-1.5 text-sm ${
      active
        ? 'bg-[var(--bg-elevated)] text-[var(--text)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'
    }`

  const allActive = !selectedCategoryId && !showFavoritesOnly

  const iconBtn = 'grid h-9 w-9 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]'

  if (collapsed) {
    return (
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--bg-sidebar)] py-2">
        <button
          className={iconBtn}
          onClick={() => setCollapsed(false)}
          title={t('sidebar.expand')}
          aria-label={t('sidebar.expand')}
        >
          <ChevronRight size={16} />
        </button>
        <button
          className={`${iconBtn} ${allActive ? 'text-[var(--text)]' : ''}`}
          onClick={() => setSelectedCategory(null)}
          title={t('sidebar.allItems')}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`${iconBtn} ${showFavoritesOnly ? 'text-[var(--text)]' : ''}`}
          onClick={() => setShowFavoritesOnly(true)}
          title={t('sidebar.favorites')}
        >
          <Star size={16} />
        </button>
        <div className="my-1 w-6 border-t border-[var(--border)]" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${iconBtn} ${selectedCategoryId === cat.id ? 'text-[var(--text)]' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
            title={cat.name}
          >
            {cat.colorTag ? (
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.colorTag }} />
            ) : (
              <Folder size={16} />
            )}
          </button>
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-sidebar)] p-2">
      {/* Collapse toggle at top-right */}
      <div className="mb-0.5 flex justify-end">
        <button
          className="grid h-7 w-7 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
          onClick={() => setCollapsed(true)}
          title={t('sidebar.collapse')}
          aria-label={t('sidebar.collapse')}
        >
          <ChevronLeft size={15} />
        </button>
      </div>

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
          onClick={startAdding}
        >
          <Plus size={15} />
        </button>
      </div>

      {categories.map((cat) => {
        if (editingId === cat.id) {
          return (
            <div key={cat.id} className="flex items-center gap-1 rounded-[var(--radius)] px-2 py-1">
              <input
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitEdit(cat)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--bg)] px-2 py-0.5 text-sm text-[var(--text)] outline-none"
              />
              <button
                className="grid h-6 w-6 place-items-center rounded-[var(--radius)] text-[var(--success)] hover:bg-[var(--bg-elevated)]"
                onClick={() => void commitEdit(cat)}
              >
                <Check size={14} />
              </button>
              <button
                className="grid h-6 w-6 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                onClick={() => setEditingId(null)}
              >
                <X size={14} />
              </button>
            </div>
          )
        }

        if (confirmDeleteId === cat.id) {
          return (
            <div
              key={cat.id}
              className="flex items-center gap-1 rounded-[var(--radius)] px-2.5 py-1 text-xs"
            >
              <span className="flex-1 truncate text-[var(--text-muted)]">
                {t('sidebar.deleteCategoryConfirm')}
              </span>
              <button
                className="rounded-[var(--radius)] px-1.5 py-0.5 text-xs text-[var(--danger)] hover:bg-[var(--bg-elevated)]"
                onClick={() => void deleteCategory(cat.id)}
              >
                {t('common.delete')}
              </button>
              <button
                className="rounded-[var(--radius)] px-1.5 py-0.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                onClick={() => setConfirmDeleteId(null)}
              >
                {t('common.cancel')}
              </button>
            </div>
          )
        }

        return (
          <div key={cat.id} className="group flex items-center">
            <button
              className={`${row(selectedCategoryId === cat.id)} min-w-0 flex-1`}
              onClick={() => {
                setSelectedCategory(cat.id)
                setConfirmDeleteId(null)
              }}
            >
              {cat.colorTag ? (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: cat.colorTag }}
                />
              ) : (
                <Folder size={16} className="shrink-0" />
              )}
              <span className="truncate">{cat.name}</span>
            </button>
            <div className="mr-1 hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                className={`grid h-6 w-6 place-items-center rounded-[var(--radius)] hover:bg-[var(--bg-elevated)] ${
                  travelHiddenIds.has(cat.id)
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
                title={t('sidebar.travelHide')}
                onClick={(e) => {
                  e.stopPropagation()
                  void toggleTravelHidden(cat.id)
                }}
              >
                <Plane size={12} />
              </button>
              <button
                className="grid h-6 w-6 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
                title={t('sidebar.renameCategory')}
                onClick={(e) => {
                  e.stopPropagation()
                  startEdit(cat)
                }}
              >
                <Pencil size={12} />
              </button>
              <button
                className="grid h-6 w-6 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--danger)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDeleteId(cat.id)
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )
      })}

      {/* Inline add-category form */}
      {isAdding && (
        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--bg-elevated)] p-2">
          <input
            ref={addInputRef}
            value={addingName}
            onChange={(e) => setAddingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commitAdd()
              if (e.key === 'Escape') setIsAdding(false)
            }}
            placeholder={t('sidebar.newCategoryPlaceholder')}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <ColorPicker value={addingColor} onChange={setAddingColor} />
          <div className="flex justify-end gap-1">
            <button
              className="grid h-6 w-6 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
              onClick={() => setIsAdding(false)}
            >
              <X size={14} />
            </button>
            <button
              className="grid h-6 w-6 place-items-center rounded-[var(--radius)] text-[var(--success)] hover:bg-[var(--bg)]"
              onClick={() => void commitAdd()}
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
