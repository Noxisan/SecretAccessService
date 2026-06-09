import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, KeyRound, Settings, Lock, Activity, Languages } from 'lucide-react'
import { useAppStore } from '../store/app'

/** Narrow top bar: search + app-level tools (CLAUDE.md §7). */
export default function TopBar(): JSX.Element {
  const { t } = useTranslation()
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)
  const clearSecrets = useAppStore((s) => s.clearSecrets)

  async function lock(): Promise<void> {
    await window.sas.vault.lock()
    clearSecrets()
  }

  const iconBtn =
    'grid h-9 w-9 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'

  return (
    <header className="flex h-12 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3">
      <span className="mr-1 font-semibold tracking-tight text-[var(--text)]">{t('app.name')}</span>

      <div className="relative mx-2 max-w-md flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('topbar.search')}
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] py-1.5 pr-3 pl-8 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button className={iconBtn} title={t('topbar.generator')} aria-label={t('topbar.generator')}>
          <KeyRound size={18} />
        </button>
        <button className={iconBtn} title={t('topbar.health')} aria-label={t('topbar.health')}>
          <Activity size={18} />
        </button>
        <button className={iconBtn} title={t('topbar.language')} aria-label={t('topbar.language')}>
          <Languages size={18} />
        </button>
        <button className={iconBtn} title={t('topbar.settings')} aria-label={t('topbar.settings')}>
          <Settings size={18} />
        </button>
        <button
          onClick={() => void lock()}
          className="ml-1 flex h-9 items-center gap-1.5 rounded-[var(--radius)] px-3 text-sm text-[var(--accent-contrast)]"
          style={{ background: 'var(--accent)' }}
          title={t('topbar.lock')}
        >
          <Lock size={16} />
          {t('topbar.lock')}
        </button>
      </div>
    </header>
  )
}
