import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { addDays, buildMonth, monthLabel, parseIso, todayIso } from '../lib/dates'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type CalendarProps = {
  bleedingDates: Set<string>
  predictedDates: Set<string>
  loggedDates: Set<string>
  selected: string
  onSelect: (iso: string) => void
}

const monthOf = (iso: string) => {
  const date = parseIso(iso)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function Calendar({ bleedingDates, predictedDates, loggedDates, selected, onSelect }: CalendarProps) {
  const today = todayIso()
  const [cursor, setCursor] = useState(() => monthOf(selected || today))
  const cells = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor])

  // Follow the selected day when it is opened from elsewhere (e.g. Recent days).
  useEffect(() => {
    if (!selected) return
    const target = monthOf(selected)
    setCursor((current) => (current.year === target.year && current.month === target.month ? current : target))
  }, [selected])

  const move = (delta: number) => {
    const date = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
  }

  /* Arrow keys walk the month so the grid works without hunting for the mouse. */
  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (event.key in steps) {
      event.preventDefault()
      onSelect(addDays(selected || today, steps[event.key]))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onSelect(today)
    }
  }

  return (
    <div>
      <div className="cal-head">
        <div className="cal-title">{monthLabel(cursor.year, cursor.month)}</div>
        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => move(-1)} aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M9 2 4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="icon-btn" onClick={() => move(1)} aria-label="Next month">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M5 2l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="cal-dow" aria-hidden="true">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="cal-grid" onKeyDown={onGridKeyDown}>
        {cells.map((cell) => {
          const classes = ['cal-cell']
          if (!cell.inMonth) classes.push('is-out')
          if (cell.iso === today) classes.push('is-today')
          if (predictedDates.has(cell.iso) && !bleedingDates.has(cell.iso)) classes.push('is-predicted')
          if (bleedingDates.has(cell.iso)) classes.push('is-bleeding')
          if (cell.iso === selected) classes.push('is-selected')

          return (
            <button
              key={cell.iso}
              type="button"
              className={classes.join(' ')}
              onClick={() => onSelect(cell.iso)}
              aria-pressed={cell.iso === selected}
              aria-label={cell.iso}
            >
              {cell.day}
              {loggedDates.has(cell.iso) && !bleedingDates.has(cell.iso) && <span className="cal-dot" />}
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        <span className="cal-key">
          <i className="key-swatch key-period" /> Period
        </span>
        <span className="cal-key">
          <i className="key-swatch key-predicted" /> Predicted
        </span>
        <span className="cal-key">
          <i className="key-swatch key-logged" /> Logged
        </span>
      </div>
    </div>
  )
}
