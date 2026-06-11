import { useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Trash2, Star, Eye, EyeOff, RefreshCw, Copy, Check, History, RotateCcw, ChevronDown, ChevronUp, Plus, Lock, Unlock, ShieldCheck, ExternalLink } from 'lucide-react'
import type {
  CardItem,
  GeneratePasswordOptions,
  IdentityItem,
  LoginItem,
  PasskeyItem,
  SecureNoteItem,
  TotpItem,
  VaultItem,
  VaultItemBase
} from '@shared/types'
import { useAppStore } from '../../store/app'
import { createBlankItem, finalizeItem } from './itemFactory'
import PasswordStrengthBar from '../../components/PasswordStrengthBar'
import SlidePanel from '../../components/SlidePanel'
import TotpCode from './TotpCode'

type Draft = LoginItem | SecureNoteItem | CardItem | IdentityItem | TotpItem | PasskeyItem

const COLOR_PRESETS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i)

export default function ItemEditor(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.editorOpen)
  const editorItem = useAppStore((s) => s.editorItem)
  const createKind = useAppStore((s) => s.editorCreateKind)
  const close = useAppStore((s) => s.closeItemEditor)
  const setVault = useAppStore((s) => s.setVault)
  const vault = useAppStore((s) => s.vault)
  const clipboardClearSeconds = useAppStore((s) => s.settings?.clipboardClearSeconds)
  const generatorDefaults = useAppStore((s) => s.settings?.generatorDefaults)
  const passwordHistoryLimit = useAppStore((s) => s.settings?.passwordHistoryLimit)

  const categories = useMemo(
    () => [...(vault?.categories ?? [])].sort((a, b) => a.order - b.order),
    [vault]
  )

  const [draft, setDraft] = useState<Draft>(() =>
    editorItem ?? createBlankItem(createKind, null)
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showCvv, setShowCvv] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [revealedHistIdx, setRevealedHistIdx] = useState<number | null>(null)
  const [revealedCfIds, setRevealedCfIds] = useState<Set<string>>(new Set())
  const saveRef = useRef<() => void>(() => {})

  // Ctrl/Cmd+S or Ctrl/Cmd+Enter saves the item (save() itself ignores an empty
  // title or an in-flight save). Escape is handled by SlidePanel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    setDraft(editorItem ?? createBlankItem(createKind, null))
    setShowPassword(false)
    setShowCvv(false)
    setConfirmDelete(false)
    setCopied(false)
    setShowHistory(false)
    setRevealedHistIdx(null)
    setRevealedCfIds(new Set())
  }, [open, editorItem, createKind])

  const isEdit = editorItem !== null
  const patchBase = (p: Partial<VaultItemBase>): void =>
    setDraft((prev) => ({ ...prev, ...p }) as Draft)
  const patchLogin = (p: Partial<Omit<LoginItem, keyof VaultItemBase | 'kind'>>): void =>
    setDraft((prev) => (prev.kind === 'login' ? { ...prev, ...p } : prev))
  const patchCard = (p: Partial<Omit<CardItem, keyof VaultItemBase | 'kind'>>): void =>
    setDraft((prev) => (prev.kind === 'card' ? { ...prev, ...p } : prev))
  const patchIdentity = (p: Partial<Omit<IdentityItem, keyof VaultItemBase | 'kind'>>): void =>
    setDraft((prev) => (prev.kind === 'identity' ? { ...prev, ...p } : prev))
  const patchTotp = (p: Partial<Omit<TotpItem, keyof VaultItemBase | 'kind'>>): void =>
    setDraft((prev) => (prev.kind === 'totp' ? { ...prev, ...p } : prev))
  const patchPasskey = (p: Partial<Omit<PasskeyItem, keyof VaultItemBase | 'kind'>>): void =>
    setDraft((prev) => (prev.kind === 'passkey' ? { ...prev, ...p } : prev))

  async function save(): Promise<void> {
    if (busy || draft.title.trim().length === 0) return
    setBusy(true)
    try {
      const item = finalizeItem(editorItem, draft as VaultItem, passwordHistoryLimit ?? 50)
      setVault(await window.sas.vault.upsertItem(item))
      close()
    } finally {
      setBusy(false)
    }
  }
  // Keep a stable ref to the latest save() for the keyboard-shortcut effect.
  saveRef.current = save

  async function remove(): Promise<void> {
    if (!editorItem) return
    setBusy(true)
    try {
      setVault(await window.sas.vault.deleteItem(editorItem.id))
      close()
    } finally {
      setBusy(false)
    }
  }

  async function duplicate(): Promise<void> {
    if (!editorItem) return
    setBusy(true)
    try {
      const now = Date.now()
      const clone: VaultItem = {
        ...editorItem,
        id: crypto.randomUUID(),
        title: t('items.copyOf', { title: editorItem.title }),
        createdAt: now,
        updatedAt: now
      }
      setVault(await window.sas.vault.upsertItem(clone))
      close()
    } finally {
      setBusy(false)
    }
  }

  function restorePassword(password: string): void {
    patchLogin({ password })
    setShowPassword(true)
    setShowHistory(false)
  }

  async function generate(): Promise<void> {
    // Use the user's saved generator preferences (set in the generator panel,
    // persisted since v0.17.0) so the inline button stays consistent with them.
    const opts: GeneratePasswordOptions = generatorDefaults ?? {
      length: 20,
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: false,
      mode: 'characters'
    }
    const pw = await window.sas.tools.generatePassword(opts)
    patchLogin({ password: pw })
    setShowPassword(true)
  }

  async function copyToClipboard(text: string): Promise<void> {
    await window.sas.tools.copyToClipboard(text, clipboardClearSeconds)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const lbl = 'mb-1 block text-xs font-medium text-[var(--text-muted)]'
  const fld =
    'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]'
  const iconBtn =
    'grid w-9 shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)]'

  return (
    <SlidePanel open={open} onClose={close} ariaLabel={t(`items.kind.${draft.kind}`)} width="max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[var(--text)]">
              {isEdit ? t('items.edit') : t('items.add')}
            </h2>
            <span className="rounded-[var(--radius)] bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              {t(`items.kind.${draft.kind}`)}
            </span>
          </div>
          <button
            onClick={() => close()}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-5">
          {/* Title — shared by all kinds */}
          <div>
            <label className={lbl} htmlFor="it-title">
              {t('items.field.title')}
            </label>
            <input
              id="it-title"
              autoFocus
              value={draft.title}
              onChange={(e) => patchBase({ title: e.target.value })}
              className={fld}
            />
          </div>

          {/* ── Login ──────────────────────────────────────────────────── */}
          {draft.kind === 'login' && (
            <>
              <div>
                <label className={lbl} htmlFor="it-user">
                  {t('items.field.username')}
                </label>
                <input
                  id="it-user"
                  value={draft.username}
                  autoComplete="off"
                  onChange={(e) => patchLogin({ username: e.target.value })}
                  className={fld}
                />
              </div>
              <div>
                <label className={lbl} htmlFor="it-pass">
                  {t('items.field.password')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="it-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={draft.password}
                    autoComplete="off"
                    onChange={(e) => patchLogin({ password: e.target.value })}
                    className={`${fld} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={iconBtn}
                    aria-label={showPassword ? t('items.hide') : t('items.show')}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className={iconBtn}
                    aria-label={t('generator.generate')}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(draft.password)}
                    disabled={!draft.password}
                    className={`${iconBtn} disabled:opacity-40`}
                    aria-label={copied ? t('generator.copied') : t('generator.copy')}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <PasswordStrengthBar password={draft.password} />
              </div>
              <div>
                <label className={lbl} htmlFor="it-url">
                  {t('items.field.url')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="it-url"
                    value={draft.url}
                    autoComplete="off"
                    onChange={(e) => patchLogin({ url: e.target.value })}
                    className={`${fld} flex-1`}
                  />
                  {/^https?:\/\//.test(draft.url) && (
                    <button
                      type="button"
                      onClick={() => void window.sas.tools.openExternal(draft.url)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      title={t('items.openUrl')}
                      aria-label={t('items.openUrl')}
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Embedded 2FA / TOTP — shown when draft.totp is set, otherwise an "Add" affordance */}
              {draft.totp !== null ? (
                <div className="rounded-[var(--radius)] border border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                      <ShieldCheck size={13} />
                      {t('items.totpSection')}
                    </span>
                    <button
                      type="button"
                      onClick={() => patchLogin({ totp: null })}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                      aria-label={t('items.removeTotp')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    value={draft.totp}
                    onChange={(e) => patchLogin({ totp: e.target.value })}
                    placeholder="otpauth://… or secret key"
                    autoComplete="off"
                    className={`${fld} font-mono text-xs`}
                  />
                  {draft.totp && (
                    <div className="mt-2 flex items-center gap-2">
                      <TotpCode
                        uri={draft.totp}
                        onCopy={(code) => void copyToClipboard(code)}
                      />
                      <span className="text-xs text-[var(--text-muted)]">{t('items.totpLiveCode')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => patchLogin({ totp: '' })}
                  className="flex items-center gap-1.5 self-start text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
                >
                  <ShieldCheck size={13} />
                  {t('items.addTotp')}
                </button>
              )}

              {/* Password history — only shown when editing and history exists */}
              {isEdit && draft.passwordHistory.length > 0 && (
                <div className="rounded-[var(--radius)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => { setShowHistory((v) => !v); setRevealedHistIdx(null) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    <History size={13} />
                    <span>{t('items.passwordHistory', { count: draft.passwordHistory.length })}</span>
                    <span className="ml-auto">
                      {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </button>
                  {showHistory && (
                    <ul className="flex flex-col divide-y divide-[var(--border)] border-t border-[var(--border)]">
                      {draft.passwordHistory.map((entry, idx) => (
                        <li key={idx} className="flex items-center gap-2 px-3 py-1.5">
                          <span className="w-28 shrink-0 text-[11px] text-[var(--text-muted)]">
                            {new Date(entry.replacedAt).toLocaleDateString()}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--text)]">
                            {revealedHistIdx === idx ? entry.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRevealedHistIdx(revealedHistIdx === idx ? null : idx)}
                            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text)]"
                            aria-label={revealedHistIdx === idx ? t('items.hide') : t('items.show')}
                          >
                            {revealedHistIdx === idx ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => restorePassword(entry.password)}
                            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)]"
                            title={t('items.restorePassword')}
                            aria-label={t('items.restorePassword')}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Credit card ────────────────────────────────────────────── */}
          {draft.kind === 'card' && (
            <>
              <div>
                <label className={lbl} htmlFor="it-cardholder">
                  {t('items.field.cardholder')}
                </label>
                <input
                  id="it-cardholder"
                  value={draft.cardholder}
                  autoComplete="off"
                  onChange={(e) => patchCard({ cardholder: e.target.value })}
                  className={fld}
                />
              </div>
              <div>
                <label className={lbl} htmlFor="it-cardnum">
                  {t('items.field.cardNumber')}
                </label>
                <input
                  id="it-cardnum"
                  value={draft.number}
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={24}
                  onChange={(e) => patchCard({ number: e.target.value.replace(/\D/g, '') })}
                  className={`${fld} font-mono tracking-wider`}
                  placeholder="•••• •••• •••• ••••"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-brand">
                    {t('items.field.brand')}
                  </label>
                  <input
                    id="it-brand"
                    value={draft.brand}
                    autoComplete="off"
                    onChange={(e) => patchCard({ brand: e.target.value })}
                    className={fld}
                    placeholder="Visa, Mastercard…"
                  />
                </div>
                <div>
                  <label className={lbl} htmlFor="it-cvv">
                    {t('items.field.cvv')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="it-cvv"
                      type={showCvv ? 'text' : 'password'}
                      value={draft.cvv}
                      autoComplete="off"
                      maxLength={8}
                      onChange={(e) => patchCard({ cvv: e.target.value })}
                      className={`${fld} w-24 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv((v) => !v)}
                      className={iconBtn}
                      aria-label={showCvv ? t('items.hide') : t('items.show')}
                    >
                      {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className={lbl}>{t('items.field.expiry')}</label>
                <div className="flex gap-2">
                  <select
                    value={draft.expMonth}
                    onChange={(e) => patchCard({ expMonth: Number(e.target.value) })}
                    className={`${fld} w-28`}
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.expYear}
                    onChange={(e) => patchCard({ expYear: Number(e.target.value) })}
                    className={fld}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Identity ───────────────────────────────────────────────── */}
          {draft.kind === 'identity' && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-first">
                    {t('items.field.firstName')}
                  </label>
                  <input
                    id="it-first"
                    value={draft.firstName}
                    autoComplete="off"
                    onChange={(e) => patchIdentity({ firstName: e.target.value })}
                    className={fld}
                  />
                </div>
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-last">
                    {t('items.field.lastName')}
                  </label>
                  <input
                    id="it-last"
                    value={draft.lastName}
                    autoComplete="off"
                    onChange={(e) => patchIdentity({ lastName: e.target.value })}
                    className={fld}
                  />
                </div>
              </div>
              <div>
                <label className={lbl} htmlFor="it-email">
                  {t('items.field.email')}
                </label>
                <input
                  id="it-email"
                  type="email"
                  value={draft.email}
                  autoComplete="off"
                  onChange={(e) => patchIdentity({ email: e.target.value })}
                  className={fld}
                />
              </div>
              <div>
                <label className={lbl} htmlFor="it-phone">
                  {t('items.field.phone')}
                </label>
                <input
                  id="it-phone"
                  type="tel"
                  value={draft.phone}
                  autoComplete="off"
                  onChange={(e) => patchIdentity({ phone: e.target.value })}
                  className={fld}
                />
              </div>
              <div>
                <label className={lbl} htmlFor="it-address">
                  {t('items.field.address')}
                </label>
                <textarea
                  id="it-address"
                  rows={3}
                  value={draft.address}
                  onChange={(e) => patchIdentity({ address: e.target.value })}
                  className={`${fld} resize-y`}
                />
              </div>
            </>
          )}

          {/* ── TOTP authenticator ─────────────────────────────────────── */}
          {draft.kind === 'totp' && (
            <>
              <div>
                <label className={lbl} htmlFor="it-totp-uri">
                  {t('items.field.totpUri')}
                </label>
                <input
                  id="it-totp-uri"
                  value={draft.uri}
                  autoComplete="off"
                  onChange={(e) => patchTotp({ uri: e.target.value })}
                  className={`${fld} font-mono text-xs`}
                  placeholder="otpauth://… or secret key"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-totp-issuer">
                    {t('items.field.issuer')}
                  </label>
                  <input
                    id="it-totp-issuer"
                    value={draft.issuer}
                    autoComplete="off"
                    onChange={(e) => patchTotp({ issuer: e.target.value })}
                    className={fld}
                  />
                </div>
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-totp-account">
                    {t('items.field.account')}
                  </label>
                  <input
                    id="it-totp-account"
                    value={draft.account}
                    autoComplete="off"
                    onChange={(e) => patchTotp({ account: e.target.value })}
                    className={fld}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Passkey ────────────────────────────────────────────────── */}
          {draft.kind === 'passkey' && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-pk-rpid">
                    {t('items.field.rpId')}
                  </label>
                  <input
                    id="it-pk-rpid"
                    value={draft.rpId}
                    autoComplete="off"
                    onChange={(e) => patchPasskey({ rpId: e.target.value })}
                    className={fld}
                    placeholder="example.com"
                  />
                </div>
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-pk-rpname">
                    {t('items.field.rpName')}
                  </label>
                  <input
                    id="it-pk-rpname"
                    value={draft.rpName}
                    autoComplete="off"
                    onChange={(e) => patchPasskey({ rpName: e.target.value })}
                    className={fld}
                    placeholder="Example Inc."
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-pk-username">
                    {t('items.field.username')}
                  </label>
                  <input
                    id="it-pk-username"
                    value={draft.userName}
                    autoComplete="off"
                    onChange={(e) => patchPasskey({ userName: e.target.value })}
                    className={fld}
                  />
                </div>
                <div className="flex-1">
                  <label className={lbl} htmlFor="it-pk-displayname">
                    {t('items.field.displayName')}
                  </label>
                  <input
                    id="it-pk-displayname"
                    value={draft.displayName}
                    autoComplete="off"
                    onChange={(e) => patchPasskey({ displayName: e.target.value })}
                    className={fld}
                  />
                </div>
              </div>
              <div>
                <label className={lbl} htmlFor="it-pk-credid">
                  {t('items.field.credentialId')}
                </label>
                <input
                  id="it-pk-credid"
                  value={draft.credentialId}
                  autoComplete="off"
                  onChange={(e) => patchPasskey({ credentialId: e.target.value })}
                  className={`${fld} font-mono text-xs`}
                  placeholder="base64…"
                />
              </div>
            </>
          )}

          {/* Notes — shared (all kinds) */}
          <div>
            <label className={lbl} htmlFor="it-notes">
              {t('items.field.notes')}
            </label>
            <textarea
              id="it-notes"
              rows={draft.kind === 'note' ? 6 : 3}
              value={draft.notes}
              onChange={(e) => patchBase({ notes: e.target.value })}
              className={`${fld} resize-y`}
            />
          </div>

          {/* Custom fields */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className={lbl}>{t('items.customFields')}</span>
              <button
                type="button"
                onClick={() =>
                  patchBase({
                    customFields: [
                      ...draft.customFields,
                      { id: crypto.randomUUID(), label: '', value: '', secret: false }
                    ]
                  })
                }
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80"
              >
                <Plus size={13} />
                {t('items.addField')}
              </button>
            </div>
            {draft.customFields.length > 0 && (
              <div className="flex flex-col gap-2">
                {draft.customFields.map((cf) => {
                  const revealed = revealedCfIds.has(cf.id)
                  return (
                    <div key={cf.id} className="flex flex-wrap items-center gap-1.5">
                      <input
                        value={cf.label}
                        placeholder={t('items.field.fieldLabel')}
                        onChange={(e) =>
                          patchBase({
                            customFields: draft.customFields.map((f) =>
                              f.id === cf.id ? { ...f, label: e.target.value } : f
                            )
                          })
                        }
                        className={`${fld} w-28 shrink-0`}
                      />
                      <input
                        value={cf.value}
                        type={cf.secret && !revealed ? 'password' : 'text'}
                        placeholder={t('items.field.fieldValue')}
                        autoComplete="off"
                        onChange={(e) =>
                          patchBase({
                            customFields: draft.customFields.map((f) =>
                              f.id === cf.id ? { ...f, value: e.target.value } : f
                            )
                          })
                        }
                        className={`${fld} min-w-[10rem] flex-1 ${cf.secret ? 'font-mono' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedCfIds((s) => {
                            const n = new Set(s)
                            if (revealed) n.delete(cf.id)
                            else n.add(cf.id)
                            return n
                          })
                        }
                        disabled={!cf.secret}
                        className={`${iconBtn} disabled:opacity-30`}
                        aria-label={revealed ? t('items.hide') : t('items.show')}
                      >
                        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patchBase({
                            customFields: draft.customFields.map((f) =>
                              f.id === cf.id ? { ...f, secret: !f.secret } : f
                            )
                          })
                        }
                        className={`${iconBtn} ${cf.secret ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
                        aria-label={cf.secret ? t('items.field.secretOff') : t('items.field.secretOn')}
                        title={cf.secret ? t('items.field.secretOff') : t('items.field.secretOn')}
                      >
                        {cf.secret ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(cf.value)}
                        disabled={!cf.value}
                        className={`${iconBtn} disabled:opacity-40`}
                        aria-label={t('generator.copy')}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patchBase({
                            customFields: draft.customFields.filter((f) => f.id !== cf.id)
                          })
                        }
                        className={`${iconBtn} hover:border-[var(--danger)] hover:text-[var(--danger)]`}
                        aria-label={t('items.deleteField')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Category + color + favorite */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-40 flex-1">
              <label className={lbl} htmlFor="it-cat">
                {t('sidebar.categories')}
              </label>
              <select
                id="it-cat"
                value={draft.categoryId ?? ''}
                onChange={(e) => patchBase({ categoryId: e.target.value || null })}
                className={fld}
              >
                <option value="">{t('sidebar.uncategorized')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={lbl}>{t('items.field.color')}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => patchBase({ colorTag: null })}
                  className={`h-6 w-6 rounded-full border border-[var(--border)] text-[10px] text-[var(--text-muted)] ${
                    draft.colorTag === null ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                  aria-label={t('items.noColor')}
                >
                  —
                </button>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchBase({ colorTag: c })}
                    className={`h-6 w-6 rounded-full ${
                      draft.colorTag === c ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => patchBase({ favorite: !draft.favorite })}
              className={`flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm ${
                draft.favorite ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <Star size={15} fill={draft.favorite ? 'currentColor' : 'none'} />
              {t('sidebar.favorites')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--text-muted)]">{t('items.confirmDelete')}</span>
                <button
                  onClick={() => void remove()}
                  className="rounded-[var(--radius)] px-2 py-1 text-[var(--danger-contrast)]"
                  style={{ background: 'var(--danger)' }}
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm text-[var(--danger)] hover:opacity-80"
              >
                <Trash2 size={15} />
                {t('common.delete')}
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {isEdit && !confirmDelete && (
              <button
                onClick={() => void duplicate()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                title={t('items.duplicate')}
              >
                <Copy size={14} />
                {t('items.duplicate')}
              </button>
            )}
            <button
              onClick={() => close()}
              className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--bg)]"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void save()}
              disabled={busy || draft.title.trim().length === 0}
              className="rounded-[var(--radius)] px-4 py-1.5 text-sm font-medium text-[var(--accent-contrast)] disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
    </SlidePanel>
  )
}
