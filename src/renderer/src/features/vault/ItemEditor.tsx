import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Trash2, Star, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react'
import type { LoginItem, SecureNoteItem, VaultItem, VaultItemBase } from '@shared/types'
import { useAppStore } from '../../store/app'
import { createBlankItem, finalizeItem, type EditableKind } from './itemFactory'

type Draft = LoginItem | SecureNoteItem

const COLOR_PRESETS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']

export default function ItemEditor(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.editorOpen)
  const editorItem = useAppStore((s) => s.editorItem)
  const createKind = useAppStore((s) => s.editorCreateKind)
  const close = useAppStore((s) => s.closeItemEditor)
  const setVault = useAppStore((s) => s.setVault)
  const vault = useAppStore((s) => s.vault)
  const clipboardClearSeconds = useAppStore((s) => s.settings?.clipboardClearSeconds)

  const categories = useMemo(
    () => [...(vault?.categories ?? [])].sort((a, b) => a.order - b.order),
    [vault]
  )
  const editableKind: EditableKind = createKind === 'note' ? 'note' : 'login'

  const [draft, setDraft] = useState<Draft>(() =>
    isEditable(editorItem) ? editorItem : createBlankItem(editableKind, null)
  )
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  // Reload the draft whenever a different item (or a fresh create) opens.
  useEffect(() => {
    if (!open) return
    setDraft(isEditable(editorItem) ? editorItem : createBlankItem(editableKind, null))
    setShowPassword(false)
    setConfirmDelete(false)
    setCopied(false)
  }, [open, editorItem, editableKind])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null

  const isEdit = editorItem !== null
  const patchBase = (p: Partial<VaultItemBase>): void =>
    setDraft((prev) => ({ ...prev, ...p }) as Draft)
  const patchLogin = (p: Partial<Omit<LoginItem, keyof VaultItemBase | 'kind'>>): void =>
    setDraft((prev) => (prev.kind === 'login' ? { ...prev, ...p } : prev))

  async function save(): Promise<void> {
    if (draft.title.trim().length === 0) return
    setBusy(true)
    try {
      const item = finalizeItem(editorItem, draft as VaultItem)
      setVault(await window.sas.vault.upsertItem(item))
      close()
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    if (!editorItem) return
    setBusy(true)
    try {
      setVault(await window.sas.vault.deleteItem(editorItem.id))
      close()
    } finally {
      setBusy(false)
    }
  }

  async function generate(): Promise<void> {
    const pw = await window.sas.tools.generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: false,
      mode: 'characters'
    })
    patchLogin({ password: pw })
    setShowPassword(true)
  }

  async function copyPassword(): Promise<void> {
    if (draft.kind !== 'login' || !draft.password) return
    await window.sas.tools.copyToClipboard(draft.password, clipboardClearSeconds)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const label = 'mb-1 block text-xs font-medium text-[var(--text-muted)]'
  const field =
    'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]'
  const iconBtn =
    'grid w-9 shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)]'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={() => close()}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)]"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t(`items.kind.${draft.kind}`)}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--text)]">
              {isEdit ? t('items.edit') : t('items.add')}
            </h2>
            <span className="rounded-[var(--radius)] bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              {t(`items.kind.${draft.kind}`)}
            </span>
          </div>
          <button
            onClick={() => close()}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-auto p-5">
          <div>
            <label className={label} htmlFor="it-title">
              {t('items.field.title')}
            </label>
            <input
              id="it-title"
              autoFocus
              value={draft.title}
              onChange={(e) => patchBase({ title: e.target.value })}
              className={field}
            />
          </div>

          {draft.kind === 'login' && (
            <>
              <div>
                <label className={label} htmlFor="it-user">
                  {t('items.field.username')}
                </label>
                <input
                  id="it-user"
                  value={draft.username}
                  autoComplete="off"
                  onChange={(e) => patchLogin({ username: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="it-pass">
                  {t('items.field.password')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="it-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={draft.password}
                    autoComplete="off"
                    onChange={(e) => patchLogin({ password: e.target.value })}
                    className={`${field} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={iconBtn}
                    aria-label={showPassword ? t('items.hide') : t('items.show')}
                    title={showPassword ? t('items.hide') : t('items.show')}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className={iconBtn}
                    aria-label={t('generator.generate')}
                    title={t('generator.generate')}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyPassword()}
                    disabled={!draft.password}
                    className={`${iconBtn} disabled:opacity-40`}
                    aria-label={copied ? t('generator.copied') : t('generator.copy')}
                    title={copied ? t('generator.copied') : t('generator.copy')}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={label} htmlFor="it-url">
                  {t('items.field.url')}
                </label>
                <input
                  id="it-url"
                  value={draft.url}
                  autoComplete="off"
                  onChange={(e) => patchLogin({ url: e.target.value })}
                  className={field}
                />
              </div>
            </>
          )}

          <div>
            <label className={label} htmlFor="it-notes">
              {t('items.field.notes')}
            </label>
            <textarea
              id="it-notes"
              rows={draft.kind === 'note' ? 6 : 3}
              value={draft.notes}
              onChange={(e) => patchBase({ notes: e.target.value })}
              className={`${field} resize-y`}
            />
          </div>

          {/* Category + color + favorite */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-40 flex-1">
              <label className={label} htmlFor="it-cat">
                {t('sidebar.categories')}
              </label>
              <select
                id="it-cat"
                value={draft.categoryId ?? ''}
                onChange={(e) => patchBase({ categoryId: e.target.value || null })}
                className={field}
              >
                <option value="">{t('sidebar.uncategorized')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>{t('items.field.color')}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => patchBase({ colorTag: null })}
                  className={`h-6 w-6 rounded-full border border-[var(--border)] text-[10px] text-[var(--text-muted)] ${
                    draft.colorTag === null ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                  aria-label={t('items.noColor')}
                >
                  —
                </button>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchBase({ colorTag: c })}
                    className={`h-6 w-6 rounded-full ${
                      draft.colorTag === c ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => patchBase({ favorite: !draft.favorite })}
              className={`flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm ${
                draft.favorite ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <Star size={15} fill={draft.favorite ? 'currentColor' : 'none'} />
              {t('sidebar.favorites')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--text-muted)]">{t('items.confirmDelete')}</span>
                <button
                  onClick={() => void remove()}
                  className="rounded-[var(--radius)] px-2 py-1 text-white"
                  style={{ background: 'var(--danger)' }}
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm text-[var(--danger)] hover:opacity-80"
              >
                <Trash2 size={15} />
                {t('common.delete')}
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => close()}
              className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg)]"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void save()}
              disabled={busy || draft.title.trim().length === 0}
              className="rounded-[var(--radius)] px-4 py-1.5 text-sm font-medium text-[var(--accent-contrast)] disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function isEditable(item: VaultItem | null): item is Draft {
  return item !== null && (item.kind === 'login' || item.kind === 'note')
}
