import { zxcvbn } from '@zxcvbn-ts/core'
import type { LoginItem } from '@shared/types'

export const WEAK_SCORE = 3
export const OLD_DAYS = 180

export type BreachMap = Map<string, number>

export interface HealthIssue {
  item: LoginItem
  reasons: Array<'weak' | 'reused' | 'old' | 'breached'>
}

export function analyzeVault(
  items: LoginItem[],
  breaches: BreachMap
): { issues: HealthIssue[]; totalLogins: number; safeCount: number } {
  const now = Date.now()
  const passwordCounts = new Map<string, number>()
  for (const item of items) {
    if (item.password) {
      passwordCounts.set(item.password, (passwordCounts.get(item.password) ?? 0) + 1)
    }
  }

  const issues: HealthIssue[] = []
  for (const item of items) {
    const reasons: Array<'weak' | 'reused' | 'old' | 'breached'> = []
    if (item.password) {
      if (zxcvbn(item.password).score < WEAK_SCORE) reasons.push('weak')
      if ((passwordCounts.get(item.password) ?? 0) > 1) reasons.push('reused')
      const count = breaches.get(item.id)
      if (count !== undefined && count > 0) reasons.push('breached')
    }
    const ageDays = (now - item.updatedAt) / (1000 * 60 * 60 * 24)
    if (ageDays > OLD_DAYS) reasons.push('old')
    if (reasons.length > 0) issues.push({ item, reasons })
  }

  return {
    issues,
    totalLogins: items.length,
    safeCount: items.length - issues.length
  }
}
