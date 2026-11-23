import type { CycleSettings, DayLog, Insights, Phase } from '../shared/types'

const DAY_MS = 86_400_000

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, amount: number): string {
  return toIsoDate(new Date(Date.parse(`${iso}T00:00:00Z`) + amount * DAY_MS))
}

export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

type Run = { start: string; end: string; length: number }

/** Groups consecutive bleeding days into period runs. */
function toRuns(days: DayLog[]): Run[] {
  const dates = [...new Set(days.filter((day) => day.bleeding).map((day) => day.date))].sort()
  const runs: Run[] = []
  for (const date of dates) {
    const current = runs[runs.length - 1]
    if (current && diffDays(current.end, date) <= 1) {
      current.end = date
      current.length += 1
    } else {
      runs.push({ start: date, end: date, length: 1 })
    }
  }
  return runs
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

export function computeInsights(days: DayLog[], prefs: CycleSettings, today: string): Insights {
  const runs = toRuns(days)
  const starts = runs.map((run) => run.start)
  const gaps: number[] = []
  for (let i = 1; i < starts.length; i += 1) {
    const gap = diffDays(starts[i - 1], starts[i])
    if (gap >= 15 && gap <= 60) gaps.push(gap)
  }

  const observedCycle = mean(gaps.slice(-6))
  const observedPeriod = mean(runs.slice(-6).map((run) => run.length))

  const averageCycleLength = observedCycle ? clamp(observedCycle, 21, 45) : prefs.cycleLength
  const averagePeriodLength = observedPeriod ? clamp(observedPeriod, 2, 10) : prefs.periodLength
  const source: Insights['source'] = observedCycle ? 'logs' : 'settings'

  const lastRun = runs[runs.length - 1] ?? null

  if (!lastRun) {
    return {
      today,
      cycleDay: null,
      phase: 'unknown',
      averageCycleLength,
      averagePeriodLength,
      lastPeriodStart: null,
      nextPeriodStart: null,
      daysUntilNextPeriod: null,
      fertileWindow: null,
      predictedPeriodDays: [],
      loggedCycles: 0,
      source,
      note: 'Log the first day of your last period and Sakhicycle can start predicting your next one.',
    }
  }

  const rawCycleDay = diffDays(lastRun.start, today) + 1
  const cycleDay = rawCycleDay >= 1 ? rawCycleDay : null

  const ovulationOffset = averageCycleLength - 14
  let ovulation = addDays(lastRun.start, ovulationOffset)
  if (diffDays(ovulation, today) > 4) ovulation = addDays(ovulation, averageCycleLength)

  const fertileWindow = { start: addDays(ovulation, -4), end: addDays(ovulation, 1) }

  let phase: Phase = 'unknown'
  if (today >= lastRun.start && today <= lastRun.end) phase = 'menstrual'
  else if (cycleDay === null) phase = 'unknown'
  else if (Math.abs(cycleDay - ovulationOffset) <= 1) phase = 'ovulation'
  else if (cycleDay < ovulationOffset) phase = 'follicular'
  else phase = 'luteal'

  let nextPeriodStart = addDays(lastRun.start, averageCycleLength)
  while (diffDays(today, nextPeriodStart) < 0) nextPeriodStart = addDays(nextPeriodStart, averageCycleLength)

  const predictedPeriodDays: string[] = []
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const start = addDays(nextPeriodStart, cycle * averageCycleLength)
    for (let day = 0; day < averagePeriodLength; day += 1) predictedPeriodDays.push(addDays(start, day))
  }

  const daysUntilNextPeriod = diffDays(today, nextPeriodStart)

  let note: string | null = null
  if (!observedCycle) {
    note = 'Predictions use your default cycle settings until you log two periods.'
  } else if (gaps.length && (gaps[gaps.length - 1] > 45 || gaps[gaps.length - 1] < 21)) {
    note = 'Your last cycle was outside the usual 21 to 45 day range. That can be normal, but it is worth mentioning to a doctor if it keeps happening.'
  }

  return {
    today,
    cycleDay,
    phase,
    averageCycleLength,
    averagePeriodLength,
    lastPeriodStart: lastRun.start,
    nextPeriodStart,
    daysUntilNextPeriod,
    fertileWindow,
    predictedPeriodDays,
    loggedCycles: runs.length,
    source,
    note,
  }
}
