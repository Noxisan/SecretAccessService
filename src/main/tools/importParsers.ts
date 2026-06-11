import type { VaultItem, LoginItem, SecureNoteItem, CardItem, IdentityItem } from '../../shared/types.js'

/**
 * Best-effort title from a URL when the export has no name/title column
 * (e.g. Firefox, whose CSV is keyed only by `url`). Returns the bare hostname
 * so an imported row reads as "example.com" rather than "Imported item".
 */
function hostnameFromUrl(url: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    const stripped = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0]
    return stripped ?? ''
  }
}

/**
 * Parse a CSV export from another password manager. Column names are matched by
 * alias so the same parser handles Bitwarden, LastPass, Chrome/Edge, Firefox,
 * KeePass(XC), Dashlane, and generic exports. Returns login items only (the
 * universal CSV shape) for safety.
 */
export function parseCsv(csv: string): VaultItem[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const header = lines[0]?.split(',').map((h) => h.trim().toLowerCase().replace(/^"(.*)"$/, '$1')) ?? []

  const now = Date.now()

  const col = (row: string[], ...names: string[]): string => {
    for (const name of names) {
      const idx = header.indexOf(name)
      if (idx !== -1 && row[idx] !== undefined) return row[idx]?.replace(/^"(.*)"$/, '$1') ?? ''
    }
    return ''
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = ''
      } else {
        current += ch
      }
    }
    result.push(current)
    return result
  }

  const items: VaultItem[] = []
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const row = parseRow(line)
    const url = col(row, 'login_uri', 'url', 'uri', 'website', 'web site', 'login_uri_1')
    const title =
      col(row, 'name', 'title', 'label', 'account') || hostnameFromUrl(url) || 'Imported item'
    const username = col(row, 'login_username', 'username', 'user name', 'login name', 'login')
    const password = col(row, 'login_password', 'password', 'pass')
    const notes = col(row, 'notes', 'note', 'extra', 'comment', 'comments')
    const totp =
      col(row, 'login_totp', 'totp', 'otpauth', 'otp_secret', 'otpsecret', 'one time password') ||
      null

    const item: LoginItem = {
      id: crypto.randomUUID(),
      kind: 'login',
      title,
      categoryId: null,
      favorite: false,
      colorTag: null,
      createdAt: now,
      updatedAt: now,
      notes,
      customFields: [],
      username,
      password,
      url,
      totp,
      passwordHistory: []
    }
    items.push(item)
  }
  return items
}

/**
 * Returns true when the JSON string appears to be a Bitwarden vault export.
 * Checks for the presence of items with numeric `type` fields (1–4).
 */
export function isBitwardenJson(json: string): boolean {
  try {
    const obj = JSON.parse(json) as { items?: Array<{ type?: unknown }> }
    if (!Array.isArray(obj.items) || obj.items.length === 0) return false
    return obj.items.some((i) => typeof i.type === 'number' && i.type >= 1 && i.type <= 4)
  } catch {
    return false
  }
}

/**
 * Parse a Bitwarden JSON export (unencrypted).
 * Bitwarden item types: 1=Login, 2=SecureNote, 3=Card, 4=Identity.
 * Only unencrypted exports are supported — throws on encrypted=true.
 */
export function parseBitwardenJson(json: string): VaultItem[] {
  interface BwUri { uri?: string }
  interface BwLogin { username?: string; password?: string; uris?: BwUri[]; totp?: string | null }
  interface BwCard { cardholderName?: string; brand?: string; number?: string; expMonth?: string; expYear?: string; code?: string }
  interface BwIdentity { firstName?: string; lastName?: string; email?: string; phone?: string; address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string }
  interface BwField { name?: string; value?: string; type?: number }
  interface BwItem {
    type?: number
    name?: string
    notes?: string
    favorite?: boolean
    login?: BwLogin
    card?: BwCard
    identity?: BwIdentity
    fields?: BwField[]
  }
  interface BwExport { encrypted?: boolean; items?: BwItem[] }

  let parsed: BwExport
  try { parsed = JSON.parse(json) as BwExport } catch { return [] }
  if (parsed.encrypted === true) throw new Error('Bitwarden encrypted exports are not supported. Export without encryption first.')
  if (!Array.isArray(parsed.items)) return []

  const now = Date.now()
  const items: VaultItem[] = []

  for (const bw of parsed.items) {
    const base = {
      id: crypto.randomUUID(),
      title: bw.name || 'Imported item',
      categoryId: null as string | null,
      favorite: bw.favorite ?? false,
      colorTag: null as string | null,
      createdAt: now,
      updatedAt: now,
      notes: bw.notes ?? '',
      customFields: (bw.fields ?? [])
        .filter((f) => f.name)
        .map((f) => ({
          id: crypto.randomUUID(),
          label: f.name ?? '',
          value: f.value ?? '',
          secret: f.type === 1
        }))
    }

    switch (bw.type) {
      case 1: {
        const l = bw.login ?? {}
        const uri = l.uris?.[0]?.uri ?? ''
        items.push({
          ...base,
          kind: 'login',
          username: l.username ?? '',
          password: l.password ?? '',
          url: uri,
          totp: l.totp ?? null,
          passwordHistory: []
        } satisfies LoginItem)
        break
      }
      case 2:
        items.push({ ...base, kind: 'note' } satisfies SecureNoteItem)
        break
      case 3: {
        const c = bw.card ?? {}
        const expMonth = parseInt(c.expMonth ?? '1', 10)
        const expYear = parseInt(c.expYear ?? String(new Date().getFullYear()), 10)
        items.push({
          ...base,
          kind: 'card',
          cardholder: c.cardholderName ?? '',
          number: c.number ?? '',
          brand: c.brand ?? '',
          expMonth: isNaN(expMonth) ? 1 : Math.min(12, Math.max(1, expMonth)),
          expYear: isNaN(expYear) ? new Date().getFullYear() : expYear,
          cvv: c.code ?? ''
        } satisfies CardItem)
        break
      }
      case 4: {
        const id = bw.identity ?? {}
        const parts = [id.address1, id.address2, id.city, id.state, id.postalCode, id.country]
          .filter(Boolean).join(', ')
        items.push({
          ...base,
          kind: 'identity',
          firstName: id.firstName ?? '',
          lastName: id.lastName ?? '',
          email: id.email ?? '',
          phone: id.phone ?? '',
          address: parts
        } satisfies IdentityItem)
        break
      }
      default:
        // Unknown type — skip
    }
  }
  return items
}
