export type PublicUser = {
  id: string
  name: string
  email: string
  createdAt: string
  /* false for accounts created through Google, which have no password to confirm with */
  hasPassword: boolean
}

export type Flow = 'light' | 'medium' | 'heavy'

export type DayLog = {
  date: string
  bleeding: boolean
  flow: Flow | null
  symptoms: string[]
  mood: string | null
  notes: string | null
}

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'

export type Insights = {
  today: string
  cycleDay: number | null
  phase: Phase
  averageCycleLength: number | null
  averagePeriodLength: number | null
  lastPeriodStart: string | null
  nextPeriodStart: string | null
  daysUntilNextPeriod: number | null
  fertileWindow: { start: string; end: string } | null
  predictedPeriodDays: string[]
  loggedCycles: number
  source: 'logs' | 'settings'
  note: string | null
}

export type CycleSettings = {
  cycleLength: number
  periodLength: number
}

export type ArticleSection = {
  heading: string
  body: string
}

export type Article = {
  slug: string
  title: string
  summary: string
  readMinutes: number
  sections: ArticleSection[]
}

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  suggestions: string[]
  createdAt: string
}

export type AuthConfig = {
  googleEnabled: boolean
  passwordEnabled: boolean
}

export type ApiError = {
  error: string
}

export const SYMPTOMS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Tender breasts',
  'Fatigue',
  'Acne',
  'Back pain',
  'Nausea',
  'Food cravings',
  'Trouble sleeping',
] as const

export const MOODS = ['Bright', 'Calm', 'Tearful', 'Irritable', 'Anxious', 'Low', 'Energised'] as const
