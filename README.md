<div align="center">

# S.A.S — Secret Access Service

**A cross-platform, offline-first, zero-knowledge password manager for Windows & Linux.**

![status](https://img.shields.io/badge/status-alpha-7c3aed)
![platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux-7c3aed)
![license](https://img.shields.io/badge/license-GPL--3.0-7c3aed)
![crypto](https://img.shields.io/badge/crypto-Argon2id%20%2B%20XChaCha20--Poly1305-16a34a)

</div>

> Your secrets are encrypted locally with state-of-the-art cryptography. Nothing
> leaves your machine unless you explicitly export it.

---

## 🔐 Security highlights

- **Zero-knowledge / local-first** — the master password and derived keys never leave the device and are never written to disk in plaintext.
- **Argon2id** key derivation (memory-hard; tunable params stored per-vault, calibrated to ~0.5–1.0 s on first run).
- **XChaCha20-Poly1305** authenticated encryption of the entire vault blob — decryption is rejected on any tag mismatch (never "best-effort").
- **Tamper-evident header** — KDF params, salt, and format version are authenticated as associated data.
- **Key isolation** — the derived key lives only in the Electron **main process** and is zeroed (`sodium_memzero`) on lock/quit. The renderer never sees the raw key.
- **Hardened Electron** — `contextIsolation`, `sandbox`, `nodeIntegration: false`, strict CSP, allow-listed `contextBridge`, every IPC payload validated with `zod`.
- **Auto-lock** on idle timeout and on OS sleep/lock; **clipboard auto-clear** (default 30 s).
- **No telemetry.** No remote code. No crash reporter shipping vault data.

See the [threat model](#-threat-model-summary) for scope and assumptions.

## ✨ Feature matrix

| Area | Status |
|---|---|
| Encrypted vault — logins & secure notes (create/edit/delete) | 🟢 working |
| Encrypted vault — cards & identities | 🟡 model in place, no editor yet |
| Create / recover vault (incl. forgotten-password reset) | 🟢 working |
| Categories · favorites · color tags | 🟡 favorites + color tags work; category management pending |
| Password generator (chars + passphrase) | 🟢 working |
| Global search | 🟡 title, username & URL |
| Auto-lock · clipboard auto-clear | 🟢 implemented |
| Built-in TOTP authenticator (RFC 6238) | ⚪ planned |
| Password health dashboard (`zxcvbn`) | ⚪ planned |
| Breach monitoring (HIBP k-anonymity) | ⚪ planned |
| Passkeys / FIDO2 storage | ⚪ planned |
| Secure import/export · entry history | ⚪ planned |
| Biometric / OS unlock (`safeStorage`) | ⚪ planned |

🟢 working · 🟡 in progress · ⚪ planned

## 🖥️ Screenshots

_Coming soon — left sidebar (categories, favorites, color dots) + narrow top bar (search, generator, health, lock)._

## 📦 Install

### Windows
- **Installer:** download `S.A.S-<version>-x64.exe` (NSIS) and run it.
- **Portable:** download `S.A.S-<version>-portable.exe` — no installation, runs in place.

### Linux
- **AppImage:** `chmod +x S.A.S-<version>-x86_64.AppImage && ./S.A.S-<version>-x86_64.AppImage`
- **Debian/Ubuntu:** `sudo apt install ./S.A.S-<version>-amd64.deb`

## 🛠️ Build from source

Requires **Node 20 LTS or newer**.

```bash
npm install        # install dependencies
npm run dev        # launch in development (electron-vite)
npm run build      # type-check + build to out/
npm run lint       # eslint
npm run typecheck  # tsc --noEmit (strict)
npm test           # vitest (crypto + vault unit tests)
npm run dist       # package installers/portables via electron-builder
```

## 🌍 Supported languages

English · Mandarin Chinese · Hindi · Spanish · French · Arabic · Bengali · Portuguese · Russian · Urdu · **German**.

Arabic and Urdu render right-to-left. The language is stored in app settings, never in the vault. (`en` and `de` are wired today; the remaining locale folders follow the same structure.)

## 🧭 Threat model summary

**Protects against:** theft of the vault file or disk image; offline brute-force (Argon2id); tampering with the encrypted vault or its header (AEAD); a hostile clipboard (auto-clear); shoulder-surfing of an unlocked session (auto-lock).

**Out of scope:** a compromised OS/kernel, a hardware keylogger, or malware running as the user while the vault is unlocked. A weak master password remains the weakest link — Argon2id raises the cost of guessing but cannot rescue a trivial password.

**Responsible disclosure:** please report security issues privately to the maintainer rather than opening a public issue.

## 🤝 Contributing

This repo uses **Gitflow** + **Conventional Commits** + **SemVer**. Branch features from `develop`, open PRs into `develop`, and keep `main` for tagged releases. Run `lint` + `typecheck` before every commit; crypto and IPC changes require unit tests.

## 📄 License

GPL-3.0-or-later.
