# Changelog

All notable changes to **S.A.S — Secret Access Service** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **CI/CD via GitHub Actions** — `ci.yml` runs lint, strict type-check, tests,
  and build on every push/PR to `main`/`develop`; `release.yml` builds the
  Windows and Linux installers on a version tag and attaches them to the
  matching GitHub Release.

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

[Unreleased]: https://github.com/Noxisan/sas/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Noxisan/sas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Noxisan/sas/releases/tag/v0.1.0
