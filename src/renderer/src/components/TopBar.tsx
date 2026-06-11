import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, KeyRound, Settings, Lock, Activity, Languages, ArrowLeftRight, Plane, Check } from 'lucide-react'
import { useAppStore } from '../store/app'
import { analyzeVault } from '../features/health/analyzeVault'
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../i18n'
import type { LoginItem } from '@shared/types'

/** Narrow top bar: search + app-level tools (CLAUDE.md §7). */
export default function TopBar(): JSX.Element {
  const { t } = useTranslation()
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)
  const setGeneratorOpen = useAppStore((s) => s.setGeneratorOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setHealthOpen = useAppStore((s) => s.setHealthOpen)
  const setImportExportOpen = useAppStore((s) => s.setImportExportOpen)
  const travelMode = useAppStore((s) => s.travelMode)
  const setTravelMode = useAppStore((s) => s.setTravelMode)
  const clearSecrets = useAppStore((s) => s.clearSecrets)
  const vault = useAppStore((s) => s.vault)
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const searchRef = useRef<HTMLInputElement>(null)
  const [langMenu, setLangMenu] = useState(false)
  const currentLang = settings?.language ?? 'en'

  // Switch language inline and persist immediately. Updating the settings store
  // triggers App's effect, which calls i18n.changeLanguage and sets the document
  // direction (RTL for ar/ur), so no extra wiring is needed here.
  const chooseLanguage = useCallback(
    async (lang: string) => {
      setLangMenu(false)
      if (!settings || settings.language === lang) return
      setSettings(await window.sas.settings.set({ ...settings, language: lang }))
    },
    [settings, setSettings]
  )

  const logins = useMemo<LoginItem[]>(
    () => (vault?.items ?? []).filter((i): i is LoginItem => i.kind === 'login'),
    [vault]
  )
  // Compute issue count without breach data — breaches stay opt-in in the dashboard.
  const healthIssueCount = useMemo(
    () => analyzeVault(logins, new Map()).issues.length,
    [logins]
  )

  const lock = useCallback(async () => {
    await window.sas.vault.lock()
    clearSecrets()
  }, [clearSecrets])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault()
        void lock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lock])

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
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur() } }}
          placeholder={t('topbar.search')}
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] py-1.5 pr-3 pl-8 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          className={iconBtn}
          onClick={() => setGeneratorOpen(true)}
          title={t('topbar.generator')}
          aria-label={t('topbar.generator')}
        >
          <KeyRound size={18} />
        </button>
        <button
          className={`relative ${iconBtn}`}
          onClick={() => setHealthOpen(true)}
          title={t('topbar.health')}
          aria-label={t('topbar.health')}
        >
          <Activity size={18} />
          {healthIssueCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-0.5 text-[10px] font-bold leading-none text-white">
              {healthIssueCount > 99 ? '99+' : healthIssueCount}
            </span>
          )}
        </button>
        <button
          className={iconBtn}
          onClick={() => setImportExportOpen(true)}
          title={t('topbar.importExport')}
          aria-label={t('topbar.importExport')}
        >
          <ArrowLeftRight size={18} />
        </button>
        <div className="relative">
          <button
            className={iconBtn}
            onClick={() => setLangMenu((v) => !v)}
            title={t('topbar.language')}
            aria-label={t('topbar.language')}
            aria-haspopup="menu"
            aria-expanded={langMenu}
          >
            <Languages size={18} />
          </button>
          {langMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangMenu(false)} />
              <div
                className="absolute end-0 z-20 mt-1 max-h-80 w-44 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] py-1"
                role="menu"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => void chooseLanguage(lang)}
                    role="menuitemradio"
                    aria-checked={lang === currentLang}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg)]"
                  >
                    {LANGUAGE_NAMES[lang]}
                    {lang === currentLang && <Check size={15} className="text-[var(--accent)]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          className={iconBtn}
          onClick={() => setSettingsOpen(true)}
          title={t('topbar.settings')}
          aria-label={t('topbar.settings')}
        >
          <Settings size={18} />
        </button>
        <button
          className={`${iconBtn} ${travelMode ? 'text-[var(--accent)]' : ''}`}
          onClick={() => setTravelMode(!travelMode)}
          title={t('topbar.travelMode')}
          aria-label={t('topbar.travelMode')}
          aria-pressed={travelMode}
        >
          <Plane size={18} />
        </button>
        <button
          onClick={() => { void lock() }}
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
