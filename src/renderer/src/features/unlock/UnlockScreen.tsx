import { useState } from 'react'
import type { JSX, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Lock } from 'lucide-react'
import type { VaultStatus } from '@shared/types'

interface Props {
  status: VaultStatus
  onUnlocked: () => Promise<void> | void
}

/** Create-vault (status 'absent') and unlock (status 'locked') in one screen. */
export default function UnlockScreen({ status, onUnlocked }: Props): JSX.Element {
  const { t } = useTranslation()
  const creating = status === 'absent'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (creating && password !== confirm) {
      setError(t('unlock.mismatch'))
      return
    }
    setBusy(true)
    try {
      if (creating) await window.sas.vault.create(password)
      else await window.sas.vault.unlock(password)
      setPassword('')
      setConfirm('')
      await onUnlocked()
    } catch {
      setError(t('unlock.wrong'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full place-items-center bg-[var(--bg)] p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-[var(--radius)] text-[var(--accent-contrast)]"
            style={{ background: 'var(--accent)' }}
          >
            {creating ? <ShieldCheck size={22} /> : <Lock size={22} />}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">
              {creating ? t('unlock.createTitle') : t('unlock.unlockTitle')}
            </h1>
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
          className="mb-4 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
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
              className="mb-4 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
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
      </form>
    </div>
  )
}
