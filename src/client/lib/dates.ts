const pad = (value: number) => String(value).padStart(2, '0')

export function isoOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayIso(): string {
  return isoOf(new Date())
}

export function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return isoOf(parseIso(value)) === value
}

export function addDays(iso: string, amount: number): string {
  const date = parseIso(iso)
  date.setDate(date.getDate() + amount)
  return isoOf(date)
}

export function daysBetween(from: string, to: string): number {
  const ms = parseIso(to).getTime() - parseIso(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function formatLong(iso: string): string {
  return parseIso(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatShort(iso: string): string {
  return parseIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export type MonthCell = { iso: string; inMonth: boolean; day: number }

/** Six weeks, Monday-first, covering the given month. */
export function buildMonth(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const cells: MonthCell[] = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    cells.push({ iso: isoOf(date), inMonth: date.getMonth() === month, day: date.getDate() })
  }
  return cells
}
