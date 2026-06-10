import { useMemo } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { zxcvbn } from '@zxcvbn-ts/core'

interface Props {
  password: string
}

const SCORE_LEVEL = ['veryWeak', 'weak', 'fair', 'strong', 'veryStrong'] as const
const SCORE_COLOR = [
  'var(--danger)',
  'var(--danger)',
  'var(--warning)',
  'var(--success)',
  'var(--accent)'
]

/** Inline zxcvbn-based strength bar for ItemEditor. Hidden when password is empty. */
export default function PasswordStrengthBar({ password }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const result = useMemo(() => (password ? zxcvbn(password) : null), [password])

  if (!result) return null

  const score = result.score as 0 | 1 | 2 | 3 | 4
  const level = SCORE_LEVEL[score]
  const color = SCORE_COLOR[score]
  const filled = score + 1

  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex h-1 flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((seg) => (
          <span
            key={seg}
            className="flex-1 rounded-full transition-colors"
            style={{ background: seg <= filled ? color : 'var(--border)' }}
          />
        ))}
      </div>
      <span className="w-20 shrink-0 text-right text-xs text-[var(--text-muted)]">
        {t(`generator.level.${level}`)}
      </span>
    </div>
  )
}
