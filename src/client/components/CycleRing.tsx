import type { Phase } from '../../shared/types'

const COLORS: Record<Phase, string> = {
  menstrual: '#b4234c',
  follicular: '#d07d92',
  ovulation: '#a4566e',
  luteal: '#8a6b77',
  unknown: '#d9c3ca',
}

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
  const circumference = 2 * Math.PI * radius
  const ratio = cycleDay ? Math.min(1, Math.max(0, cycleDay / Math.max(cycleLength, 1))) : 0

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--ring-track)" strokeWidth="11" />
        {ratio > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={COLORS[phase]}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${ratio * circumference} ${circumference}`}
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
