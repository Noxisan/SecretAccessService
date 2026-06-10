import { useState, useEffect } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../../store/app'

type Field = 'current' | 'new' | 'confirm'

export default function ChangePasswordModal(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.changePasswordOpen)
  const setOpen = useAppStore((s) => s.setChangePasswordOpen)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [show, setShow] = useState<Record<Field, boolean>>({ current: false, new: false, confirm: false })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  // Reset state when modal opens/closes.
  useEffect(() => {
    if (!open) {
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setShow({ current: false, new: false, confirm: false })
      setError(null)
      setSuccess(false)
      setBusy(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const toggleShow = (f: Field): void =>
    setShow((prev) => ({ ...prev, [f]: !prev[f] }))

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (newPw !== confirmPw) {
      setError(t('changePw.mismatch'))
      return
    }
    if (newPw.length === 0) {
      setError(t('changePw.emptyNew'))
      return
    }
    setBusy(true)
    try {
      await window.sas.vault.changePassword(currentPw, newPw)
      setSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('wrong') || msg.includes('Could not unlock') || msg.includes('corrupted')) {
        setError(t('changePw.wrong'))
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const inputRow = 'flex flex-col gap-1.5'
  const inputLabel = 'text-sm font-medium text-[var(--text)]'
  const inputCls =
    'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">{t('changePw.title')}</h2>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <ShieldCheck size={40} className="text-[var(--accent)]" />
            <p className="text-sm text-[var(--text)]">{t('changePw.success')}</p>
            <button
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius)] px-5 py-1.5 text-sm text-[var(--accent-contrast)]"
              style={{ background: 'var(--accent)' }}
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <p className="text-xs text-[var(--text-muted)]">{t('changePw.hint')}</p>

            {/* Current password */}
            <div className={inputRow}>
              <label className={inputLabel}>{t('changePw.currentPassword')}</label>
              <div className="relative">
                <input
                  type={show.current ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className={inputCls}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => toggleShow('current')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  tabIndex={-1}
                >
                  {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className={inputRow}>
              <label className={inputLabel}>{t('changePw.newPassword')}</label>
              <div className="relative">
                <input
                  type={show.new ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={inputCls}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => toggleShow('new')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  tabIndex={-1}
                >
                  {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div className={inputRow}>
              <label className={inputLabel}>{t('changePw.confirmPassword')}</label>
              <div className="relative">
                <input
                  type={show.confirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={inputCls}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => toggleShow('confirm')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  tabIndex={-1}
                >
                  {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger)]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                disabled={busy}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-[var(--radius)] px-4 py-1.5 text-sm text-[var(--accent-contrast)] disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {busy ? t('changePw.changing') : t('changePw.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
