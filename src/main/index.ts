import { join } from 'node:path'
import { app, BrowserWindow, shell, session, powerMonitor } from 'electron'
import { VaultManager } from './vault/vault.js'
import { SettingsStore } from './settings.js'
import { registerIpcHandlers } from './ipc/handlers.js'
import { IPC } from '../shared/ipc.js'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let idleTimer: NodeJS.Timeout | null = null

const vaultPath = () => join(app.getPath('userData'), 'vault.sas')
const vault = new VaultManager(vaultPath())
const settings = new SettingsStore()

/** Lock the vault and tell the renderer to drop its in-memory state. */
async function lockNow(): Promise<void> {
  await vault.lock()
  mainWindow?.webContents.send(IPC.evtLocked)
}

/** Reset the idle auto-lock timer. Called on any user activity (IPC traffic). */
function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer)
  const minutes = settings.get().autoLockMinutes
  if (minutes <= 0) return // 0 = never auto-lock
  idleTimer = setTimeout(() => void lockNow(), minutes * 60 * 1000)
}

function applySecurityHeaders(): void {
  // Strict CSP: no remote code, no eval, no remote connections. Styles need
  // 'unsafe-inline' for the CSS-variable theming injected at runtime.
  const csp = [
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // Renderer never needs to spin up workers with node access.
      nodeIntegrationInWorker: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

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
    onActivity: resetIdleTimer
  })

  // Lock on the OS locking/suspending the machine (CLAUDE.md §3).
  powerMonitor.on('suspend', () => void lockNow())
  powerMonitor.on('lock-screen', () => void lockNow())

  createWindow()
  resetIdleTimer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Zero the key when the app is told to quit.
app.on('before-quit', () => void vault.lock())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Harden against a compromised renderer requesting a new webview/window.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})
