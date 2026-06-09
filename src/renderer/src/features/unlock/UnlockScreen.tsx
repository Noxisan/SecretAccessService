import { useState } from 'react'
import type { JSX, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react'
import type { VaultStatus } from '@shared/types'

interface Props {
  status: VaultStatus
  onUnlocked: () => Promise<void> | void
}

type ResetFlow = null | 'confirm' | 'form'

/**
 * One screen covering three states:
 *  - status 'absent'      → first-run create flow
 *  - status 'locked'      → unlock flow, with an escape hatch to create a new
 *                           vault (forgotten password / corrupt or unwanted file)
 *  - reset 'confirm'/'form' → the destructive "erase & start over" path
 */
export default function UnlockScreen({ status, onUnlocked }: Props): JSX.Element {
  const { t } = useTranslation()
  const [resetFlow, setResetFlow] = useState<ResetFlow>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isReset = resetFlow === 'form'
  const creating = status === 'absent' || isReset

  function resetFields(): void {
    setPassword('')
    setConfirm('')
    setError(null)
  }

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (creating && password !== confirm) {
      setError(t('unlock.mismatch'))
      return
    }
    setBusy(true)
    try {
      if (isReset) await window.sas.vault.recreate(password)
      else if (creating) await window.sas.vault.create(password)
      else await window.sas.vault.unlock(password)
      resetFields()
      await onUnlocked()
    } catch {
      setError(t('unlock.wrong'))
    } finally {
      setBusy(false)
    }
  }

  const card =
    'w-full max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-8'
  const input =
    'mb-4 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]'

  // --- Destructive confirmation step ---
  if (resetFlow === 'confirm') {
    return (
      <div className="grid h-full place-items-center bg-[var(--bg)] p-6">
        <div className={card}>
          <div className="mb-4 flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-[var(--radius)] text-white"
              style={{ background: 'var(--danger)' }}
            >
              <AlertTriangle size={22} />
            </span>
            <h1 className="text-lg font-semibold text-[var(--text)]">
              {t('unlock.resetConfirmTitle')}
            </h1>
          </div>
          <p className="mb-6 text-sm text-[var(--text-muted)]">{t('unlock.resetWarning')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setResetFlow(null)}
              className="flex-1 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg)]"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => {
                resetFields()
                setResetFlow('form')
              }}
              className="flex-1 rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--danger)' }}
            >
              {t('unlock.resetContinue')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Create / unlock form ---
  const title = isReset
    ? t('unlock.resetTitle')
    : creating
      ? t('unlock.createTitle')
      : t('unlock.unlockTitle')

  return (
    <div className="grid h-full place-items-center bg-[var(--bg)] p-6">
      <form onSubmit={submit} className={card}>
        <div className="mb-6 flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-[var(--radius)] text-[var(--accent-contrast)]"
            style={{ background: 'var(--accent)' }}
          >
            {creating ? <ShieldCheck size={22} /> : <Lock size={22} />}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>
            <p className="text-xs text-[var(--text-muted)]">{t('app.tagline')}</p>
          </div>
        </div>

        {creating && (
          <p className="mb-4 text-sm text-[var(--text-muted)]">{t('unlock.createSubtitle')}</p>
        )}

        <label className="mb-1 block text-sm text-[var(--text-muted)]" htmlFor="mp">
          {t('unlock.masterPassword')}
        </label>
        <input
          id="mp"
          type="password"
          autoFocus
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />

        {creating && (
          <>
            <label className="mb-1 block text-sm text-[var(--text-muted)]" htmlFor="mp2">
              {t('unlock.confirmPassword')}
            </label>
            <input
              id="mp2"
              type="password"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={input}
            />
          </>
        )}

        {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="w-full rounded-[var(--radius)] px-3 py-2 font-medium text-[var(--accent-contrast)] disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {busy ? t('unlock.working') : creating ? t('unlock.create') : t('unlock.unlock')}
        </button>

        {/* Escape hatch: locked out, or no usable vault → start a fresh one. */}
        {status === 'locked' && !isReset && (
          <button
            type="button"
            onClick={() => setResetFlow('confirm')}
            className="mt-4 block w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            {t('unlock.resetCta')}
          </button>
        )}

        {/* From the create-new form, allow backing out to unlock. */}
        {isReset && (
          <button
            type="button"
            onClick={() => {
              resetFields()
              setResetFlow(null)
            }}
            className="mt-4 block w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {t('unlock.back')}
          </button>
        )}
      </form>
    </div>
  )
}
