import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DayLog, Insights } from '../../shared/types'
import { api, errorMessage } from '../lib/api'
import { formatShort, isIsoDate, todayIso } from '../lib/dates'
import { useSearch } from '../router'
import { Calendar } from '../components/Calendar'
import { DayEditor } from '../components/DayEditor'
import { Shell } from '../components/Shell'

export function CalendarPage() {
  const today = todayIso()
  const search = useSearch()
  const requested = new URLSearchParams(search).get('date')
  const [days, setDays] = useState<DayLog[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [selected, setSelected] = useState(() => (isIsoDate(requested) ? requested : today))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [dayResult, insightResult] = await Promise.all([
        api<{ days: DayLog[] }>('/api/days'),
        api<{ insights: Insights }>(`/api/insights?today=${today}`),
      ])
      setDays(dayResult.days)
      setInsights(insightResult.insights)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught, 'We could not load your calendar.'))
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const next = new URLSearchParams(search).get('date')
    if (isIsoDate(next)) setSelected(next)
  }, [search])

  const select = (iso: string) => {
    setSelected(iso)
    window.history.replaceState({}, '', `/app/calendar?date=${iso}`)
  }

  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days])
  const bleedingDates = useMemo(() => new Set(days.filter((day) => day.bleeding).map((day) => day.date)), [days])
  const loggedDates = useMemo(() => new Set(days.map((day) => day.date)), [days])
  const predictedDates = useMemo(() => new Set(insights?.predictedPeriodDays ?? []), [insights])

  return (
    <Shell>
      <main className="dash">
        <div className="dash-head">
          <div>
            <p className="eyebrow">Calendar</p>
            <h1>Your month at a glance.</h1>
            <p className="dash-lede">
              Period days in rose, the days Sakhicycle expects outlined, and everything you have logged in between. Tap any
              day to add or edit it.
            </p>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="cal-layout">
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Month</h2>
                <p className="card-sub">{loading ? 'Loading your days…' : `${days.length} days logged`}</p>
              </div>
            </div>
            <Calendar
              bleedingDates={bleedingDates}
              predictedDates={predictedDates}
              loggedDates={loggedDates}
              selected={selected}
              onSelect={select}
            />
          </section>

          <div className="stack">
            <DayEditor
              date={selected}
              day={dayMap.get(selected)}
              onSaved={load}
              onToday={() => select(today)}
            />

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">What we expect</h2>
              </div>
              <div className="stats">
                <div className="stat">
                  <span>Next period</span>
                  <strong>{insights?.nextPeriodStart ? formatShort(insights.nextPeriodStart) : '—'}</strong>
                </div>
                <div className="stat">
                  <span>Fertile window</span>
                  <strong>
                    {insights?.fertileWindow
                      ? `${formatShort(insights.fertileWindow.start)} – ${formatShort(insights.fertileWindow.end)}`
                      : '—'}
                  </strong>
                </div>
                <div className="stat">
                  <span>Basis</span>
                  <strong>{insights?.source === 'logs' ? 'Your own cycles' : 'Default settings'}</strong>
                </div>
              </div>
              {insights?.note && <p className="note">{insights.note}</p>}
            </section>
          </div>
        </div>
      </main>
    </Shell>
  )
}
