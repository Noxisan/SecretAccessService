import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from './store/app'
import { RTL_LANGUAGES } from './i18n'
import UnlockScreen from './features/unlock/UnlockScreen'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ItemList from './features/vault/ItemList'
import ItemEditor from './features/vault/ItemEditor'
import GeneratorModal from './features/generator/GeneratorModal'
import SettingsModal from './features/settings/SettingsModal'
import HealthDashboard from './features/health/HealthDashboard'

export default function App(): JSX.Element {
  const { i18n } = useTranslation()
  const status = useAppStore((s) => s.status)
  const setStatus = useAppStore((s) => s.setStatus)
  const setVault = useAppStore((s) => s.setVault)
  const setSettings = useAppStore((s) => s.setSettings)
  const clearSecrets = useAppStore((s) => s.clearSecrets)
  const settings = useAppStore((s) => s.settings)
  const [ready, setReady] = useState(false)

  // One-time init: load settings + vault status, subscribe to lock events.
  useEffect(() => {
    let unsub = (): void => {}
    void (async () => {
      const s = await window.sas.settings.get()
      setSettings(s)
      setStatus(await window.sas.vault.status())
      unsub = window.sas.onLocked(() => clearSecrets())
      setReady(true)
    })()
    return () => unsub()
  }, [setSettings, setStatus, clearSecrets])

  // Reapply theme/language/direction whenever settings change (initial load +
  // every time the user saves from the Settings modal).
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
    root.setAttribute('data-theme', dark ? 'dark' : 'light')
    root.style.setProperty('--accent', settings.accent)
    root.setAttribute('dir', RTL_LANGUAGES.has(settings.language) ? 'rtl' : 'ltr')
    root.setAttribute('lang', settings.language)
    void i18n.changeLanguage(settings.language)
  }, [settings, i18n])

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
      <ItemEditor />
      <GeneratorModal />
      <SettingsModal />
      <HealthDashboard />
    </div>
  )
}
