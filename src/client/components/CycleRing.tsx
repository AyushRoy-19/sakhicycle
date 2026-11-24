import { useEffect, useState } from 'react'
import type { Phase } from '../../shared/types'

const LABELS: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
  unknown: 'Not enough data',
}

export function CycleRing({
  cycleDay,
  cycleLength,
  phase,
  size = 170,
}: {
  cycleDay: number | null
  cycleLength: number
  phase: Phase
  size?: number
}) {
  const radius = size / 2 - 16
  const center = size / 2
  const strokeWidth = Math.max(8, size * 0.065)
  const circumference = 2 * Math.PI * radius
  const ratio = cycleDay ? Math.min(1, Math.max(0, cycleDay / Math.max(cycleLength, 1))) : 0
  const dash = ratio * circumference

  /* Draw the arc from empty so a change of day reads as movement rather than a jump. */
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(dash))
    return () => cancelAnimationFrame(frame)
  }, [dash])

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--ring-track)" strokeWidth={strokeWidth} />
        {ratio > 0 && (
          <circle
            className="ring-arc"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`var(--ring-${phase})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${drawn} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      <div className="ring-center">
        <div className="ring-day">{cycleDay ? `Day ${cycleDay}` : '—'}</div>
        <div className="ring-phase">{LABELS[phase]}</div>
      </div>
    </div>
  )
}
