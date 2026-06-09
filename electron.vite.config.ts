import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Inject the strict production CSP as a <meta> tag at build time only. This
// guarantees the policy is enforced even when the packaged app loads the
// renderer over file:// (where webRequest header interception is unreliable).
// Dev intentionally has no meta CSP so Vite's HMR bootstrap can run.
function injectCspMeta(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
    // NB: 'frame-ancestors' is intentionally omitted — it is ignored in a
    // <meta> CSP and only valid as a response header (set in the main process).
  ].join('; ')
  return {
    name: 'sas-inject-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const tag = `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`
      return html.replace('</head>', tag)
    }
  }
}

// Build targets three isolated bundles: main (Node/Electron), preload (sandboxed
// bridge), and renderer (browser). Crypto deps stay external in main so libsodium's
// native/wasm loading is not mangled by the bundler.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
        // A sandboxed preload (sandbox: true) must be CommonJS — Electron cannot
        // load an ESM preload in a sandboxed renderer. Emit .cjs so the project's
        // "type": "module" doesn't force ESM interpretation.
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    plugins: [react(), tailwindcss(), injectCspMeta()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    }
  }
})
