import type { ChatMessage, CycleSettings, DayLog, Flow, PublicUser } from '../shared/types'
import type { Env } from './env'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  google_sub TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_google_sub ON users (google_sub);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
CREATE TABLE IF NOT EXISTS day_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  bleeding INTEGER NOT NULL DEFAULT 0,
  flow TEXT,
  symptoms TEXT NOT NULL DEFAULT '[]',
  mood TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, date)
);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  suggestions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user ON chats (user_id, created_at);
CREATE TABLE IF NOT EXISTS prefs (
  user_id TEXT PRIMARY KEY,
  cycle_length INTEGER NOT NULL DEFAULT 28,
  period_length INTEGER NOT NULL DEFAULT 5
);
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS guests_expiry ON guests (expires_at);
CREATE TABLE IF NOT EXISTS guest_chats (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  suggestions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS guest_chats_by_guest ON guest_chats (guest_id, created_at);
`

let schemaPromise: Promise<void> | null = null

/** Creates tables on first use so a fresh database works without a manual migration step. */
export function ensureSchema(env: Env): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = env.DB.exec(SCHEMA.replace(/\n/g, ' '))
      .then(() => undefined)
      .catch((error) => {
        schemaPromise = null
        throw error
      })
  }
  return schemaPromise
}

type UserRow = {
  id: string
  email: string
  name: string
  password_hash: string | null
  google_sub: string | null
  created_at: string
}

const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
  hasPassword: Boolean(row.password_hash),
})

export async function findUserByEmail(env: Env, email: string) {
  return env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email.toLowerCase()).first<UserRow>()
}

export async function findUserById(env: Env, id: string) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<UserRow>()
}

export async function findUserByGoogleSub(env: Env, sub: string) {
  return env.DB.prepare('SELECT * FROM users WHERE google_sub = ?1').bind(sub).first<UserRow>()
}

export async function createUser(
  env: Env,
  input: { email: string; name: string; passwordHash?: string | null; googleSub?: string | null },
) {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, password_hash, google_sub, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
  )
    .bind(id, input.email.toLowerCase(), input.name, input.passwordHash ?? null, input.googleSub ?? null, createdAt)
    .run()
  return {
    id,
    email: input.email.toLowerCase(),
    name: input.name,
    createdAt,
    hasPassword: Boolean(input.passwordHash),
  } satisfies PublicUser
}

/** Removes the account and everything attached to it, in one transaction. */
export async function deleteUserData(env: Env, userId: string) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM chats WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM day_logs WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM prefs WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(userId),
  ])
}

export async function attachGoogleSub(env: Env, userId: string, sub: string) {
  await env.DB.prepare('UPDATE users SET google_sub = ?1 WHERE id = ?2').bind(sub, userId).run()
}

export async function updateUserName(env: Env, userId: string, name: string) {
  await env.DB.prepare('UPDATE users SET name = ?1 WHERE id = ?2').bind(name, userId).run()
}

export type SignupStats = {
  total: number
  last24h: number
  last7d: number
  last30d: number
  daily: Array<{ day: string; count: number }>
  recent: Array<{ name: string; email: string; createdAt: string; method: 'google' | 'password' }>
}

function countOf(result: D1Result<unknown> | undefined): number {
  const row = result?.results?.[0] as { n?: number } | undefined
  return Number(row?.n ?? 0)
}

/** Aggregate signup numbers for the owner dashboard, counted from the users table. */
export async function signupStats(env: Env): Promise<SignupStats> {
  const since = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000).toISOString()

  const [total, day1, day7, day30, daily, recent] = await env.DB.batch<unknown>([
    env.DB.prepare('SELECT COUNT(*) AS n FROM users'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1').bind(since(1)),
    env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1').bind(since(7)),
    env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1').bind(since(30)),
    env.DB.prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM users
       GROUP BY day ORDER BY day DESC LIMIT 14`,
    ),
    env.DB.prepare(
      `SELECT name, email, created_at, google_sub FROM users ORDER BY created_at DESC LIMIT 50`,
    ),
  ])

  const dailyRows = (daily?.results ?? []) as Array<{ day: string; n: number }>
  const recentRows = (recent?.results ?? []) as Array<{
    name: string
    email: string
    created_at: string
    google_sub: string | null
  }>

  return {
    total: countOf(total),
    last24h: countOf(day1),
    last7d: countOf(day7),
    last30d: countOf(day30),
    daily: dailyRows.map((row) => ({ day: String(row.day), count: Number(row.n) })),
    recent: recentRows.map((row) => ({
      name: String(row.name),
      email: String(row.email),
      createdAt: String(row.created_at),
      method: row.google_sub ? 'google' : 'password',
    })),
  }
}

export { toPublicUser }

/* ---------------------------------- sessions --------------------------------- */

export async function insertSession(env: Env, id: string, userId: string, expiresAt: string) {
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(id, userId, new Date().toISOString(), expiresAt)
    .run()
}

export async function findSessionUser(env: Env, sessionId: string) {
  const row = await env.DB.prepare(
    `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?1 AND sessions.expires_at > ?2`,
  )
    .bind(sessionId, new Date().toISOString())
    .first<UserRow>()
  return row ? toPublicUser(row) : null
}

export async function deleteSession(env: Env, sessionId: string) {
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(sessionId).run()
}

export async function deleteExpiredSessions(env: Env) {
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(new Date().toISOString()).run()
}

/* ----------------------------------- day logs ---------------------------------- */

type DayRow = {
  date: string
  bleeding: number
  flow: string | null
  symptoms: string
  mood: string | null
  notes: string | null
}

function parseSymptoms(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const toDayLog = (row: DayRow): DayLog => ({
  date: row.date,
  bleeding: row.bleeding === 1,
  flow: (row.flow as Flow | null) ?? null,
  symptoms: parseSymptoms(row.symptoms),
  mood: row.mood,
  notes: row.notes,
})

export async function listDays(env: Env, userId: string): Promise<DayLog[]> {
  const { results } = await env.DB.prepare(
    'SELECT date, bleeding, flow, symptoms, mood, notes FROM day_logs WHERE user_id = ?1 ORDER BY date ASC',
  )
    .bind(userId)
    .all<DayRow>()
  return results.map(toDayLog)
}

export async function upsertDay(
  env: Env,
  userId: string,
  day: Pick<DayLog, 'date' | 'bleeding' | 'flow' | 'symptoms' | 'mood' | 'notes'>,
) {
  await env.DB.prepare(
    `INSERT INTO day_logs (id, user_id, date, bleeding, flow, symptoms, mood, notes, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT (user_id, date) DO UPDATE SET
       bleeding = excluded.bleeding,
       flow = excluded.flow,
       symptoms = excluded.symptoms,
       mood = excluded.mood,
       notes = excluded.notes,
       updated_at = excluded.updated_at`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      day.date,
      day.bleeding ? 1 : 0,
      day.flow,
      JSON.stringify(day.symptoms),
      day.mood,
      day.notes,
      new Date().toISOString(),
    )
    .run()
}

export async function deleteDay(env: Env, userId: string, date: string) {
  await env.DB.prepare('DELETE FROM day_logs WHERE user_id = ?1 AND date = ?2').bind(userId, date).run()
}

/* ------------------------------------ prefs ------------------------------------ */

export async function getPrefs(env: Env, userId: string): Promise<CycleSettings> {
  const row = await env.DB.prepare('SELECT cycle_length, period_length FROM prefs WHERE user_id = ?1')
    .bind(userId)
    .first<{ cycle_length: number; period_length: number }>()
  return {
    cycleLength: clampNumber(row?.cycle_length, 21, 45, 28),
    periodLength: clampNumber(row?.period_length, 2, 10, 5),
  }
}

export async function savePrefs(env: Env, userId: string, prefs: CycleSettings) {
  await env.DB.prepare(
    `INSERT INTO prefs (user_id, cycle_length, period_length) VALUES (?1, ?2, ?3)
     ON CONFLICT (user_id) DO UPDATE SET cycle_length = excluded.cycle_length, period_length = excluded.period_length`,
  )
    .bind(userId, prefs.cycleLength, prefs.periodLength)
    .run()
}

function clampNumber(value: number | null | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/* ------------------------------------ chats ------------------------------------ */

export async function listChats(env: Env, userId: string, limit = 120): Promise<ChatMessage[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, role, content, suggestions, created_at FROM chats WHERE user_id = ?1 ORDER BY created_at DESC LIMIT ?2',
  )
    .bind(userId, limit)
    .all<{ id: string; role: string; content: string; suggestions: string; created_at: string }>()
  return results
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role === 'user' ? 'user' : 'assistant',
      content: row.content,
      suggestions: parseSymptoms(row.suggestions),
      createdAt: row.created_at,
    }))
}

export async function insertChat(
  env: Env,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  suggestions: string[] = [],
) {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    role,
    content,
    suggestions,
    createdAt: new Date().toISOString(),
  }
  await env.DB.prepare(
    'INSERT INTO chats (id, user_id, role, content, suggestions, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
  )
    .bind(message.id, userId, message.role, message.content, JSON.stringify(suggestions), message.createdAt)
    .run()
  return message
}

export async function clearChats(env: Env, userId: string) {
  await env.DB.prepare('DELETE FROM chats WHERE user_id = ?1').bind(userId).run()
}

/* -------------------------------- guest chats -------------------------------- */

export type GuestRow = { id: string; created_at: string; expires_at: string }

export async function getGuest(env: Env, id: string) {
  return env.DB.prepare('SELECT id, created_at, expires_at FROM guests WHERE id = ?1')
    .bind(id)
    .first<GuestRow>()
}

export async function createGuest(env: Env, id: string, expiresAt: string) {
  const createdAt = new Date().toISOString()
  await env.DB.prepare('INSERT INTO guests (id, created_at, expires_at) VALUES (?1, ?2, ?3)')
    .bind(id, createdAt, expiresAt)
    .run()
  return { id, created_at: createdAt, expires_at: expiresAt } satisfies GuestRow
}

export async function pruneGuests(env: Env) {
  const now = new Date().toISOString()
  await env.DB.prepare(
    'DELETE FROM guest_chats WHERE guest_id IN (SELECT id FROM guests WHERE expires_at <= ?1)',
  )
    .bind(now)
    .run()
  await env.DB.prepare('DELETE FROM guests WHERE expires_at <= ?1').bind(now).run()
}

export async function listGuestChats(env: Env, guestId: string, limit = 40): Promise<ChatMessage[]> {
  const { results } = await env.DB.prepare(
    'SELECT id, role, content, suggestions, created_at FROM guest_chats WHERE guest_id = ?1 ORDER BY created_at ASC LIMIT ?2',
  )
    .bind(guestId, limit)
    .all<{ id: string; role: string; content: string; suggestions: string; created_at: string }>()
  return results.map((row) => ({
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content,
    suggestions: parseSymptoms(row.suggestions),
    createdAt: row.created_at,
  }))
}

export async function countGuestChats(env: Env, guestId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM guest_chats WHERE guest_id = ?1')
    .bind(guestId)
    .first<{ total: number }>()
  return row?.total ?? 0
}

export async function insertGuestChat(
  env: Env,
  guestId: string,
  role: 'user' | 'assistant',
  content: string,
  suggestions: string[] = [],
) {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    role,
    content,
    suggestions,
    createdAt: new Date().toISOString(),
  }
  await env.DB.prepare(
    'INSERT INTO guest_chats (id, guest_id, role, content, suggestions, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
  )
    .bind(message.id, guestId, message.role, message.content, JSON.stringify(suggestions), message.createdAt)
    .run()
  return message
}

export async function clearGuestChats(env: Env, guestId: string) {
  await env.DB.prepare('DELETE FROM guest_chats WHERE guest_id = ?1').bind(guestId).run()
}

/** Moves a guest conversation onto a freshly authenticated account. */
export async function adoptGuestChats(env: Env, guestId: string, userId: string) {
  const { results } = await env.DB.prepare(
    'SELECT role, content, suggestions, created_at FROM guest_chats WHERE guest_id = ?1 ORDER BY created_at ASC LIMIT 40',
  )
    .bind(guestId)
    .all<{ role: string; content: string; suggestions: string; created_at: string }>()

  const statements = results.map((row) =>
    env.DB.prepare('INSERT INTO chats (id, user_id, role, content, suggestions, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(crypto.randomUUID(), userId, row.role === 'user' ? 'user' : 'assistant', row.content, row.suggestions, row.created_at),
  )
  statements.push(env.DB.prepare('DELETE FROM guest_chats WHERE guest_id = ?1').bind(guestId))
  statements.push(env.DB.prepare('DELETE FROM guests WHERE id = ?1').bind(guestId))
  await env.DB.batch(statements)
}
