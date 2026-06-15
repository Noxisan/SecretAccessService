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
| Encrypted vault — logins, secure notes, cards, identities, TOTP | Done |
| Categories, favorites & color dots — create, rename, reorder, delete | Done |
| Custom fields per entry (plain or masked) | Done |
| Duplicate entry in one click | Done |
| Password history per login (view & restore) | Done |
| Password generator — character & EFF-diceware passphrase modes (CSPRNG, settings persisted) | Done |
| Global search across all items and custom-field labels (never secret values) | Done |
| Settings — theme, accent, UI scale, language, auto-lock & clipboard timers, history limit, panic threshold | Done |
| Change master password (verified, immediate re-encryption) | Done |
| Item sort (name, modified, created, type) with remembered order | Done |
| Category item-count badges | Done |
| Auto-lock — on idle, OS sleep/lock, and optionally on minimize | Done |
| Clipboard auto-clear, with optional immediate clear on lock | Done |
| Built-in TOTP authenticator — live codes with countdown ring (otpauth URI or base32) | Done |
| Embedded 2FA — TOTP seed stored inside a login entry | Done |
| Password health dashboard — weak, reused, old & breached, with top-bar badge | Done |
| HaveIBeenPwned breach check — k-anonymity (only a 5-char SHA-1 prefix leaves the device) | Done |
| Encrypted backup export (.sasbak) with independent backup password | Done |
| Plaintext CSV export of logins (migrate out; clearly warned) | Done |
| Import — .sasbak (merge/replace), Bitwarden JSON, and CSV from Bitwarden, LastPass, Chrome, Firefox, KeePassXC & Dashlane | Done |
| Slide-in side panels (no modal dialogs) | Done |
| Collapsible, RTL-aware sidebar | Done |
| Keyboard shortcuts — Ctrl+F, Ctrl+L, Ctrl+S / Ctrl+Enter, Escape | Done |
| 11 UI translations with inline switcher (RTL for Arabic & Urdu) | Done |
| Panic lock / self-destruct after N failed attempts | Done |
| Passkey / FIDO2 / WebAuthn storage (reference entries) | Done |
| Quick unlock via OS keychain (DPAPI / libsecret) | Done |
| Travel mode — hide selected categories | Done |
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

Each release is tagged on `main` with pre-built Windows and Linux artifacts, published automatically via GitHub Actions on every tag push.

**Latest — [v0.35.0](https://github.com/Noxisan/SecretAccessService/releases/tag/v0.35.0)** (2026-06-11): application, taskbar, and system-tray icons, plus an option to minimize to the tray on window close.

Browse every version on the [Releases page](https://github.com/Noxisan/SecretAccessService/releases) · full history in [CHANGELOG.md](CHANGELOG.md).

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
