import { z } from 'zod'

/**
 * zod schemas for every IPC payload (CLAUDE.md §4). The main process validates
 * untrusted renderer input here before it reaches the vault/crypto layer.
 */

const colorTag = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb').nullable()

export const masterPasswordSchema = z.object({
  masterPassword: z.string().min(1).max(1024)
})

export const customFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().max(200),
  value: z.string().max(20000),
  secret: z.boolean()
})

const itemBaseShape = {
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  categoryId: z.string().min(1).nullable(),
  favorite: z.boolean(),
  colorTag,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  notes: z.string().max(100000),
  customFields: z.array(customFieldSchema).max(100)
}

export const loginItemSchema = z.object({
  ...itemBaseShape,
  kind: z.literal('login'),
  username: z.string().max(1000),
  password: z.string().max(10000),
  url: z.string().max(4000),
  totp: z.string().max(4000).nullable(),
  passwordHistory: z
    .array(z.object({ password: z.string().max(10000), replacedAt: z.number().int() }))
    .max(200)
})

export const noteItemSchema = z.object({
  ...itemBaseShape,
  kind: z.literal('note')
})

export const cardItemSchema = z.object({
  ...itemBaseShape,
  kind: z.literal('card'),
  cardholder: z.string().max(200),
  number: z.string().max(40),
  brand: z.string().max(40),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(1900).max(3000),
  cvv: z.string().max(8)
})

export const identityItemSchema = z.object({
  ...itemBaseShape,
  kind: z.literal('identity'),
  firstName: z.string().max(200),
  lastName: z.string().max(200),
  email: z.string().max(400),
  phone: z.string().max(80),
  address: z.string().max(2000)
})

export const totpItemSchema = z.object({
  ...itemBaseShape,
  kind: z.literal('totp'),
  uri: z.string().max(4000),
  issuer: z.string().max(400),
  account: z.string().max(400)
})

export const passkeyItemSchema = z.object({
  ...itemBaseShape,
  kind: z.literal('passkey'),
  rpId: z.string().max(500),
  rpName: z.string().max(500),
  userName: z.string().max(500),
  displayName: z.string().max(500),
  credentialId: z.string().max(4000)
})

export const vaultItemSchema = z.discriminatedUnion('kind', [
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  identityItemSchema,
  totpItemSchema,
  passkeyItemSchema
])

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  colorTag,
  order: z.number().int()
})

export const idSchema = z.object({ id: z.string().min(1) })

export const generatePasswordSchema = z.object({
  length: z.number().int().min(4).max(256),
  uppercase: z.boolean(),
  lowercase: z.boolean(),
  digits: z.boolean(),
  symbols: z.boolean(),
  excludeAmbiguous: z.boolean(),
  mode: z.enum(['characters', 'passphrase']),
  words: z.number().int().min(3).max(20).optional(),
  separator: z.string().max(4).optional()
})

export const clipboardCopySchema = z.object({
  text: z.string().max(50000),
  clearSeconds: z.number().int().min(0).max(600).optional()
})

export const breachCheckSchema = z.object({
  password: z.string().min(1).max(10000)
})

export const settingsSchema = z.object({
  language: z.string().min(2).max(10),
  theme: z.enum(['light', 'dark', 'system']),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  autoLockMinutes: z.number().int().min(0).max(1440),
  clipboardClearSeconds: z.number().int().min(0).max(600),
  maxFailedAttempts: z.number().int().min(0).max(100),
  travelHiddenCategoryIds: z.array(z.string()).max(500),
  generatorDefaults: generatePasswordSchema.optional()
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(1).max(1024)
})

export const exportSchema = z.object({
  password: z.string().min(1).max(1024)
})

export const importSchema = z.object({
  /** Absolute path to the file to import. */
  filePath: z.string().min(1),
  /** Required for .sasbak encrypted backups; unused for CSV. */
  password: z.string().max(1024).optional(),
  /** How to handle conflicts: 'merge' keeps existing and adds new; 'replace' overwrites all. */
  mode: z.enum(['merge', 'replace']).default('merge')
})

export type GeneratePasswordInput = z.infer<typeof generatePasswordSchema>
export type ImportInput = z.infer<typeof importSchema>
