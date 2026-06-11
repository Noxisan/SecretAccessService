import { useEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  /**
   * Heading shown in the pinned header bar. When provided, SlidePanel renders a
   * standard header (title + close), a scrollable body, and an optional footer.
   * When omitted, `children` are rendered directly so a panel can supply its own
   * header/body/footer layout (used by the item editor).
   */
  title?: ReactNode
  /** Scrollable body content. */
  children: ReactNode
  /** Optional content pinned to the right of the title (e.g. a kind badge). */
  headerExtra?: ReactNode
  /** Optional pinned footer (e.g. Save / Cancel actions). */
  footer?: ReactNode
  /** Accessible name; defaults to `title` when it is a string. */
  ariaLabel?: string
  /** Tailwind max-width class controlling the panel width. */
  width?: string
  /** Classes applied to the scrollable body wrapper (default `p-5`). */
  bodyClassName?: string
}

/**
 * A right-anchored panel that slides in from the right edge and out again,
 * replacing centred modal dialogs across the app. Provides a consistent pinned
 * header (title + close) and optional pinned footer, with a scrollable body in
 * between. Handles the backdrop, click outside to close, Escape to close, and
 * mount/unmount around the transition so both animations play.
 */
export default function SlidePanel({
  open,
  onClose,
  title,
  children,
  headerExtra,
  footer,
  ariaLabel,
  width = 'max-w-lg',
  bodyClassName = 'p-5'
}: SlidePanelProps): JSX.Element | null {
  const { t } = useTranslation()
  // `mounted` keeps the node in the tree through the slide-out transition;
  // `shown` drives the transform/opacity so the slide-in plays after mount.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const tm = window.setTimeout(() => setMounted(false), 200)
    return () => window.clearTimeout(tm)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onMouseDown={onClose}
      />
      {/* Panel — anchored to the right edge, slides in from off-screen right */}
      <div
        className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl transition-transform duration-200 ease-out ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title === undefined ? (
          children
        ) : (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-semibold text-[var(--text)]">{title}</h2>
                {headerExtra}
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

            {/* Footer */}
            {footer && (
              <div className="shrink-0 border-t border-[var(--border)] px-5 py-3">{footer}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
