import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CycleSettings, DayLog, Insights } from '../../shared/types'
import { api, errorMessage } from '../lib/api'
import { formatLong, formatShort, todayIso } from '../lib/dates'
import { Link } from '../router'
import { AccountCard } from '../components/AccountCard'
import { CycleRing } from '../components/CycleRing'
import { DayEditor } from '../components/DayEditor'
import { Shell } from '../components/Shell'
import { useAuth } from '../auth'

const PHASE_TEXT: Record<string, string> = {
  menstrual: 'Bleeding days. Rest more than usual and keep your kit close.',
  follicular: 'Energy usually climbs. A good week for sport and plans.',
  ovulation: 'Around ovulation. Some people notice a twinge on one side.',
  luteal: 'The wind-down before your period. Mood and sleep can shift.',
  unknown: 'Log a few days and your phase will appear here.',
}

export function Dashboard() {
  const { user } = useAuth()
  const today = todayIso()
  const [days, setDays] = useState<DayLog[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [settings, setSettings] = useState<CycleSettings>({ cycleLength: 28, periodLength: 5 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [dayResult, insightResult] = await Promise.all([
        api<{ days: DayLog[] }>('/api/days'),
        api<{ insights: Insights; settings: CycleSettings }>(`/api/insights?today=${today}`),
      ])
      setDays(dayResult.days)
      setInsights(insightResult.insights)
      setSettings(insightResult.settings)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught, 'Your tracker did not load. Try refreshing.'))
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    void load()
  }, [load])

  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days])
  const recent = useMemo(() => [...days].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6), [days])

  const saveSettings = async () => {
    setSettingsStatus(null)
    setError(null)
    try {
      const result = await api<{ settings: CycleSettings }>('/api/prefs', { method: 'PUT', body: settings })
      setSettings(result.settings)
      await load()
      setSettingsStatus('Saved. Predictions updated.')
    } catch (caught) {
      setError(errorMessage(caught, 'Those settings did not save. Mind trying again?'))
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name.split(' ')[0] ?? 'there'

  return (
    <Shell>
      <main className="dash">
        <div className="dash-head">
          <div>
            <p className="eyebrow">{formatLong(today)}</p>
            <h1>
              {greeting}, {firstName}.
            </h1>
            <p className="dash-lede">{insights ? PHASE_TEXT[insights.phase] : 'Loading your cycle…'}</p>
          </div>
          {insights?.daysUntilNextPeriod !== null && insights?.daysUntilNextPeriod !== undefined && (
            <div className="due-pill">
              <span>Next period</span>
              <strong>
                {insights.daysUntilNextPeriod === 0 ? 'Today' : `in ${insights.daysUntilNextPeriod} days`}
              </strong>
            </div>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!loading && days.length === 0 && (
          <div className="setup-banner">
            <div>
              <strong>Start with your last period.</strong>
              <p>Log today, or tap the day you last started in the calendar. Two cycles is all we need.</p>
            </div>
            <Link to="/app/calendar" className="btn btn-primary btn-sm">
              Open calendar
            </Link>
          </div>
        )}

        <div className="dash-grid">
          <div className="stack">
            <DayEditor
              date={today}
              day={dayMap.get(today)}
              onSaved={load}
              action={
                <Link to="/app/calendar" className="btn btn-ghost btn-sm">
                  Calendar
                </Link>
              }
            />
          </div>

          <div className="stack">
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Your cycle</h2>
                {insights?.source === 'settings' && <span className="tag">Default settings</span>}
              </div>

              <div className="ring-block">
                <CycleRing
                  cycleDay={insights?.cycleDay ?? null}
                  cycleLength={insights?.averageCycleLength ?? 28}
                  phase={insights?.phase ?? 'unknown'}
                />
              </div>

              <div className="stats">
                <div className="stat">
                  <span>Next period</span>
                  <strong>{insights?.nextPeriodStart ? formatShort(insights.nextPeriodStart) : '—'}</strong>
                </div>
                <div className="stat">
                  <span>Average cycle</span>
                  <strong>{insights ? `${insights.averageCycleLength} days` : '—'}</strong>
                </div>
                <div className="stat">
                  <span>Average period</span>
                  <strong>{insights ? `${insights.averagePeriodLength} days` : '—'}</strong>
                </div>
                <div className="stat">
                  <span>Last period</span>
                  <strong>{insights?.lastPeriodStart ? formatShort(insights.lastPeriodStart) : '—'}</strong>
                </div>
                <div className="stat">
                  <span>Fertile window</span>
                  <strong>
                    {insights?.fertileWindow
                      ? `${formatShort(insights.fertileWindow.start)} – ${formatShort(insights.fertileWindow.end)}`
                      : '—'}
                  </strong>
                </div>
              </div>

              {insights?.note && <p className="note">{insights.note}</p>}
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Your rhythm</h2>
              </div>
              <p className="card-sub" style={{ marginBottom: 14 }}>
                We use this until you have logged two cycles.
              </p>
              <div className="settings-grid">
                <div className="field">
                  <label className="label" htmlFor="cycle-length">
                    Cycle length
                  </label>
                  <input
                    id="cycle-length"
                    className="input"
                    type="number"
                    min={21}
                    max={45}
                    value={settings.cycleLength}
                    onChange={(event) => setSettings((current) => ({ ...current, cycleLength: Number(event.target.value) }))}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="period-length">
                    Period length
                  </label>
                  <input
                    id="period-length"
                    className="input"
                    type="number"
                    min={2}
                    max={10}
                    value={settings.periodLength}
                    onChange={(event) => setSettings((current) => ({ ...current, periodLength: Number(event.target.value) }))}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void saveSettings()}>
                  Save settings
                </button>
                {settingsStatus && <span className="saved-note">{settingsStatus}</span>}
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">What you&apos;ve logged</h2>
                <span className="card-sub">{days.length} logged</span>
              </div>
              {recent.length === 0 ? (
                <p className="card-sub">Nothing yet. The days you log will show up here.</p>
              ) : (
                <ul className="logs">
                  {recent.map((day) => (
                    <li key={day.date}>
                      <Link to={`/app/calendar?date=${day.date}`} className="log-item">
                        <span>
                          <strong>{formatShort(day.date)}</strong>
                          <span className="log-meta">
                            {' '}
                            ·{' '}
                            {day.bleeding
                              ? `${day.flow ?? 'medium'} flow`
                              : day.symptoms.length > 0
                                ? day.symptoms.slice(0, 2).join(', ')
                                : day.mood ?? 'Note'}
                          </span>
                        </span>
                        <span className="log-meta">{day.bleeding ? 'Period' : day.mood ?? 'Note'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <AccountCard />
          </div>
        </div>
      </main>
    </Shell>
  )
}
