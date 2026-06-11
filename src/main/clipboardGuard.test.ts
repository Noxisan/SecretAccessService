import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory stand-in for Electron's clipboard. Defined via vi.hoisted so it is
// initialised before the hoisted vi.mock factory references it.
const { clipboard } = vi.hoisted(() => {
  let buffer = ''
  return {
    clipboard: {
      readText: (): string => buffer,
      writeText: (t: string): void => {
        buffer = t
      },
      clear: (): void => {
        buffer = ''
      }
    }
  }
})
vi.mock('electron', () => ({ clipboard }))

import { rememberClipboard, forgetClipboard, clearClipboardIfOurs } from './clipboardGuard.js'

beforeEach(() => {
  clipboard.clear()
  forgetClipboard()
})

describe('clipboardGuard', () => {
  it('clears the clipboard when it still holds our copied secret', () => {
    clipboard.writeText('s3cret')
    rememberClipboard('s3cret')
    expect(clearClipboardIfOurs()).toBe(true)
    expect(clipboard.readText()).toBe('')
  })

  it('does not clear when the clipboard now holds something else', () => {
    rememberClipboard('s3cret')
    clipboard.writeText('user typed this later')
    expect(clearClipboardIfOurs()).toBe(false)
    expect(clipboard.readText()).toBe('user typed this later')
  })

  it('does nothing when no secret was copied', () => {
    clipboard.writeText('unrelated')
    expect(clearClipboardIfOurs()).toBe(false)
    expect(clipboard.readText()).toBe('unrelated')
  })

  it('forgets the tracked secret without touching the clipboard', () => {
    clipboard.writeText('s3cret')
    rememberClipboard('s3cret')
    forgetClipboard()
    expect(clearClipboardIfOurs()).toBe(false)
    expect(clipboard.readText()).toBe('s3cret')
  })

  it('only clears once for a given copy', () => {
    clipboard.writeText('s3cret')
    rememberClipboard('s3cret')
    expect(clearClipboardIfOurs()).toBe(true)
    // Someone copies the same string again by hand; we no longer own it.
    clipboard.writeText('s3cret')
    expect(clearClipboardIfOurs()).toBe(false)
  })
})
