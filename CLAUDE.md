# CLAUDE.md — S.A.S (Secret Access Service)

> Guidance for Claude Code when working in this repository. Read this fully before making changes.

---

## 1. Project Overview

**S.A.S — Secret Access Service** is a cross-platform, offline-first, zero-knowledge **password manager** for **Windows** and **Linux**. The vault is encrypted locally with state-of-the-art cryptography; nothing leaves the machine unless the user explicitly exports it. The goal is a genuinely powerful, modern manager — not a toy.

**Core principles**
1. **Zero-knowledge / local-first** — the master password and derived keys never leave the device and are never written to disk in plaintext.
2. **Defense in depth** — assume the disk, the clipboard, and the renderer process are hostile.
3. **Auditable** — clean code, no obscure crypto, documented threat model.
4. **Calm UX** — security tools people actually want to use every day.

---

## 2. Tech Stack (authoritative — do not drift)

| Layer | Choice |
|---|---|
| Runtime | **Electron 42** |
| Language | **TypeScript 6** (`strict: true`, no implicit `any`) |
| UI | **React 19** |
| Build/dev | **electron-vite 5** (Vite 7) → output to `out/` |
| Packaging | **electron-builder 26** |
| └ Windows | `nsis` (installer) + `portable` |
| └ Linux | `AppImage` + `deb` |
| └ Mac | `dmg` |
| Node | **20 LTS or newer** |
| Styling | **Tailwind 4** + **CSS variables** for theming |
| Icons | **lucide-react** |

> Before adding any dependency, check for a peer-dependency conflict (Vite/Electron versions are sensitive). If a transitive pin is required, document **why** in a comment next to the dependency in `package.json`.

### Recommended supporting libraries (verify latest before installing)
- **Crypto:** `libsodium-wrappers-sumo` (Argon2id + XChaCha20-Poly1305) — see §3.
- **TOTP:** `otpauth` (RFC 6238).
- **State:** `zustand` (lightweight) or React context — avoid heavy global state.
- **Routing:** `react-router` (hash router; file-based routing doesn't apply in Electron renderer).
- **Forms/validation:** `zod` for all IPC payload validation.
- **i18n:** `i18next` + `react-i18next` (see §6).
- **Password strength:** `@zxcvbn-ts/core`.
- **Secure clipboard / autotype:** Electron `clipboard` with auto-clear timer.

---

## 3. Cryptography (the heart of the app — get this right)

This must be the highest practical standard. Do **not** invent crypto; use vetted primitives from libsodium.

**Key derivation (master password → key)**
- **Argon2id** (memory-hard, won the Password Hashing Competition; resistant to GPU/ASIC attacks).
- Tunable parameters stored per-vault in the header so they can be raised over time. Sensible 2026 desktop defaults: `memory ≥ 256 MiB`, `iterations ≥ 3`, `parallelism = 1`, calibrate at first run targeting ~0.5–1.0 s.
- Random 16-byte salt per vault.

**Vault encryption**
- **XChaCha20-Poly1305** AEAD (192-bit nonce → safe random nonces, no counter management; resistant to side-channel/timing issues on hardware without AES-NI). AES-256-GCM is an acceptable alternative; prefer XChaCha20-Poly1305 for new code.
- Encrypt the whole vault blob; never store individual fields unencrypted.
- Authenticated encryption only — reject on tag mismatch, never "best effort" decrypt.

**Key handling**
- Derived key held only in **main-process** memory, zeroed on lock/quit (`sodium_memzero`).
- The **renderer never sees the raw key**. All crypto happens in the main process; renderer requests decrypted items over IPC on demand.
- OS keychain integration for "remember this device" via Electron **`safeStorage`** (DPAPI on Windows, libsecret/kwallet on Linux). Never use `safeStorage` as the *only* protection — it wraps a session key, not the master.

**Vault file format** — versioned header (`{ formatVersion, kdf, kdfParams, salt, cipher, nonce }`) + ciphertext. Bump `formatVersion` on any format change and write a migration.

**Other**
- Auto-lock on idle timeout (configurable) and on system sleep/lock.
- Clipboard auto-clear (default 30 s, configurable).
- Constant-time comparison for any secret comparison.
- No telemetry. No crash reporter that ships vault data.

---

## 4. Electron Security (non-negotiable)

Follow the official Electron security checklist:
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- All main↔renderer communication via a **typed, allow-listed `contextBridge` preload** — no arbitrary `ipcRenderer` exposure.
- Validate every IPC payload with `zod` in the main process.
- Strict **Content-Security-Policy**; no remote code, no `eval`.
- `webSecurity: true`; block/`deny` all `window.open` and navigation to external origins (open in system browser instead).
- No loading remote URLs into a `BrowserWindow`.
- Keep Electron patched — treat Electron CVEs as release-blocking.

---

## 5. Architecture & Project Structure

```
sas/
├─ src/
│  ├─ main/            # Electron main process (crypto, vault I/O, IPC handlers)
│  │  ├─ crypto/       # KDF + AEAD wrappers (the ONLY place crypto lives)
│  │  ├─ vault/        # load/save/migrate vault file
│  │  ├─ ipc/          # typed, validated IPC handlers
│  │  └─ index.ts
│  ├─ preload/         # contextBridge API surface (allow-listed)
│  └─ renderer/        # React 19 app
│     ├─ components/   # reusable UI (Sidebar, TopBar, etc.)
│     ├─ features/     # vault, generator, settings, i18n…
│     ├─ store/        # zustand stores (NO secrets persisted)
│     ├─ styles/       # Tailwind + CSS variables (themes)
│     └─ locales/      # i18n JSON per language
├─ electron.vite.config.ts
├─ electron-builder.yml
└─ CLAUDE.md
```

**Hard rules**
- Crypto code lives **only** in `src/main/crypto`. Renderer must never import a crypto lib.
- Secrets must **never** be persisted in zustand/localStorage/sessionStorage or logged.
- All file paths and vault locations use Electron `app.getPath('userData')`.

---

## 6. Internationalization (i18n)

Built-in language switcher. Ship the **top 10 most-spoken world languages plus German**, using `i18next` + `react-i18next`. Locale files in `src/renderer/locales/<code>/translation.json`.

Target languages (verify the current "most spoken" list at implementation time and confirm with the user):
`en` English · `zh` Mandarin Chinese · `hi` Hindi · `es` Spanish · `fr` French · `ar` Arabic · `bn` Bengali · `pt` Portuguese · `ru` Russian · `ur` Urdu · **`de` German**.

- RTL support required for Arabic/Urdu (`dir="rtl"`, logical CSS properties).
- No hardcoded UI strings — everything through `t()`.
- Persist the chosen language in app settings (not the vault).

---

## 7. UI / Design Language

**Aesthetic:** flat, calm, minimal. No heavy shadows, no thick borders, no glossy effects. Corners only **slightly rounded (~6px radius)** — never pill-shaped or heavily rounded.

**Accent color:** **electric violet**. Define it as a CSS variable (e.g. `--accent: #7c3aed` / electric violet family) and theme everything from variables so light/dark themes and accent are swappable.

### Layout
- **Left Sidebar** — primary content navigation:
  - **Categories** the user can create, rename, reorder.
  - **Favorites** section.
  - **Color dot markers** — each category/entry can carry a small colored dot for visual grouping.
  - Collapsible.
- **Narrow Top Bar** — main app navigation / tools, e.g.:
  - Settings, Password Generator, global Search, vault Lock button, breach/health dashboard, language switcher, theme toggle.

Use **lucide-react** for all icons. Keep iconography consistent in stroke width and size.

### Theming
- All colors via CSS variables; Tailwind 4 reads from them.
- Light + dark themes; accent stays electric violet across both.
- Respect `prefers-color-scheme` on first run.

---

## 8. Feature Set (make it genuinely powerful)

**Core**
- Encrypted vault: logins, secure notes, credit cards, identities, files/attachments.
- Categories + favorites + color tags (mirrors the sidebar).
- Powerful, configurable **password generator** (length, character classes, exclude ambiguous, passphrase/diceware mode).
- Global fuzzy search across the vault.
- Auto-lock, clipboard auto-clear, idle timeout.

**Modern features to build toward**
- **Built-in TOTP authenticator** (RFC 6238) — store 2FA seeds and show live codes.
- **Passkeys / FIDO2 / WebAuthn** storage and management (the passwordless direction).
- **Password health dashboard** — weak, reused, old, and (offline-checkable) compromised passwords; `zxcvbn` strength scoring.
- **Breach monitoring** — HaveIBeenPwned **k-anonymity** range API (only a SHA-1 prefix leaves the device; never send full hashes or passwords).
- **Secure import/export** — encrypted backups; CSV/JSON import from common managers (clearly warn that plaintext import/export is dangerous).
- **Emergency access** — designate a trusted contact with a configurable wait period (design carefully for a local-first app).
- **Travel mode** — temporarily hide selected categories/vaults.
- **Biometric / OS unlock** via `safeStorage` + Windows Hello / polkit where available.
- **Self-destruct / panic lock** option after N failed attempts.
- **Custom fields** per entry; entry history (previous passwords).
- **Auto-type / quick copy** with auto-clearing clipboard.

> When adding any new feature, update the threat model notes and the README feature matrix.

---

## 9. Development Workflow

```bash
npm install            # install deps (Node 20+)
npm run dev            # electron-vite dev server
npm run build          # type-check + build to out/
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run dist           # electron-builder → installers/portables
```

- **TypeScript strict mode** stays on. Fix types, don't `// @ts-ignore`.
- Run `lint` + `typecheck` before every commit.
- Prefer small, focused modules; crypto and IPC get unit tests.

---

## 10. Git Workflow — Gitflow + Conventional Commits + SemVer

This repo uses **Gitflow** with **Conventional Commits** and **Semantic Versioning**.

### Identity (IMPORTANT)
All commits, tags, and releases must be authored as the repository owner — **never** attribute commits to Claude, and do **not** add "Co-Authored-By: Claude" or any AI signature/trailer. Use the owner's configured git name and email:

```bash
# verify the repo uses the owner's identity (already set globally per the user)
git config user.name
git config user.email
# if not set locally, set explicitly (replace with the owner's real values):
# git config user.name "Noxisan"
# git config user.email "<owner-email>"
```

### Remote (already provided)
```bash
git remote add origin https://github.com/Noxisan/SecretAccessService.git
```

### Branch model
| Branch | Purpose |
|---|---|
| `main` | production-ready, tagged releases only |
| `develop` | integration branch for finished work |
| `feature/*` | new features — branch from `develop`, merge back to `develop` |
| `bugfix/*` | non-urgent fixes — from `develop`, back to `develop` |
| `release/*` | release prep (version bump, changelog) — from `develop`, merge to `main` **and** `develop`, then tag |
| `hotfix/*` | urgent production fixes — from `main`, merge to `main` **and** `develop`, then tag |

### Conventional Commits
Format: `<type>(<scope>): <summary>`
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
Examples:
```
feat(generator): add diceware passphrase mode
fix(vault): reject decrypt on Poly1305 tag mismatch
docs(readme): add Linux AppImage install steps
```
SemVer mapping: `feat` → minor, `fix` → patch, `BREAKING CHANGE:` footer → major.

### Feature flow (use this every time a feature is built)
```bash
git checkout develop
git pull origin develop
git checkout -b feature/totp-authenticator

# ...work, committing with conventional messages...
git add -A
git commit -m "feat(totp): add RFC 6238 code generation"
git push -u origin feature/totp-authenticator

# when done, merge back to develop (no fast-forward keeps history readable)
git checkout develop
git merge --no-ff feature/totp-authenticator
git push origin develop
git branch -d feature/totp-authenticator
git push origin --delete feature/totp-authenticator
```

### Release flow
```bash
git checkout develop && git pull origin develop
git checkout -b release/1.2.0
# bump version in package.json, update CHANGELOG.md
git commit -am "chore(release): 1.2.0"
git checkout main && git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "S.A.S 1.2.0"
git push origin main --tags
git checkout develop && git merge --no-ff release/1.2.0
git push origin develop
git branch -d release/1.2.0
```

### Hotfix flow
```bash
git checkout main && git pull origin main
git checkout -b hotfix/1.2.1
git commit -am "fix(security): patch idle-timeout bypass"
git checkout main && git merge --no-ff hotfix/1.2.1
git tag -a v1.2.1 -m "S.A.S 1.2.1"
git push origin main --tags
git checkout develop && git merge --no-ff hotfix/1.2.1
git push origin develop
git branch -d hotfix/1.2.1
```

### GitHub Releases
Create a GitHub Release for each tag, attaching the built artifacts:
```bash
# requires: gh auth login (one-time, done by the owner)
gh release create v1.2.0 \
  --title "S.A.S 1.2.0" \
  --notes-file CHANGELOG_1.2.0.md \
  dist/*.exe dist/*.AppImage dist/*.deb
```
> Confirm with the owner before pushing tags or publishing a public release — these are visible, hard-to-undo actions.

### Initial push (first time)
```bash
git init
git add -A
git commit -m "chore: initial project scaffold"
git branch -M main
git remote add origin https://github.com/Noxisan/sas.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```

---

## 11. README

Maintain a polished `README.md` at the repo root containing:
- Project banner / name + one-line pitch.
- Badges (build, license, latest release, platforms).
- Security highlights (Argon2id, XChaCha20-Poly1305, zero-knowledge, local-first).
- Feature matrix.
- Screenshots (sidebar + topbar).
- Install instructions per platform (Windows NSIS/portable, Linux AppImage/deb).
- Build-from-source steps.
- Supported languages.
- Threat model summary + responsible-disclosure contact.
- Contributing + Gitflow note.
- License.

Keep the README in sync whenever a feature ships.

---

## 12. Things Claude Should NOT Do
- Do **not** roll custom crypto or weaken the parameters in §3.
- Do **not** expose secrets to the renderer, logs, localStorage, or telemetry.
- Do **not** attribute commits to Claude or add AI co-author trailers.
- Do **not** push tags, create releases, or publish public content without the owner's confirmation.
- Do **not** drift from the pinned stack versions without flagging the reason.
- Do **not** disable Electron security flags (`contextIsolation`, `sandbox`, CSP) for convenience.
