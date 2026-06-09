import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Copy, Check, X } from 'lucide-react'
import type { GeneratePasswordOptions } from '@shared/types'
import { useAppStore } from '../../store/app'
import { estimateStrength, type StrengthLevel } from './entropy'

const DEFAULTS: GeneratePasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  mode: 'characters',
  words: 5,
  separator: '-'
}

const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  veryWeak: 'var(--danger)',
  weak: 'var(--danger)',
  fair: 'var(--warning)',
  strong: 'var(--success)',
  veryStrong: 'var(--accent)'
}

export default function GeneratorModal(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.generatorOpen)
  const setOpen = useAppStore((s) => s.setGeneratorOpen)
  const clipboardClearSeconds = useAppStore((s) => s.settings?.clipboardClearSeconds)

  const [opts, setOpts] = useState<GeneratePasswordOptions>(DEFAULTS)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const noClass =
    opts.mode === 'characters' &&
    !opts.lowercase &&
    !opts.uppercase &&
    !opts.digits &&
    !opts.symbols

  const generate = useCallback(async () => {
    setError(null)
    setCopied(false)
    try {
      setValue(await window.sas.tools.generatePassword(opts))
    } catch {
      setValue('')
      setError(t('generator.noClass'))
    }
  }, [opts, t])

  // Regenerate whenever the dialog opens or the options change.
  useEffect(() => {
    if (!open) return
    if (noClass) {
      setValue('')
      setError(t('generator.noClass'))
      return
    }
    void generate()
  }, [open, generate, noClass, t])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const strength = estimateStrength(opts)

  async function copy(): Promise<void> {
    if (!value) return
    await window.sas.tools.copyToClipboard(value, clipboardClearSeconds)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function patch(p: Partial<GeneratePasswordOptions>): void {
    setOpts((prev) => ({ ...prev, ...p }))
  }

  const checkbox = (
    key: 'uppercase' | 'lowercase' | 'digits' | 'symbols' | 'excludeAmbiguous',
    label: string
  ): JSX.Element => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
      <input
        type="checkbox"
        checked={opts[key]}
        onChange={(e) => patch({ [key]: e.target.checked })}
        className="accent-[var(--accent)]"
      />
      {label}
    </label>
  )

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('generator.title')}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">{t('generator.title')}</h2>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Result */}
        <div className="mb-1 flex items-stretch gap-2">
          <output className="min-h-10 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm break-all text-[var(--text)]">
            {value || '—'}
          </output>
          <button
            onClick={() => void generate()}
            disabled={noClass}
            className="grid w-10 place-items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-40"
            title={t('generator.regenerate')}
            aria-label={t('generator.regenerate')}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => void copy()}
            disabled={!value}
            className="grid w-10 place-items-center rounded-[var(--radius)] text-[var(--accent-contrast)] disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
            title={copied ? t('generator.copied') : t('generator.copy')}
            aria-label={copied ? t('generator.copied') : t('generator.copy')}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        {/* Strength */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((seg) => (
              <span
                key={seg}
                className="flex-1 rounded-full"
                style={{
                  background:
                    seg <= strength.score ? STRENGTH_COLOR[strength.level] : 'var(--border)'
                }}
              />
            ))}
          </div>
          <span className="w-24 text-right text-xs text-[var(--text-muted)]">
            {t(`generator.level.${strength.level}`)}
          </span>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-[var(--radius)] border border-[var(--border)] p-0.5">
          {(['characters', 'passphrase'] as const).map((m) => (
            <button
              key={m}
              onClick={() => patch({ mode: m })}
              className={`flex-1 rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm ${
                opts.mode === m
                  ? 'text-[var(--accent-contrast)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              style={opts.mode === m ? { background: 'var(--accent)' } : undefined}
            >
              {t(`generator.${m}`)}
            </button>
          ))}
        </div>

        {opts.mode === 'characters' ? (
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm text-[var(--text)]">
              <span>
                {t('generator.length')}: <span className="font-mono">{opts.length}</span>
              </span>
              <input
                type="range"
                min={4}
                max={64}
                value={opts.length}
                onChange={(e) => patch({ length: Number(e.target.value) })}
                className="ml-3 w-1/2 accent-[var(--accent)]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {checkbox('lowercase', t('generator.lowercase'))}
              {checkbox('uppercase', t('generator.uppercase'))}
              {checkbox('digits', t('generator.digits'))}
              {checkbox('symbols', t('generator.symbols'))}
            </div>
            {checkbox('excludeAmbiguous', t('generator.excludeAmbiguous'))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm text-[var(--text)]">
              <span>
                {t('generator.words')}: <span className="font-mono">{opts.words ?? 5}</span>
              </span>
              <input
                type="range"
                min={3}
                max={12}
                value={opts.words ?? 5}
                onChange={(e) => patch({ words: Number(e.target.value) })}
                className="ml-3 w-1/2 accent-[var(--accent)]"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-[var(--text)]">
              <span>{t('generator.separator')}</span>
              <input
                type="text"
                maxLength={4}
                value={opts.separator ?? '-'}
                onChange={(e) => patch({ separator: e.target.value })}
                className="w-20 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-center font-mono text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </div>
  )
}
