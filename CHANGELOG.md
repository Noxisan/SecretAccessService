# Changelog

All notable changes to **S.A.S — Secret Access Service** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Tests
- Added 14 tests for the vault format and migration layer. `headerAad` (the AEAD
  associated data) is now guarded to be deterministic, canonical regardless of
  input key order, to exclude the nonce, and to change whenever any
  security-relevant field (version, salt, KDF ops/mem, cipher) changes — locking
  in the header tamper-detection surface. `migrateVaultData` is covered for
  passing current/older vaults through without dropping user data and rejecting
  newer-schema vaults. Suite grows to 132 tests.

## [0.20.0] - 2026-06-11

Hardens the passphrase generator with the full EFF diceware wordlist — a
meaningful security improvement — and adds the project's LICENSE file.

### Added
- **LICENSE file** — the canonical GPL-3.0 text, matching the
  `GPL-3.0-or-later` declaration in `package.json` and the README badge.

### Documentation
- README: added the 0.19.0 release to the history table, corrected the source
  download to GitHub's auto-attached "Source code (zip / tar.gz)", documented the
  EFF diceware list in the generator row, cross-linked the LICENSE, and linked
  Download to the release history and changelog.

### Changed
- **Stronger passphrases — full EFF diceware wordlist** — the passphrase
  generator now draws from the standard 7776-word EFF large wordlist instead of
  the previous 40-word placeholder. Each word now carries ~12.9 bits of entropy
  instead of ~5.3, so a 5-word passphrase jumps from ~26 bits (which the meter
  rated "very weak") to ~65 bits. The list is embedded for full offline use and
  is verbatim from the published EFF source so the entropy is auditable.

### Fixed
- **Unbiased word selection across the larger list** — added a two-byte
  rejection sampler (`uniformIndex`); the old single-byte `uniformByte` capped
  at 256 and could not index a 7776-word list without bias.

### Tests
- Reworked the passphrase tests around the new list: a drift guard asserting the
  list is exactly 7776 unique words (kept in lockstep with the renderer's
  entropy estimate), word-membership checks, and a distribution check that
  exercises the two-byte sampler. Suite grows to 118 tests.

## [0.19.0] - 2026-06-11

Adds the ability to open a login's website directly in your system browser, plus
a round of internal refactors that put security-sensitive logic (TOTP, breach
checking, item search) under unit test.

### Added
- **Open URL in system browser** — login entries with a website now show an
  external-link button (in both the list and the editor) that opens the URL in
  your default browser via `shell.openExternal`. Only `http`/`https` URLs are
  allowed, validated by a zod schema in the main process to prevent
  protocol-handler abuse. New `tools:openExternal` IPC channel and an
  `items.openUrl` string localized across all 11 languages.

### Changed
- **TOTP logic extracted from the UI** — `otpauth` parsing and code/countdown
  computation moved out of the `TotpCode` component into a pure, dependency-free
  `totp.ts` module (`parseTotp`, `computeTotp`) with injectable time, making the
  RFC 6238 logic unit-testable without rendering.
- **Item search/display helpers extracted** — `matches`, `subtitle`,
  `quickCopyText`, and `quickCopyLabel` moved out of `ItemList` into a pure
  `itemDisplay.ts` module so they can be unit-tested. Consolidated two
  near-duplicate clipboard helpers into a single `copyValue`.
- **HIBP hashing/parsing extracted** — the SHA-1 hashing, k-anonymity
  prefix/suffix split, and breach-range response parsing moved out of the IPC
  handler into a pure `hibp.ts` module (`hashPassword`, `parseRangeResponse`).
  No behaviour change; the network call stays in the handler.

### Tests
- Added 8 tests for the TOTP module, including the RFC 6238 SHA1 reference
  vector (T=59 → `94287082`), HOTP/garbage-URI rejection, and countdown
  boundaries.
- Added 10 tests for the item display/search helpers, including a security
  guard asserting that search never matches secret material (passwords, card
  numbers/CVV, TOTP/passkey secrets).
- Added 10 tests for the HIBP module, covering the known SHA-1 of `password`,
  the privacy invariant that only a 5-char prefix is transmitted, and range
  parsing across `\r\n`/`\n` endings, mixed case, whitespace, malformed lines,
  and fail-closed non-numeric/non-positive counts. Suite grows from 87 to 115
  tests.

## [0.18.1] - 2026-06-10

Patch release fixing a crash that could blank the main window.

### Fixed
- **ItemList white-screen / infinite render loop** — the `travelHiddenIds`
  Zustand selector constructed a new `Set` on every call, so
  `useSyncExternalStore` saw a changed snapshot each render and looped until
  React aborted with "Maximum update depth exceeded", white-screening the main
  item list. The id array is now selected directly and the `Set` derived via
  `useMemo`, keeping the reference stable. (Affected 0.18.0.)

### Changed
- Local agent runtime state (`memory/`) and temporary loop patch files are now
  git-ignored.

## [0.18.0] - 2026-06-10

Proactive health awareness: a red count badge appears on the health button
whenever the vault contains weak, reused, or old passwords.

### Added
- **Health issue badge** — the Activity icon in the top bar now shows a small
  red count badge (capped at 99+) when the vault has at least one password
  issue (weak, reused, or older than 180 days). The count is computed locally
  in the renderer from vault state; no network call is needed. Breach issues
  remain opt-in via the "Check breaches" button inside the health dashboard.

### Changed
- `analyzeVault` extracted from `HealthDashboard` into a standalone module
  (`src/renderer/src/features/health/analyzeVault.ts`). Both the TopBar badge
  and the dashboard now share the same logic. Exports: `analyzeVault`,
  `BreachMap`, `HealthIssue`, `WEAK_SCORE`, `OLD_DAYS`.
- 12 new unit tests for `analyzeVault` covering all issue categories,
  multi-reason accumulation, safe tallies, and constant exports.
  Total test count: 87.

## [0.17.0] - 2026-06-10

Generator settings are now remembered across sessions.

### Added
- **Persistent generator settings** — the password generator modal restores
  your last-used configuration (mode, length, character classes, word count,
  and separator) whenever it opens. Settings are saved to `AppSettings` via
  the existing IPC channel the moment the modal closes, so every subsequent
  session starts where you left off. A fresh install defaults to the previous
  hard-coded values (length 20, all character classes on, 5-word passphrase,
  hyphen separator).

### Changed
- `AppSettings` gains an optional `generatorDefaults` field of type
  `GeneratePasswordOptions`; existing settings files without this field
  automatically fall back to the built-in defaults on first load.
- `settingsSchema` updated to validate `generatorDefaults` when present.
- `DEFAULT_SETTINGS` seeded with the existing default generator options so
  all code paths have a consistent fallback.

## [0.16.0] - 2026-06-10

Code quality: import parsers extracted to a testable module; test suite grows
from 40 to 75 tests.

### Changed
- **Refactored import parsers** — `parseCsv`, `parseBitwardenJson`, and
  `isBitwardenJson` moved from `src/main/ipc/handlers.ts` into a new
  dedicated module `src/main/tools/importParsers.ts`. No behaviour change;
  the IPC handler still calls the same functions via the new import.
- **35 new unit tests** covering `parseCsv` (Bitwarden/LastPass/generic CSV,
  quoted fields, RFC 4180 double-quote escaping, TOTP column, blank lines,
  unique IDs), `isBitwardenJson` (detection accuracy, edge cases), and
  `parseBitwardenJson` (all four item types, custom fields, encrypted-export
  error, missing fields, unknown type skipping). Total test count: 75.

## [0.15.0] - 2026-06-10

Quality-of-life: duplicate any vault entry in one click.

### Added
- **Duplicate entry** — a "Duplicate" button appears in the item editor footer
  when editing an existing entry. Clicking it clones the item with a new ID,
  resets `createdAt` and `updatedAt` to now, prefixes the title with
  "Copy of …", and saves the copy to the vault. The duplicate inherits all
  fields: credentials, TOTP seed, custom fields, notes, category, color tag,
  and favorite status. The editor closes after duplicating so the user can find
  and rename the new copy in the list. All 11 locales updated.

## [0.14.0] - 2026-06-10

Bitwarden JSON import: migrate from Bitwarden by dropping in an unencrypted
JSON export — no conversion step required.

### Added
- **Bitwarden JSON import** — the Import dialog now accepts `.json` files and
  automatically detects unencrypted Bitwarden vault exports. All four item
  types are mapped: Login (type 1), Secure Note (type 2), Credit Card (type 3),
  and Identity (type 4). Custom fields, favorites, and notes are preserved.
  TOTP seeds embedded in Bitwarden login items are carried over as the `totp`
  field so they show live codes immediately after import. Merge and Replace
  modes both work as with other formats. An informational hint explains the
  format requirements and links to the export-without-encryption step for
  encrypted Bitwarden exports. All 11 locales updated.

### Changed
- Import-format detection now identifies Bitwarden JSON by probing item type
  values; falls back to native SAS JSON then CSV for unrecognised files. The
  `.json` file extension is mapped to the new `json` format in the UI rather
  than being treated as a backup archive.

## [0.13.0] - 2026-06-10

Passkey storage, full i18n coverage, and breach-check localization.

### Added
- **Passkey storage** — a new "Passkey" item type lets users record WebAuthn /
  FIDO2 credentials as reference entries. Fields: relying party domain, relying
  party name, username, display name, credential ID (base64). The private key
  stays in the OS/hardware authenticator and is never stored; the entry is an
  organisational record so users know which services have passkeys set up.
  Searchable, sortable, and colour-taggable like all other item types.
- **Breach-check strings** for all 9 non-English/German locales — the health
  dashboard's "Check for breaches", checking indicator, error message, and
  breach count labels are now fully translated.

### Fixed
- Travel-mode and panic-lock UI strings (`travelHide`, `travelMode`,
  `maxFailedAttempts`, `maxFailedAttemptsHint`, `attemptsRemaining`) that were
  left in English in 9 non-German locales are now translated.

## [0.12.0] - 2026-06-10

OS keychain integration: unlock the vault with a single click after the
first successful password entry on a trusted device.

### Added
- **Quick unlock ("Remember this device")** — a new checkbox on the unlock
  screen lets the user save their master password to the OS keychain
  (DPAPI on Windows, libsecret/kwallet on Linux) via Electron `safeStorage`.
  On subsequent launches a large "Unlock with saved credentials" button is
  shown; tapping it decrypts the vault without typing the master password.
  A "Use master password instead" fallback link is always visible.
- **Settings > Device unlock section** — shows whether credentials are
  currently saved and provides a "Remove saved credentials" button to
  immediately wipe the stored key.
- **Automatic key invalidation** — the saved device key is automatically
  cleared on vault recreate, master password change, and panic lock. If
  the key has gone stale (vault was recreated on another path), the failed
  unlock attempt clears the key and surfaces a clear error message.
- Graceful degradation when OS encryption is unavailable (Linux without a
  secret service; cloud/container environments): the feature hides itself
  silently.
- All 11 locales updated.

## [0.11.0] - 2026-06-10

UX polish: sort the item list any way you like, and see at a glance how many
items live in each category.

### Added
- **Item sort options** — a compact sort selector appears in the item list
  header. Choose from: A → Z (default), Z → A, Recently modified (newest
  `updatedAt` first), Oldest first (by `createdAt`), or By type (groups all
  logins, notes, cards, etc. together, then alphabetically within each group).
  The selected sort is session-scoped; it resets to A → Z on next launch.
  All 11 locales updated.
- **Category item-count badges** — the sidebar now shows a muted count next
  to each category name, as well as next to "All items" and "Favorites". Counts
  are computed in the renderer from the in-memory vault data (no IPC). Zero
  counts are hidden to keep the sidebar uncluttered.

## [0.10.0] - 2026-06-10

Security feature: change the master password while the vault is unlocked,
with mandatory current-password verification and immediate vault re-encryption.

### Added
- **Change master password** — a new "Change master password" link at the
  bottom of the Settings modal opens a dedicated dialog. The user must supply
  their current master password before the new one is accepted, providing a
  second-factor check against unauthorized changes on an unattended device.
  On confirmation the vault is immediately re-encrypted with the new key (a
  full Argon2id derivation + XChaCha20-Poly1305 re-seal); the old key is
  zeroed from memory. A green confirmation screen is shown on success. All 11
  locales updated.

## [0.9.0] - 2026-06-10

Travel mode: hide sensitive categories (and all their items) with a single
button press, then restore everything just as easily.

### Added
- **Travel mode** — a Plane icon in the top bar toggles travel mode on and
  off. The mode is session-scoped (resets on restart), but the per-category
  configuration persists in app settings.
- **Per-category travel hiding** — hovering over any category in the sidebar
  reveals a plane icon alongside the existing rename/delete actions. Clicking
  it marks that category as hidden in travel mode (icon turns accent-coloured).
  While travel mode is active, marked categories disappear entirely from the
  sidebar and every item that belongs to them is removed from the item list and
  global search. Toggling travel mode off restores everything instantly.
- Configuration stored as `travelHiddenCategoryIds` in `AppSettings` (IPC-
  validated); the list survives restarts so re-arming travel mode at the border
  is a single click.
- All 11 locales updated.

## [0.8.0] - 2026-06-10

Security hardening: configurable vault self-destruct after too many failed
unlock attempts, and a live attempt-remaining warning in the unlock screen.

### Added
- **Panic lock / self-destruct** — a new setting (*Self-destruct after N failed
  attempts*; default 10; 0 = disabled) instructs the app to permanently delete
  the vault file after that many consecutive wrong master-password attempts.
  The in-memory key is zeroed immediately; only the encrypted ciphertext on disk
  is deleted — the master password is never stored and therefore cannot be wiped
  (it never existed after key derivation). The counter resets on any successful
  unlock or app restart. Configurable in Settings.
- **Attempts-remaining warning** — the unlock screen shows a danger banner
  during the final 3 attempts before destruction, stating exactly how many
  chances remain. After destruction the screen automatically transitions to the
  create-vault state. All 11 locales updated.

### Fixed
- **ESLint misconfiguration** — one-off migration scripts in `scripts/` were
  being linted as TypeScript modules, producing spurious `require()`/`__dirname`
  errors. `scripts/` is now excluded from the ESLint config.

## [0.7.0] - 2026-06-10

Keyboard shortcuts and embedded 2FA: navigate the app with your hands on
the keyboard and store authenticator codes directly inside login items.

### Added
- **Embedded TOTP inside login items** — any login entry can now carry an
  inline 2FA seed (otpauth:// URI). An "Add authenticator code" link appears
  below the Website field in the login editor. When a URI is entered, a live
  six-digit code with the familiar SVG countdown ring is shown immediately
  below the input — click the code to copy it to clipboard (auto-clear timer
  applies). The URI field can be cleared at any time to remove 2FA from the
  entry. All 11 locales updated.
- **Ctrl+F / Cmd+F — focus search** — pressing the standard find shortcut
  anywhere in the app jumps focus to the search bar and selects all text.
- **Ctrl+L / Cmd+L — lock vault** — pressing the standard lock shortcut
  anywhere in the app immediately locks the vault, clearing all secrets from
  renderer memory.
- **Escape — clear search** — pressing Escape while the search bar is focused
  clears the query and returns focus to the item list.

### Changed
- Refactored the TopBar `lock` handler to `useCallback` so it is stable
  across renders; the keyboard-shortcut effect now registers once rather than
  once per render.

## [0.6.0] - 2026-06-10

Custom fields: every vault item can now carry arbitrary label/value pairs.

### Added
- **Custom fields** — any vault item (login, secure note, card, identity, TOTP)
  can now have unlimited user-defined fields, each with a label and a value.
  Fields can be marked *secret* (value is masked and shown only on demand, like
  a password field) or plain text. A lock-icon toggle switches between the two
  modes at any time. Each field has a copy-to-clipboard button (respects the
  auto-clear timer) and a delete button. All 11 locales updated.

### Fixed
- **CHANGELOG comparison links** — URLs still pointed to the old repository name
  (`Noxisan/sas`); corrected to `Noxisan/SecretAccessService`.

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

[Unreleased]: https://github.com/Noxisan/SecretAccessService/compare/v0.20.0...HEAD
[0.20.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.18.1...v0.19.0
[0.18.1]: https://github.com/Noxisan/SecretAccessService/compare/v0.18.0...v0.18.1
[0.18.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Noxisan/SecretAccessService/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Noxisan/SecretAccessService/releases/tag/v0.1.0
