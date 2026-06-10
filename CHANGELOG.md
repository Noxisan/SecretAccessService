# Changelog

All notable changes to **S.A.S — Secret Access Service** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-06-10

UX polish and security hardening: idle auto-lock now works correctly,
the sidebar is collapsible, and password history is browsable in-editor.

### Added
- **Collapsible sidebar** — a ChevronLeft button at the top of the
  sidebar collapses it to a 48 px icon strip showing All Items, Favorites,
  and each category as a colour-dot or folder icon. ChevronRight expands
  it again. State is not persisted, so it opens full on each launch.
- **Idle auto-lock heartbeat** — the renderer now listens for `mousemove`
  and `keydown` events and fires a lightweight `tools:activityPing` IPC
  call at most once per 30 s. Previously the idle timer only reset on
  explicit vault IPC traffic, so a user reading their vault without
  clicking anything would be locked out prematurely. The timer now resets
  correctly on any user interaction.
- **Password history viewer** — login items in edit mode show a
  collapsible "Password history (N)" section below the URL field when
  previous passwords exist. Each entry shows the replacement date, a
  masked password with a show/hide toggle, and a Restore button that
  promotes the old password to the active field (useful after an accidental
  overwrite). All 11 locales updated.

## [0.4.0] - 2026-06-10

Migration and backup release: move between devices, restore from backup,
and import from other password managers.

### Added
- **Encrypted vault export** — top-bar "Import / Export" button opens a
  new modal. The Export tab derives a standalone Argon2id key from a
  user-supplied backup password, then seals the full vault JSON with
  XChaCha20-Poly1305 and writes a `.sasbak` file. The master password is
  never reused for backups; each export gets its own random salt and nonce.
  A native save dialog lets the user choose where to put the file.
- **`.sasbak` encrypted import** — supply the backup password to decrypt
  and restore. Merge mode keeps existing items and appends new ones; Replace
  mode overwrites all items. The import runs fully in the main process; no
  plaintext ever touches the renderer.
- **CSV import** — accepts exports from Bitwarden, LastPass, and any
  manager that produces standard columns (`name/title`, `login_username/
  username`, `login_password/password`, `login_uri/url`, `notes`,
  `login_totp/totp`). Full RFC 4180 parser handles quoted fields and
  embedded commas. A warning banner is shown before importing because CSV
  files are plaintext.
- **Import mode selector** — choose *Merge* (safe default: only adds items
  not already present by ID) or *Replace* (destructive: clears vault and
  imports fresh). UI clearly explains the difference.
- All 11 UI locales updated with Import / Export translations.

## [0.3.0] - 2026-06-10

A major quality-of-life release: all five vault item types are now fully
editable, every UI string ships in 11 languages, and security intelligence
features surface password weaknesses in real time.

### Added
- **Full item editor for all five vault types** — Credit Card (cardholder,
  masked number, brand, expiry month/year selectors, CVV with show/hide),
  Identity (first/last name, email, phone, address), and TOTP Authenticator
  (otpauth URI, issuer, account) join the existing Login and Secure Note editors.
  Add-menu in the item list now lists all five types.
- **Live TOTP code display** — TOTP items in the list show the current 6-digit
  code with an SVG radial countdown ring; turns red in the last 5 seconds.
  Clicking the code copies it to clipboard with auto-clear.
- **Password health dashboard** — Activity button in the top bar opens a modal
  that flags weak (zxcvbn score < 3), reused, old (> 180 days unchanged), and
  breached passwords. Clicking any flagged item jumps directly to its editor.
- **HaveIBeenPwned k-anonymity breach check** — "Check for breaches" button in
  the health dashboard queries the HIBP range API; only the first 5 hex chars
  of the SHA-1 hash leave the process. Shows per-item breach count inline.
- **Inline password strength meter** — zxcvbn-powered 5-segment bar appears
  below the password field in the item editor while typing.
- **Quick-copy on item list rows** — hover reveals a copy button that copies the
  relevant secret in one click (password for logins, card number for cards,
  email for identities) with auto-clipboard-clear.
- **11 full UI translations** — Mandarin Chinese, Hindi, Spanish, French,
  Arabic, Bengali, Portuguese, Russian, and Urdu added alongside the existing
  English and German. RTL layout applied automatically for Arabic and Urdu.
- **Vault search expanded** — now matches across all item types: username/URL
  for logins, note content, cardholder/brand for cards, name/email for
  identities, issuer/account for TOTP.

### Fixed
- **Settings language picker** — previously all nine non-English/German
  languages silently fell back to English; all 11 now load native text.
- **HTML validity** — nested `<button>` inside `<button>` in the health
  dashboard replaced with sibling flex layout; fixes keyboard navigation
  and assistive-technology announcement.

## [0.2.0] - 2026-06-09

First feature release on top of the secure foundation: the vault is now usable
end to end — create it, add and manage entries, and generate strong passwords.

### Added
- **Password generator UI** — modal with character mode (length, character-class
  toggles, exclude-ambiguous) and passphrase mode (word count, separator), a live
  entropy/strength meter, and copy-to-clipboard wired to the auto-clearing clipboard.
- **Item create / edit / delete UI** — editor for login and secure-note items
  (title, username, password with show/hide + inline generate + copy, website,
  notes, category, color tag, favorite); add menu, click-to-edit, delete with
  confirmation. Login passwords keep a change history.
- **Create-a-new-vault escape hatch** — recover from a forgotten master password
  or a corrupt/unwanted vault file by creating a fresh vault, gated behind an
  explicit destructive confirmation (`vault:recreate` IPC + `VaultManager.recreate`).
- Search now matches login username and URL in addition to title.

### Fixed
- **Blank renderer window** — sandboxed preload now builds as CommonJS (`.cjs`);
  the CSP is strict in production (build-time `<meta>`) but relaxed for the Vite
  dev server; `react-dom` pinned to match `react` exactly.

### Changed
- Normalized line endings to LF via `.gitattributes`.

### Security
- All new IPC payloads validated with `zod`; generator and clipboard auto-clear
  run in the main process; no secrets cross to the renderer except on demand.

## [0.1.0] - 2026-06-09

### Added
- Initial project scaffold: Electron 42 + TypeScript 6 (strict) + React 19 +
  electron-vite 5, packaged via electron-builder (Windows NSIS/portable, Linux
  AppImage/deb).
- **Cryptography core** — Argon2id key derivation + XChaCha20-Poly1305 AEAD via
  libsodium, with a versioned, tamper-evident vault file format, atomic writes,
  and in-memory key zeroing on lock/quit.
- Hardened Electron shell (`contextIsolation`, `sandbox`, `nodeIntegration: false`,
  strict CSP, allow-listed typed `contextBridge` preload, zod-validated IPC).
- React renderer with CSS-variable theming (electric-violet accent), sidebar +
  top bar, and i18n scaffolding (English + German).

[Unreleased]: https://github.com/Noxisan/sas/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/Noxisan/sas/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Noxisan/sas/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Noxisan/sas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Noxisan/sas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Noxisan/sas/releases/tag/v0.1.0
