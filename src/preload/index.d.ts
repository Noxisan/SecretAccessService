import type { SasApi } from './index.js'

/**
 * Ambient type for the bridge exposed on `window.sas`. The renderer imports
 * nothing from main/preload at runtime — it only sees this typed surface.
 */
declare global {
  interface Window {
    sas: SasApi
  }
}

export {}
