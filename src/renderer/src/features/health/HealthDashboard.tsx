import { useMemo } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ShieldAlert, ShieldCheck, Copy, RefreshCw, Clock } from 'lucide-react'
import { zxcvbn } from '@zxcvbn-ts/core'
import { useAppStore } from '../../store/app'
import type { LoginItem } from '@shared/types'

const REUSE_MIN_SCORE = 3          // zxcvbn 0-4; below this = weak
const OLD_DAYS = 180               // flag password unchanged for > 180 days

interface HealthIssue {
  item: LoginItem
  reasons: Array<'weak' | 'reused' | 'old'>
}

function analyzeVault(items: LoginItem[]): {
  issues: HealthIssue[]
  totalLogins: number
  safeCount: number
} {
  const now = Date.now()
  const passwordCounts = new Map<string, number>()
  for (const item of items) {
    if (item.password) {
      passwordCounts.set(item.password, (passwordCounts.get(item.password) ?? 0) + 1)
    }
  }

  const issues: HealthIssue[] = []
  for (const item of items) {
    const reasons: Array<'weak' | 'reused' | 'old'> = []
    if (item.password) {
      if (zxcvbn(item.password).score < REUSE_MIN_SCORE) reasons.push('weak')
      if ((passwordCounts.get(item.password) ?? 0) > 1) reasons.push('reused')
    }
    const ageDays = (now - item.updatedAt) / (1000 * 60 * 60 * 24)
    if (ageDays > OLD_DAYS) reasons.push('old')
    if (reasons.length > 0) issues.push({ item, reasons })
  }

  return {
    issues,
    totalLogins: items.length,
    safeCount: items.length - issues.length
  }
}

const REASON_ICON = {
  weak: ShieldAlert,
  reused: RefreshCw,
  old: Clock
}

export default function HealthDashboard(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.healthOpen)
  const setOpen = useAppStore((s) => s.setHealthOpen)
  const vault = useAppStore((s) => s.vault)
  const openEditor = useAppStore((s) => s.openItemEditor)
  const clipboardClearSeconds = useAppStore((s) => s.settings?.clipboardClearSeconds)

  const logins = useMemo<LoginItem[]>(
    () => (vault?.items ?? []).filter((i): i is LoginItem => i.kind === 'login'),
    [vault]
  )

  const { issues, totalLogins, safeCount } = useMemo(
    () => analyzeVault(logins),
    [logins]
  )

  if (!open) return null

  const allGood = issues.length === 0

  async function copyPassword(item: LoginItem, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    if (!item.password) return
    await window.sas.tools.copyToClipboard(item.password, clipboardClearSeconds)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)]"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('health.title')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="font-semibold text-[var(--text)]">{t('health.title')}</h2>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-6 border-b border-[var(--border)] px-5 py-3">
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
          {allGood && (
            <div className="ml-auto flex items-center gap-1.5 text-sm text-[var(--success)]">
              <ShieldCheck size={18} />
              {t('health.allGood')}
            </div>
          )}
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-auto">
          {allGood ? (
            <div className="flex flex-col items-center gap-3 py-12 text-[var(--text-muted)]">
              <ShieldCheck size={40} className="text-[var(--success)]" />
              <p className="text-sm">{t('health.allGoodDetail')}</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {issues.map(({ item, reasons }) => (
                <li key={item.id}>
                  <button
                    onClick={() => { openEditor(item); setOpen(false) }}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[var(--bg)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{item.title}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {item.username || item.url}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {reasons.map((r) => {
                          const Icon = REASON_ICON[r]
                          return (
                            <span
                              key={r}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                              style={{
                                background:
                                  r === 'weak' || r === 'reused'
                                    ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                                    : 'color-mix(in srgb, var(--warning) 15%, transparent)',
                                color:
                                  r === 'weak' || r === 'reused'
                                    ? 'var(--danger)'
                                    : 'var(--warning)'
                              }}
                            >
                              <Icon size={11} />
                              {t(`health.reason.${r}`)}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => void copyPassword(item, e)}
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:text-[var(--accent)]"
                      aria-label={t('items.copyPassword')}
                      title={t('items.copyPassword')}
                    >
                      <Copy size={14} />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
