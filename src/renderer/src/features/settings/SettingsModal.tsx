import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { X, KeyRound } from 'lucide-react'
import { useAppStore } from '../../store/app'
import SlidePanel from '../../components/SlidePanel'
import type { AppSettings, ThemeMode } from '@shared/types'
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../i18n'

const ACCENT_PRESETS = [
  '#7c3aed', // electric violet (default)
  '#6d28d9', // deeper violet
  '#2563eb', // blue
  '#0891b2', // cyan
  '#059669', // green
  '#dc2626', // red
  '#d97706', // amber
  '#db2777', // pink
]

export default function SettingsModal(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.settingsOpen)
  const setOpen = useAppStore((s) => s.setSettingsOpen)
  const setChangePasswordOpen = useAppStore((s) => s.setChangePasswordOpen)
  const currentSettings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const [draft, setDraft] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [quickUnlockSaved, setQuickUnlockSaved] = useState(false)

  useEffect(() => {
    if (open && currentSettings) {
      setDraft({ ...currentSettings })
      void window.sas.vault.quickUnlockStatus().then(({ available }) => setQuickUnlockSaved(available))
    }
  }, [open, currentSettings])

  // draft is populated on open and kept afterwards, so gating on it (not `open`)
  // lets the panel animate its slide-out via the `open` prop.
  if (!draft) return null

  const patch = (p: Partial<AppSettings>): void =>
    setDraft((prev) => (prev ? { ...prev, ...p } : prev))

  async function handleSave(): Promise<void> {
    if (!draft) return
    setBusy(true)
    try {
      const updated = await window.sas.settings.set(draft)
      setSettings(updated)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const fieldRow = 'flex flex-col gap-1.5'
  const fieldLabel = 'text-sm font-medium text-[var(--text)]'
  const themeBtn = (mode: ThemeMode): string =>
    `flex-1 rounded-[var(--radius)] border py-1.5 text-sm transition-colors cursor-pointer ${
      draft.theme === mode
        ? 'border-[var(--accent)] text-[var(--accent)]'
        : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
    }`

  return (
    <SlidePanel open={open} onClose={() => setOpen(false)} ariaLabel={t('settings.title')} width="max-w-md">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t('settings.title')}</h2>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Theme */}
          <div className={fieldRow}>
            <span className={fieldLabel}>{t('settings.theme')}</span>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  className={themeBtn(mode)}
                  onClick={() => patch({ theme: mode })}
                >
                  {t(`settings.${mode}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div className={fieldRow}>
            <span className={fieldLabel}>{t('settings.accent')}</span>
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: color,
                    outline: draft.accent === color ? `2px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                  onClick={() => patch({ accent: color })}
                  aria-label={color}
                />
              ))}
              {/* Custom color input as an overlaid swatch */}
              <label className="relative h-6 w-6 cursor-pointer" title={t('settings.accent')}>
                <span
                  className="block h-6 w-6 rounded-full border border-dashed border-[var(--border)] transition-transform hover:scale-110"
                  style={{
                    background: ACCENT_PRESETS.includes(draft.accent) ? 'transparent' : draft.accent,
                  }}
                />
                <input
                  type="color"
                  value={draft.accent}
                  onChange={(e) => patch({ accent: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          {/* Language */}
          <div className={fieldRow}>
            <span className={fieldLabel}>{t('settings.language')}</span>
            <select
              value={draft.language}
              onChange={(e) => patch({ language: e.target.value })}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_NAMES[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-lock */}
          <div className={fieldRow}>
            <span className={fieldLabel}>{t('settings.autoLock')}</span>
            <input
              type="number"
              min={0}
              max={9999}
              value={draft.autoLockMinutes}
              onChange={(e) =>
                patch({ autoLockMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              className="w-32 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Clipboard clear */}
          <div className={fieldRow}>
            <span className={fieldLabel}>{t('settings.clipboardClear')}</span>
            <input
              type="number"
              min={0}
              max={9999}
              value={draft.clipboardClearSeconds}
              onChange={(e) =>
                patch({ clipboardClearSeconds: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              className="w-32 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Max failed unlock attempts (self-destruct) */}
          <div className={fieldRow}>
            <span className={fieldLabel}>{t('settings.maxFailedAttempts')}</span>
            <p className="text-xs text-[var(--text-muted)]">{t('settings.maxFailedAttemptsHint')}</p>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.maxFailedAttempts}
              onChange={(e) =>
                patch({ maxFailedAttempts: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              className="w-32 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Security: device unlock + change master password */}
        <div className="mt-2 space-y-3 border-t border-[var(--border)] pt-4">
          {quickUnlockSaved ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[var(--text-muted)]">{t('settings.deviceUnlockSaved')}</p>
              <button
                onClick={() => {
                  void window.sas.vault.clearQuickUnlock().then(() => setQuickUnlockSaved(false))
                }}
                className="shrink-0 text-xs text-[var(--danger)] hover:underline"
              >
                {t('settings.deviceUnlockClear')}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">{t('settings.deviceUnlockNone')}</p>
          )}
          <button
            onClick={() => { setOpen(false); setChangePasswordOpen(true) }}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            <KeyRound size={14} />
            {t('settings.changePassword')}
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={busy}
            className="rounded-[var(--radius)] px-4 py-1.5 text-sm text-[var(--accent-contrast)] disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </SlidePanel>
  )
}
