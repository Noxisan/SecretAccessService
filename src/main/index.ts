import { join } from 'node:path'
import { app, BrowserWindow, Tray, Menu, nativeImage, shell, session, powerMonitor } from 'electron'
import { VaultManager } from './vault/vault.js'
import { SettingsStore } from './settings.js'
import { registerIpcHandlers } from './ipc/handlers.js'
import { clearClipboardIfOurs } from './clipboardGuard.js'
import { IPC } from '../shared/ipc.js'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let idleTimer: NodeJS.Timeout | null = null
// Set just before a real quit so the close handler stops intercepting (otherwise
// "minimize to tray on close" would trap the app and it could never exit).
let isQuitting = false

const vaultPath = () => join(app.getPath('userData'), 'vault.sas')
const vault = new VaultManager(vaultPath())
const settings = new SettingsStore()

/**
 * Resolve a path to a bundled image asset. In dev these live in the project's
 * `build/` dir; when packaged they are copied next to the app via electron-builder
 * `extraResources` (see electron-builder.yml). `import.meta.dirname` is `out/main`
 * in dev, so `../../build` points back at the project's build/ folder.
 */
function assetPath(file: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, file)
    : join(import.meta.dirname, '../../build', file)
}

/** Lock the vault and tell the renderer to drop its in-memory state. */
async function lockNow(): Promise<void> {
  await vault.lock()
  if (settings.get().clearClipboardOnLock) clearClipboardIfOurs()
  mainWindow?.webContents.send(IPC.evtLocked)
}

/** Bring the main window back from the tray (restore + focus). */
function showWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/**
 * Build the tray context menu. Tray labels are plain English — the main process
 * has no i18n runtime — but the actions mirror the in-app controls.
 */
function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: 'Show S.A.S', click: () => showWindow() },
    { label: 'Lock vault', click: () => void lockNow() },
    { type: 'separator' },
    {
      label: 'Quit S.A.S',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
}

/**
 * Create or destroy the system tray icon to match the current setting. Called at
 * startup and whenever settings change, so toggling the option takes effect live.
 */
function syncTray(): void {
  const wanted = settings.get().minimizeToTrayOnClose
  if (wanted && !tray) {
    const image = nativeImage.createFromPath(assetPath('tray.png'))
    tray = new Tray(image)
    tray.setToolTip('S.A.S — Secret Access Service')
    tray.setContextMenu(buildTrayMenu())
    // Left-click (or double-click on Windows) toggles the window.
    tray.on('click', () => showWindow())
    tray.on('double-click', () => showWindow())
  } else if (!wanted && tray) {
    tray.destroy()
    tray = null
  }
}

/** Reset the idle auto-lock timer. Called on any user activity (IPC traffic). */
function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer)
  const minutes = settings.get().autoLockMinutes
  if (minutes <= 0) return // 0 = never auto-lock
  idleTimer = setTimeout(() => void lockNow(), minutes * 60 * 1000)
}

function applySecurityHeaders(): void {
  // Production CSP: no remote code, no eval, no remote connections. Styles need
  // 'unsafe-inline' for the CSS-variable theming injected at runtime. This same
  // policy is also injected as a <meta> tag into the production HTML at build
  // time (see electron.vite.config.ts) so it holds even for file:// loads.
  const prodCsp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join('; ')

  // Dev CSP: the Vite dev server needs an inline bootstrap script (React Fast
  // Refresh preamble) and a websocket for HMR. These relaxations apply ONLY to
  // the dev server on localhost and never ship in the packaged app.
  const devCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' ws://localhost:* http://localhost:*",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'"
  ].join('; ')

  const csp = isDev ? devCsp : prodCsp

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  // Block any permission request (camera, geolocation, etc.) — we need none.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, cb) => cb(false))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 560,
    show: false,
    backgroundColor: '#0e0e11',
    // Taskbar / window icon. On Windows the packaged .exe icon is used, but this
    // also covers the dev run and Linux where the window icon drives the taskbar.
    icon: assetPath('icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      // Preload is built as CommonJS (.cjs) because a sandboxed renderer cannot
      // load an ESM preload (see electron.vite.config.ts).
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // Renderer never needs to spin up workers with node access.
      nodeIntegrationInWorker: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Optionally lock the vault when the window is minimized (CLAUDE.md §3).
  mainWindow.on('minimize', () => {
    if (settings.get().lockOnMinimize) void lockNow()
  })

  // "Minimize to tray on close": intercept the user closing the window and hide
  // it instead of quitting. `isQuitting` (set by before-quit / the tray Quit
  // item) lets a genuine quit through. The idle auto-lock timer keeps running
  // while hidden, so the vault still locks itself on inactivity.
  mainWindow.on('close', (event) => {
    if (!isQuitting && settings.get().minimizeToTrayOnClose) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Dev-only diagnostics: surface renderer console + load failures in the
  // terminal (the renderer must never log secrets, so this stays safe).
  if (isDev) {
    mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
      console.warn(`[renderer:${level}] ${message} (${source}:${line})`)
    })
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[renderer] did-fail-load ${code} ${desc} ${url}`)
    })
  }

  // Open external links in the system browser; never inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? ''
    if (url !== current) event.preventDefault()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await settings.load()
  applySecurityHeaders()

  registerIpcHandlers({
    vault,
    settings,
    getWindow: () => mainWindow,
    onActivity: resetIdleTimer,
    // Re-evaluate the tray whenever settings are saved so toggling the option
    // adds/removes the tray icon live (no restart required).
    onSettingsChange: () => syncTray()
  })

  // Lock on the OS locking/suspending the machine (CLAUDE.md §3).
  powerMonitor.on('suspend', () => void lockNow())
  powerMonitor.on('lock-screen', () => void lockNow())

  createWindow()
  syncTray()
  resetIdleTimer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showWindow()
  })
})

// Zero the key when the app is told to quit. Also flip `isQuitting` so the
// window's close handler stops intercepting and lets the quit proceed.
app.on('before-quit', () => {
  isQuitting = true
  void vault.lock()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Harden against a compromised renderer requesting a new webview/window.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})
