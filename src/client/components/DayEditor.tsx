import { useEffect, useState, type ReactNode } from 'react'
import type { DayLog, Flow } from '../../shared/types'
import { MOODS, SYMPTOMS } from '../../shared/types'
import { api, errorMessage } from '../lib/api'
import { formatLong, todayIso } from '../lib/dates'

type Draft = {
  bleeding: boolean
  flow: Flow | null
  symptoms: string[]
  mood: string | null
  notes: string
}

const fromDay = (day: DayLog | undefined): Draft =>
  day
    ? {
        bleeding: day.bleeding,
        flow: day.flow,
        symptoms: day.symptoms,
        mood: day.mood,
        notes: day.notes ?? '',
      }
    : { bleeding: false, flow: null, symptoms: [], mood: null, notes: '' }

type DayEditorProps = {
  date: string
  day: DayLog | undefined
  onSaved: () => void | Promise<void>
  onToday?: () => void
  action?: ReactNode
}

export function DayEditor({ date, day, onSaved, onToday, action }: DayEditorProps) {
  const today = todayIso()
  const [draft, setDraft] = useState<Draft>(() => fromDay(day))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(fromDay(day))
  }, [date, day])

  useEffect(() => {
    setStatus(null)
    setError(null)
  }, [date])

  const toggleSymptom = (symptom: string) => {
    setDraft((current) => ({
      ...current,
      symptoms: current.symptoms.includes(symptom)
        ? current.symptoms.filter((item) => item !== symptom)
        : [...current.symptoms, symptom],
    }))
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    setError(null)
    try {
      await api(`/api/days/${date}`, {
        method: 'PUT',
        body: { ...draft, flow: draft.bleeding ? draft.flow : null },
      })
      await onSaved()
      const hasContent = draft.bleeding || draft.symptoms.length > 0 || draft.mood || draft.notes.trim()
      setStatus(hasContent ? 'Saved.' : 'Entry cleared.')
    } catch (caught) {
      setError(errorMessage(caught, "That didn't save. Try again?"))
    } finally {
      setSaving(false)
    }
  }

  const clearDay = async () => {
    setSaving(true)
    setError(null)
    try {
      await api(`/api/days/${date}`, { method: 'DELETE' })
      await onSaved()
      setStatus('Entry cleared.')
    } catch (caught) {
      setError(errorMessage(caught, "That didn't clear. Try again?"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">{date === today ? 'Today' : formatLong(date)}</h2>
          <p className="card-sub">
            {date === today ? 'Log what you notice, in ten seconds.' : 'Editing an earlier day.'}
          </p>
        </div>
        {onToday && date !== today ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onToday}>
            Back to today
          </button>
        ) : (
          action
        )}
      </div>

      <div className="field-row">
        <div className="segmented" role="group" aria-label="Bleeding">
          <button
            type="button"
            aria-pressed={draft.bleeding}
            onClick={() => setDraft((current) => ({ ...current, bleeding: true, flow: current.flow ?? 'medium' }))}
          >
            Period day
          </button>
          <button
            type="button"
            aria-pressed={!draft.bleeding}
            onClick={() => setDraft((current) => ({ ...current, bleeding: false, flow: null }))}
          >
            No bleeding
          </button>
        </div>

        {draft.bleeding && (
          <div className="chips">
            {(['light', 'medium', 'heavy'] as Flow[]).map((flow) => (
              <button
                key={flow}
                type="button"
                className="chip"
                aria-pressed={draft.flow === flow}
                onClick={() => setDraft((current) => ({ ...current, flow }))}
              >
                {flow[0].toUpperCase() + flow.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field-block">
        <p className="label">Symptoms</p>
        <div className="chips">
          {SYMPTOMS.map((symptom) => (
            <button
              key={symptom}
              type="button"
              className="chip"
              aria-pressed={draft.symptoms.includes(symptom)}
              onClick={() => toggleSymptom(symptom)}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>

      <div className="field-block">
        <p className="label">Mood</p>
        <div className="chips">
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              className="chip"
              aria-pressed={draft.mood === mood}
              onClick={() => setDraft((current) => ({ ...current, mood: current.mood === mood ? null : mood }))}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="input"
          value={draft.notes}
          maxLength={500}
          placeholder="Anything worth remembering: a late night, an exam, a new training plan…"
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save this day'}
        </button>
        {day && (
          <button type="button" className="btn btn-ghost" onClick={() => void clearDay()} disabled={saving}>
            Clear day
          </button>
        )}
        {status && <span className="saved-note">{status}</span>}
      </div>
    </section>
  )
}
