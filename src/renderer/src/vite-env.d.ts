/// <reference types="vite/client" />

// Ambient declarations for asset imports (CSS, etc.) handled by the Vite
// renderer bundler. Keeps `import './styles/theme.css'` type-safe.
declare module '*.css' {
  const css: string
  export default css
}
