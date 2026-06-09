import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from './store/app'
import { RTL_LANGUAGES } from './i18n'
import type { AppSettings } from '@shared/types'
import UnlockScreen from './features/unlock/UnlockScreen'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ItemList from './features/vault/ItemList'

/** Apply theme tokens, accent, language, and text direction from settings. */
function applyPresentation(settings: AppSettings, setLang: (l: string) => void): void {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  root.style.setProperty('--accent', settings.accent)
  root.setAttribute('dir', RTL_LANGUAGES.has(settings.language) ? 'rtl' : 'ltr')
  root.setAttribute('lang', settings.language)
  void setLang(settings.language)
}

export default function App(): JSX.Element {
  const { i18n } = useTranslation()
  const status = useAppStore((s) => s.status)
  const setStatus = useAppStore((s) => s.setStatus)
  const setVault = useAppStore((s) => s.setVault)
  const setSettings = useAppStore((s) => s.setSettings)
  const clearSecrets = useAppStore((s) => s.clearSecrets)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsub = (): void => {}
    void (async () => {
      const settings = await window.sas.settings.get()
      setSettings(settings)
      applyPresentation(settings, (l) => void i18n.changeLanguage(l))
      setStatus(await window.sas.vault.status())
      unsub = window.sas.onLocked(() => clearSecrets())
      setReady(true)
    })()
    return () => unsub()
  }, [i18n, setSettings, setStatus, clearSecrets])

  async function handleUnlocked(): Promise<void> {
    const data = await window.sas.vault.read()
    setVault(data)
    setStatus('unlocked')
  }

  if (!ready) return <div className="grid h-full place-items-center text-[var(--text-muted)]" />

  if (status !== 'unlocked') {
    return <UnlockScreen status={status} onUnlocked={handleUnlocked} />
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg)]">
          <ItemList />
        </main>
      </div>
    </div>
  )
}
