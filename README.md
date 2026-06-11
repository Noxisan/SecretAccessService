<div align="center">

<img src="readme_logo.png" alt="S.A.S — Secret Access Service" width="360" />

# S.A.S — Secret Access Service

**A cross-platform, offline-first, zero-knowledge password manager for Windows and Linux.**

[![Latest release](https://img.shields.io/github/v/tag/Noxisan/SecretAccessService?label=release&color=7c3aed)](https://github.com/Noxisan/SecretAccessService/releases/latest)
[![CI](https://github.com/Noxisan/SecretAccessService/actions/workflows/ci.yml/badge.svg)](https://github.com/Noxisan/SecretAccessService/actions/workflows/ci.yml)
![Status](https://img.shields.io/badge/status-alpha-7c3aed)
![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux-7c3aed)
![License](https://img.shields.io/badge/license-GPL--3.0-7c3aed)
![Crypto](https://img.shields.io/badge/crypto-Argon2id%20%2B%20XChaCha20--Poly1305-16a34a)

</div>

> Your secrets are encrypted locally with state-of-the-art cryptography.
> Nothing leaves your machine unless you explicitly export it.

---

## Download

Download the latest build from the **[Releases](https://github.com/Noxisan/SecretAccessService/releases/latest)** page.

| Platform | Artifact | Notes |
|---|---|---|
| Windows | `S.A.S-<version>-x64.exe` | NSIS installer (recommended) |
| Windows | `S.A.S-<version>-portable.exe` | No install required; runs in place |
| Linux | `S.A.S-<version>-x86_64.AppImage` | `chmod +x` then run directly |
| Linux | `S.A.S-<version>-amd64.deb` | `sudo apt install ./<file>.deb` |
| Source | `Source code (zip / tar.gz)` | Auto-attached to every release; or [build from source](#build-from-source) |

Prefer to build it yourself? See [Build from source](#build-from-source). For
past versions and what changed, see the [release history](#releases) below or
the full [CHANGELOG](CHANGELOG.md).

---

## Security highlights

- **Zero-knowledge / local-first** — the master password and derived keys never leave the device and are never written to disk in plaintext.
- **Argon2id** key derivation — memory-hard, GPU/ASIC-resistant, won the Password Hashing Competition. Parameters are stored per-vault and calibrated to ~0.5–1.0 s on first run.
- **XChaCha20-Poly1305** authenticated encryption of the entire vault blob — a 192-bit random nonce on every write, authenticated decryption that rejects any tag mismatch. The KDF parameters, salt, and format version are authenticated as associated data (tamper-evident header).
- **Key isolation** — the derived key lives only in the Electron main process and is zeroed (`sodium_memzero`) on lock and quit. The renderer never receives the raw key; it requests decrypted item data on demand over a typed, validated IPC bridge.
- **Hardened Electron shell** — `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict Content-Security-Policy, allow-listed `contextBridge` preload, every IPC payload validated with `zod`.
- **Auto-lock** on idle timeout and on OS sleep/lock-screen events.
- **Clipboard auto-clear** — copied secrets are cleared from the clipboard after a configurable delay (default 30 s).
- **Panic lock** — after a configurable number of consecutive wrong master-password attempts (default 10, configurable in Settings, 0 = disabled), the vault file is permanently deleted from disk as a last-resort defense against automated brute-force.
- **No telemetry.** No remote code. No crash reporter that touches vault data.

See [Threat model](#threat-model) below for scope and assumptions.

---

## Feature matrix

| Feature | Status |
|---|---|
| Encrypted vault: logins, secure notes, credit cards, identities, TOTP authenticators | Done |
| Categories, favorites, and color-dot markers — create, rename, delete | Done |
| Custom fields per entry (plain text or masked secret) | Done |
| Duplicate entry — clone any item in one click from the editor | Done |
| Password history per login (view previous passwords; one-click restore) | Done |
| Password generator — character mode (length, classes, exclude-ambiguous) and passphrase mode using the full 7776-word EFF diceware list (~12.9 bits per word); CSPRNG with rejection sampling for unbiased selection; settings persist across sessions | Done |
| Global fuzzy search across all item types | Done |
| Settings: theme (light/dark/system), accent color, language, auto-lock timer, clipboard-clear timer, panic-lock threshold | Done |
| Change master password with current-password verification and immediate vault re-encryption | Done |
| Item list sort (A→Z, Z→A, recently modified, oldest first, by type) | Done |
| Category item-count badges in sidebar | Done |
| Auto-lock on idle + OS sleep/lock-screen | Done |
| Clipboard auto-clear | Done |
| Built-in TOTP authenticator — standalone TOTP items with live codes and SVG countdown ring | Done |
| Embedded 2FA — TOTP seed stored directly inside a login entry; live code visible in the editor | Done |
| Password health dashboard — flags weak, reused, old (>180 days), and breached passwords; top-bar badge shows issue count at a glance | Done |
| HaveIBeenPwned breach check — k-anonymity range API; only the first 5 hex chars of the SHA-1 hash leave the process | Done |
| Encrypted vault export (.sasbak) with independent Argon2id + XChaCha20-Poly1305 backup password | Done |
| CSV import — Bitwarden, LastPass, and generic exports | Done |
| Bitwarden JSON import — all four item types, custom fields, TOTP seeds | Done |
| .sasbak encrypted import with merge or replace mode | Done |
| Collapsible sidebar | Done |
| Keyboard shortcuts: Ctrl+F (search), Ctrl+L (lock), Escape (clear/dismiss) | Done |
| 11 UI translations — all languages fully loaded | Done |
| Panic lock / self-destruct after N failed unlock attempts | Done |
| Passkeys / FIDO2 / WebAuthn storage — record credentials as reference entries | Done |
| Quick unlock — save master password to OS keychain (DPAPI / libsecret); unlock with one click | Done |
| Travel mode — hide selected categories and their items with a single toggle | Done |
| Emergency access with configurable wait period | Planned |
| Auto-type / global hotkey | Planned |

---

## Screenshots

_Coming soon — sidebar (categories, favorites, color dots) + top bar (search, generator, health dashboard, settings, lock)._

---

## Build from source

Requires **Node.js 20 LTS** or newer.

```bash
git clone https://github.com/Noxisan/SecretAccessService.git
cd SecretAccessService
npm install

npm run dev        # Launch in development mode (hot-reload)
npm run build      # Type-check + build to out/
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (strict mode)
npm test           # Run unit tests (Vitest)
npm run dist       # Package installers via electron-builder

# Platform-specific builds:
npm run dist -- --win    # Windows NSIS installer + portable
npm run dist -- --linux  # Linux AppImage + .deb
```

The build output lands in `dist/`. Packaging for a target platform requires running the build on that platform (or via CI on the matching OS runner).

---

## Supported languages

English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, Urdu, German.

Arabic and Urdu render right-to-left automatically. The selected language is stored in app settings (not inside the vault) and applies immediately without restarting.

---

## Releases

Each release is tagged on `main` and includes pre-built artifacts for Windows and Linux. Automated release notes and artifacts are published via GitHub Actions on every tag push.

| Version | Date | Highlights |
|---|---|---|
| [0.22.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.22.0) | 2026-06-11 | Reorder sidebar categories with up/down controls; tests for the reorder and settings-persistence logic |
| [0.21.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.21.0) | 2026-06-11 | Inline top-bar language switcher (all 11 languages, RTL-aware); vault format/migration test coverage; CI/release builds on Node 22 LTS |
| [0.20.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.20.0) | 2026-06-11 | Passphrase generator upgraded to the full 7776-word EFF diceware list (~12.9 bits/word); added the GPL-3.0 LICENSE file |
| [0.19.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.19.0) | 2026-06-11 | Open a login's website in the system browser (http/https only); internal extraction of TOTP, search, and breach logic into unit-tested modules |
| [0.18.1](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.18.1) | 2026-06-10 | Fix: ItemList white-screen / infinite render loop from an unstable store selector |
| [0.18.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.18.0) | 2026-06-10 | Health issue badge on top bar — weak, reused, and old passwords shown at a glance |
| [0.17.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.17.0) | 2026-06-10 | Persistent generator settings — mode, length, and options restored on every open |
| [0.16.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.16.0) | 2026-06-10 | Import parsers extracted; test suite grows from 40 to 75 tests |
| [0.15.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.15.0) | 2026-06-10 | Duplicate entry button in item editor |
| [0.14.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.14.0) | 2026-06-10 | Bitwarden JSON import — all four item types, custom fields, TOTP seeds |
| [0.13.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.13.0) | 2026-06-10 | Passkey storage; full i18n coverage for travel mode, panic lock, and breach check |
| [0.12.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.12.0) | 2026-06-10 | Quick unlock via OS keychain — unlock with saved credentials |
| [0.11.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.11.0) | 2026-06-10 | Item sort options and category item-count badges |
| [0.10.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.10.0) | 2026-06-10 | Change master password with current-password verification and immediate re-encryption |
| [0.9.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.9.0) | 2026-06-10 | Travel mode — hide selected categories and their items on demand |
| [0.8.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.8.0) | 2026-06-10 | Panic lock — vault self-destruct after N failed attempts |
| [0.7.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.7.0) | 2026-06-10 | Embedded TOTP in login items; Ctrl+F / Ctrl+L keyboard shortcuts |
| [0.6.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.6.0) | 2026-06-10 | Custom fields per entry |
| [0.5.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.5.0) | 2026-06-10 | Collapsible sidebar; idle auto-lock heartbeat; password history viewer |
| [0.4.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.4.0) | 2026-06-10 | Encrypted export (.sasbak); CSV import; merge / replace import modes |
| [0.3.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.3.0) | 2026-06-10 | Full editor for all 5 item types; health dashboard; HIBP breach check; all 11 locales |
| [0.2.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.2.0) | 2026-06-09 | Password generator; item create/edit/delete; vault reset escape hatch |
| [0.1.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.1.0) | 2026-06-09 | Initial project scaffold: cryptography core, hardened Electron shell, i18n scaffolding |

Full changelog: [CHANGELOG.md](CHANGELOG.md)

---

## Threat model

**S.A.S protects against:**

- Theft of the vault file or full disk image — the ciphertext is useless without the master password, and cracking Argon2id is prohibitively expensive for any reasonable password.
- Offline brute-force — Argon2id parameters are tuned to take ~0.5–1.0 s per attempt on desktop hardware, making automated guessing slow. The panic-lock feature adds an upper bound on attempts against an unattended device.
- Tampering with the encrypted vault or its header — XChaCha20-Poly1305 authenticates all data including the KDF parameters; any modification is detected and rejected at open time.
- Clipboard-based credential theft — secrets copied to clipboard are cleared after a configurable timer.
- Shoulder-surfing of an open session — auto-lock on idle and on OS sleep/lock-screen.
- Automated brute-force against an unattended unlocked device — panic lock deletes the vault file after a configurable number of failed attempts.

**Out of scope:**

- A compromised OS kernel, or malware running as the same user while the vault is unlocked. At that point the attacker can read process memory directly; no password manager can protect against this.
- A hardware keylogger recording the master password at entry time.
- A weak master password. Argon2id raises the cost of guessing substantially, but a trivial password remains the weakest link.

**Responsible disclosure:** please report security vulnerabilities privately to the maintainer rather than opening a public issue.

---

## Contributing

This repository uses **Gitflow** with **Conventional Commits** and **Semantic Versioning**:

- Features branch from `develop` via `feature/*`, merge back to `develop`.
- Releases cut from `develop` via `release/*`, merge to `main` (tagged) and back-merged to `develop`.
- Hotfixes branch from `main` via `hotfix/*`, merge to both `main` and `develop`.
- Run `lint` and `typecheck` before every commit. Crypto and IPC changes require unit tests.

Commit format: `<type>(<scope>): <summary>` — e.g. `feat(vault): add emergency access`.

---

## License

Licensed under the **GNU General Public License v3.0 or later** (GPL-3.0-or-later).
The full text is in [LICENSE](LICENSE). In short: you may use, study, share, and
modify this software, provided derivative works are distributed under the same
license and with source available.
