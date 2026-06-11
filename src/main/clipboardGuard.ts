import { clipboard } from 'electron'

/**
 * Tracks the secret most recently written to the clipboard by the app so it can
 * be cleared the instant the vault locks — but only if it is still our value, so
 * we never wipe unrelated data the user copied afterwards.
 *
 * The per-copy auto-clear timer (in the IPC layer) is independent; this guard
 * covers the "clear now, on lock" path across all lock triggers (manual, idle,
 * and system sleep/lock-screen).
 */
let lastCopied: string | null = null

/** Record a secret we just placed on the clipboard. */
export function rememberClipboard(text: string): void {
  lastCopied = text
}

/** Forget the tracked secret without touching the clipboard. */
export function forgetClipboard(): void {
  lastCopied = null
}

/**
 * Clear the clipboard if and only if it still holds the last secret we copied.
 * Returns true when it actually cleared. Safe to call when nothing was copied.
 */
export function clearClipboardIfOurs(): boolean {
  if (lastCopied !== null && clipboard.readText() === lastCopied) {
    clipboard.clear()
    lastCopied = null
    return true
  }
  return false
}
