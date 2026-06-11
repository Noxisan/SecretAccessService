import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, ShieldCheck, Copy, RefreshCw, Clock, Wifi, Loader } from 'lucide-react'
import { useAppStore } from '../../store/app'
import SlidePanel from '../../components/SlidePanel'
import type { LoginItem } from '@shared/types'
import { analyzeVault, type BreachMap } from './analyzeVault'

type BreachState = 'idle' | 'checking' | 'done' | 'error'

const REASON_ICON = {
  weak: ShieldAlert,
  reused: RefreshCw,
  old: Clock,
  breached: Wifi
}

const REASON_DANGER = new Set(['weak', 'reused', 'breached'])

export default function HealthDashboard(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.healthOpen)
  const setOpen = useAppStore((s) => s.setHealthOpen)
  const vault = useAppStore((s) => s.vault)
  const openEditor = useAppStore((s) => s.openItemEditor)
  const clipboardClearSeconds = useAppStore((s) => s.settings?.clipboardClearSeconds)

  const [breachState, setBreachState] = useState<BreachState>('idle')
  const [breaches, setBreaches] = useState<BreachMap>(new Map())

  const logins = useMemo<LoginItem[]>(
    () => (vault?.items ?? []).filter((i): i is LoginItem => i.kind === 'login'),
    [vault]
  )

  const { issues, totalLogins, safeCount } = useMemo(
    () => analyzeVault(logins, breaches),
    [logins, breaches]
  )

  const allGood = issues.length === 0

  async function copyPassword(item: LoginItem, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    if (!item.password) return
    await window.sas.tools.copyToClipboard(item.password, clipboardClearSeconds)
  }

  async function runBreachCheck(): Promise<void> {
    setBreachState('checking')
    const next = new Map<string, number>()
    try {
      for (const item of logins) {
        if (!item.password) { next.set(item.id, 0); continue }
        const count = await window.sas.tools.checkBreached(item.password)
        next.set(item.id, count)
      }
      setBreaches(next)
      setBreachState('done')
    } catch {
      setBreachState('error')
    }
  }

  return (
    <SlidePanel open={open} onClose={() => setOpen(false)} title={t('health.title')} width="max-w-xl" bodyClassName="">
        {/* Summary strip */}
        <div className="flex flex-wrap items-center gap-6 border-b border-[var(--border)] px-5 py-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--text)]">{totalLogins}</div>
            <div className="text-xs text-[var(--text-muted)]">{t('health.totalLogins')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--success)]">{safeCount}</div>
            <div className="text-xs text-[var(--text-muted)]">{t('health.safe')}</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: issues.length > 0 ? 'var(--danger)' : 'var(--success)' }}
            >
              {issues.length}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{t('health.issues')}</div>
          </div>
          <div className="ml-auto">
            {breachState === 'checking' ? (
              <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <Loader size={14} className="animate-spin" />
                {t('health.checking')}
              </div>
            ) : (
              <button
                onClick={() => void runBreachCheck()}
                disabled={logins.length === 0}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
              >
                <Wifi size={14} />
                {t('health.checkBreaches')}
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {breachState === 'error' && (
          <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-5 py-2 text-xs text-[var(--danger)]">
            {t('health.breachError')}
          </div>
        )}

        {/* Issue list */}
        <div className="flex-1 overflow-auto">
          {allGood && breachState !== 'checking' ? (
            <div className="flex flex-col items-center gap-3 py-12 text-[var(--text-muted)]">
              <ShieldCheck size={40} className="text-[var(--success)]" />
              <p className="text-sm">{t('health.allGoodDetail')}</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {issues.map(({ item, reasons }) => {
                const breachCount = breaches.get(item.id)
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--bg)]"
                  >
                    <button
                      onClick={() => { openEditor(item); setOpen(false) }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-[var(--text)]">{item.title}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {item.username || item.url}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {reasons.map((r) => {
                          const Icon = REASON_ICON[r]
                          const isDanger = REASON_DANGER.has(r)
                          return (
                            <span
                              key={r}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                              style={{
                                background: isDanger
                                  ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                                  : 'color-mix(in srgb, var(--warning) 15%, transparent)',
                                color: isDanger ? 'var(--danger)' : 'var(--warning)'
                              }}
                            >
                              <Icon size={11} />
                              {r === 'breached' && breachCount
                                ? t('health.breachCount', { count: breachCount })
                                : t(`health.reason.${r}`)}
                            </span>
                          )
                        })}
                      </div>
                    </button>
                    <button
                      onClick={(e) => void copyPassword(item, e)}
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:text-[var(--accent)]"
                      aria-label={t('items.copyPassword')}
                      title={t('items.copyPassword')}
                    >
                      <Copy size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
    </SlidePanel>
  )
}
