import { useEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible name for the dialog. */
  ariaLabel: string
  /** Tailwind max-width class controlling the panel width. */
  width?: string
}

/**
 * A right-anchored panel that slides in from the right edge and out again,
 * replacing centred modal dialogs across the app. Handles the backdrop, click
 * outside to close, Escape to close, and mount/unmount around the transition so
 * both the open and close animations play.
 */
export default function SlidePanel({
  open,
  onClose,
  children,
  ariaLabel,
  width = 'max-w-lg'
}: SlidePanelProps): JSX.Element | null {
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
    const t = window.setTimeout(() => setMounted(false), 200)
    return () => window.clearTimeout(t)
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
        aria-label={ariaLabel}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
