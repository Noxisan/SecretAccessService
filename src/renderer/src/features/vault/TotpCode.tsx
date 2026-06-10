import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import * as OTPAuth from 'otpauth'

interface Props {
  uri: string
  onCopy?: (code: string) => void
}

interface TotpState {
  code: string
  secondsLeft: number
  period: number
}

function compute(totp: OTPAuth.TOTP): TotpState {
  const now = Date.now()
  const period = totp.period
  const secondsLeft = period - Math.floor((now / 1000) % period)
  const code = totp.generate()
  return { code, secondsLeft, period }
}

/**
 * Renders a live TOTP code with a radial countdown ring.
 * Refreshes every second; re-generates the code when the period rolls over.
 * Returns null silently if the URI is invalid (bad QR scan etc.).
 */
export default function TotpCode({ uri, onCopy }: Props): JSX.Element | null {
  const [state, setState] = useState<TotpState | null>(null)

  useEffect(() => {
    let totp: OTPAuth.TOTP | null = null
    try {
      const parsed = OTPAuth.URI.parse(uri)
      if (!(parsed instanceof OTPAuth.TOTP)) return
      totp = parsed
    } catch {
      return
    }

    const update = (): void => {
      if (totp) setState(compute(totp))
    }

    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [uri])

  if (!state) return null

  const { code, secondsLeft, period } = state
  const progress = secondsLeft / period
  const urgent = secondsLeft <= 5

  // SVG ring: r=8, circumference ≈ 50.3
  const r = 8
  const circ = 2 * Math.PI * r
  const dash = circ * progress

  return (
    <div className="flex items-center gap-1.5">
      {/* Countdown ring */}
      <svg width="20" height="20" className="shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--border)" strokeWidth="2" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={urgent ? 'var(--danger)' : 'var(--accent)'}
          strokeWidth="2"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
          style={{ transition: 'stroke-dasharray 0.8s linear' }}
        />
      </svg>

      {/* Code */}
      <button
        onClick={() => onCopy?.(code)}
        className={`font-mono text-sm tracking-widest transition-colors ${
          urgent ? 'text-[var(--danger)]' : 'text-[var(--text)]'
        } hover:text-[var(--accent)]`}
        title={`${secondsLeft}s`}
        aria-label={`TOTP code: ${code}, ${secondsLeft} seconds remaining`}
      >
        {code.slice(0, 3)} {code.slice(3)}
      </button>
    </div>
  )
}
