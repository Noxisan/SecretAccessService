import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Upload, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../store/app'

type Tab = 'export' | 'import'
type ImportFormat = 'sasbak' | 'csv'

export default function ImportExportModal(): JSX.Element | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.importExportOpen)
  const setOpen = useAppStore((s) => s.setImportExportOpen)
  const setVault = useAppStore((s) => s.setVault)

  const [tab, setTab] = useState<Tab>('export')

  // Export state
  const [exportPassword, setExportPassword] = useState('')
  const [exportConfirm, setExportConfirm] = useState('')
  const [showExportPw, setShowExportPw] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportResult, setExportResult] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Import state
  const [importFormat, setImportFormat] = useState<ImportFormat>('sasbak')
  const [importFile, setImportFile] = useState<string>('')
  const [importPassword, setImportPassword] = useState('')
  const [showImportPw, setShowImportPw] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [importBusy, setImportBusy] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; replaced: boolean } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) {
      setExportPassword(''); setExportConfirm(''); setExportResult(null); setExportError(null)
      setImportFile(''); setImportPassword(''); setImportResult(null); setImportError(null)
    }
  }, [open])

  if (!open) return null

  const exportMismatch = exportPassword !== exportConfirm && exportConfirm.length > 0
  const exportReady = exportPassword.length >= 1 && exportPassword === exportConfirm

  async function doExport(): Promise<void> {
    if (!exportReady) return
    setExportBusy(true); setExportError(null); setExportResult(null)
    try {
      const res = await window.sas.tools.exportVault(exportPassword)
      if (res.filePath) setExportResult(res.filePath)
      else setExportResult(null) // user cancelled
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e))
    } finally {
      setExportBusy(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile((file as File & { path?: string }).path ?? file.name)
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.csv') || lower.endsWith('.txt')) setImportFormat('csv')
    else setImportFormat('sasbak')
    setImportResult(null); setImportError(null)
  }

  async function doImport(): Promise<void> {
    if (!importFile) return
    setImportBusy(true); setImportError(null); setImportResult(null)
    try {
      const res = await window.sas.tools.importVault(
        importFile,
        importFormat === 'sasbak' ? importPassword : undefined,
        importMode
      )
      setImportResult(res)
      const fresh = await window.sas.vault.read()
      setVault(fresh)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)]"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('importExport.title')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="font-semibold text-[var(--text)]">{t('importExport.title')}</h2>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)]">
          {(['export', 'import'] as Tab[]).map((t2) => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={[
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                tab === t2
                  ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              ].join(' ')}
            >
              {t2 === 'export' ? t('importExport.exportTab') : t('importExport.importTab')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {tab === 'export' ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-muted)]">{t('importExport.exportDesc')}</p>

              {/* Export password */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">{t('importExport.exportPassword')}</span>
                <div className="relative">
                  <input
                    type={showExportPw ? 'text' : 'password'}
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    placeholder={t('importExport.exportPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                    tabIndex={-1}
                  >
                    {showExportPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>

              {/* Confirm */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">{t('importExport.confirmPassword')}</span>
                <input
                  type={showExportPw ? 'text' : 'password'}
                  value={exportConfirm}
                  onChange={(e) => setExportConfirm(e.target.value)}
                  className={[
                    'w-full rounded-[var(--radius)] border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none',
                    exportMismatch ? 'border-[var(--danger)] focus:border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--accent)]'
                  ].join(' ')}
                  placeholder={t('importExport.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                />
                {exportMismatch && (
                  <span className="text-xs text-[var(--danger)]">{t('unlock.mismatch')}</span>
                )}
              </label>

              {exportResult && (
                <div className="flex items-center gap-2 rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-2 text-sm text-[var(--success)]">
                  <CheckCircle2 size={14} />
                  {t('importExport.exportSuccess', { path: exportResult })}
                </div>
              )}
              {exportError && (
                <div className="rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
                  {exportError}
                </div>
              )}

              <button
                onClick={() => void doExport()}
                disabled={!exportReady || exportBusy}
                className="flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                <Download size={14} />
                {exportBusy ? t('importExport.exporting') : t('importExport.exportButton')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* CSV warning */}
              <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                <p className="text-xs text-[var(--warning)]">{t('importExport.importWarning')}</p>
              </div>

              {/* File picker */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">{t('importExport.file')}</span>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sasbak,.csv,.txt,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Upload size={14} />
                    {t('importExport.chooseFile')}
                  </button>
                  {importFile && (
                    <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">
                      {importFile.split(/[\\/]/).pop()}
                    </span>
                  )}
                </div>
              </label>

              {/* Password (only for .sasbak) */}
              {importFormat === 'sasbak' && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">{t('importExport.backupPassword')}</span>
                  <div className="relative">
                    <input
                      type={showImportPw ? 'text' : 'password'}
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                      placeholder={t('importExport.backupPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowImportPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                      tabIndex={-1}
                    >
                      {showImportPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </label>
              )}

              {/* Import mode */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-[var(--text-muted)]">{t('importExport.importMode')}</span>
                <div className="flex gap-3">
                  {(['merge', 'replace'] as const).map((m) => (
                    <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="importMode"
                        value={m}
                        checked={importMode === m}
                        onChange={() => setImportMode(m)}
                        className="accent-[var(--accent)]"
                      />
                      <span className="text-[var(--text)]">{t(`importExport.mode.${m}`)}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{t(`importExport.modeDesc.${importMode}`)}</p>
              </div>

              {importResult && (
                <div className="flex items-center gap-2 rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-2 text-sm text-[var(--success)]">
                  <CheckCircle2 size={14} />
                  {t('importExport.importSuccess', { count: importResult.imported })}
                </div>
              )}
              {importError && (
                <div className="rounded-[var(--radius)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
                  {importError}
                </div>
              )}

              <button
                onClick={() => void doImport()}
                disabled={!importFile || importBusy || (importFormat === 'sasbak' && !importPassword)}
                className="flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                <Upload size={14} />
                {importBusy ? t('importExport.importing') : t('importExport.importButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
