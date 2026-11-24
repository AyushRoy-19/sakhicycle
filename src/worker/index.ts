import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { passwordAuthEnabled, type AppEnv } from './env'
import {
  adoptGuestChats,
  attachGoogleSub,
  clearChats,
  clearGuestChats,
  countGuestChats,
  createGuest,
  createUser,
  deleteDay,
  deleteExpiredSessions,
  deleteUserData,
  ensureSchema,
  findUserByEmail,
  findUserById,
  findUserByGoogleSub,
  getGuest,
  getPrefs,
  hitRateLimit,
  insertChat,
  insertGuestChat,
  listChats,
  listDays,
  listGuestChats,
  pruneGuests,
  pruneRateLimits,
  savePrefs,
  toPublicUser,
  updateUserName,
  upsertDay,
} from './db'
import {
  GUEST_COOKIE,
  LEGACY_GUEST_COOKIE,
  LEGACY_OAUTH_STATE_COOKIE,
  LEGACY_SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  endSession,
  exchangeGoogleCode,
  googleAuthorizeUrl,
  googleConfigured,
  hashPassword,
  hashToken,
  isSameOrigin,
  issueGuestCookie,
  issueSession,
  newToken,
  readGuestToken,
  resolveSessionUser,
  timingSafeEqual,
  verifyPassword,
} from './auth'
import { computeInsights, isIsoDate, toIsoDate } from './insights'
import { handleAdmin } from './admin'
import { queueSignupAlert } from './notify'
import { replyTo } from './chat'
import { articles, findArticle } from './content'
import type { CycleSettings, DayLog, Flow } from '../shared/types'

const app = new Hono<AppEnv>()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FLOWS: Flow[] = ['light', 'medium', 'heavy']

/* ---------------------------------- middleware ---------------------------------- */

app.use('/api/*', async (c, next) => {
  await ensureSchema(c.env)
  // Housekeeping: expired counters cost a row each until they are pruned.
  if (Math.random() < 0.02) {
    const cleanup = pruneRateLimits(c.env)
    try {
      c.executionCtx.waitUntil(cleanup)
    } catch {
      void cleanup
    }
  }
  // These routes end the session, so there is no cookie worth upgrading.
  const endsSession = c.req.path === '/api/auth/logout' || c.req.path === '/api/auth/account'
  c.set('user', await resolveSessionUser(c, c.env, { migrate: !endsSession }))
  await next()
})

app.use('/api/*', async (c, next) => {
  const method = c.req.method
  if (method !== 'GET' && method !== 'HEAD' && !isSameOrigin(c)) {
    return c.json({ error: 'Cross-site requests are not allowed.' }, 403)
  }
  await next()
})

/* ------------------------------ security headers ------------------------------ */

// The host injects its cookieless analytics beacon into served HTML, so that
// one origin is allowed; everything else stays same-origin only.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'serial=()',
  'bluetooth=()',
  'display-capture=()',
].join(', ')

function withSecurityHeaders(res: Response, secure: boolean): Response {
  const headers = new Headers(res.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  headers.set('Permissions-Policy', PERMISSIONS_POLICY)
  headers.set('Content-Security-Policy', CSP)
  if (secure) headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

/* API responses carry personal data: never cache them, and apply the same security headers. */
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-Frame-Options', 'DENY')
  c.header('Content-Security-Policy', CSP)
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  c.header('X-Permitted-Cross-Domain-Policies', 'none')
  // API payloads are personal data and must never be indexed or archived.
  c.header('X-Robots-Tag', 'noindex, nofollow')
})

/* Reject oversized bodies before they are parsed. */
app.use('/api/*', async (c, next) => {
  const length = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(length) && length > 64 * 1024) {
    return c.json({ error: 'That request is too large.' }, 413)
  }
  await next()
})

const attempts = new Map<string, { count: number; resetAt: number }>()

/** Cheap in-isolate burst counter: stops floods without touching the database. */
function burstLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (attempts.size > 5000) attempts.clear()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

/**
 * Shared limiter: the in-memory bucket catches floods, the D1 counter keeps the
 * limit meaningful across isolates. Either one tripping rejects the request.
 */
async function rateLimited(env: AppEnv['Bindings'], key: string, limit = 12, windowMs = 10 * 60_000): Promise<boolean> {
  if (burstLimited(key, limit, windowMs)) return true
  return hitRateLimit(env, key, limit, windowMs)
}

/* ------------------------------------- health ------------------------------------ */

app.get('/api/health', (c) => c.json({ ok: true, service: 'sakhicycle', time: new Date().toISOString() }))


app.get('/api/auth/config', (c) =>
  c.json({ googleEnabled: googleConfigured(c.env), passwordEnabled: passwordAuthEnabled(c.env) }),
)

/* -------------------------------------- auth -------------------------------------- */

type SignupBody = { name?: unknown; email?: unknown; password?: unknown }
type LoginBody = { email?: unknown; password?: unknown }

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const PASSWORD_OFF = { error: 'Password sign-in is turned off for this site. Please continue with Google.' }

app.post('/api/auth/signup', async (c) => {
  if (!passwordAuthEnabled(c.env)) return c.json(PASSWORD_OFF, 403)

  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  if (await rateLimited(c.env, `signup:${ip}`)) {
    return c.json({ error: 'Too many attempts. Please try again in a few minutes.' }, 429)
  }

  const body = (await c.req.json().catch(() => ({}))) as SignupBody
  const name = str(body.name)
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  if (name.length < 2 || name.length > 60) return c.json({ error: 'Please enter a name between 2 and 60 characters.' }, 400)
  if (!EMAIL_PATTERN.test(email)) return c.json({ error: 'Please enter a valid email address.' }, 400)
  if (password.length < 8) return c.json({ error: 'Please use at least 8 characters for your password.' }, 400)
  if (password.length > 200) return c.json({ error: 'That password is too long.' }, 400)

  if (await findUserByEmail(c.env, email)) {
    return c.json({ error: 'That email already has an account. Try signing in.' }, 409)
  }

  const user = await createUser(c.env, { email, name, passwordHash: await hashPassword(password) })
  queueSignupAlert(c, user)
  await issueSession(c, c.env, user.id)
  await adoptGuestConversation(c, user.id)
  return c.json({ user }, 201)
})

app.post('/api/auth/login', async (c) => {
  if (!passwordAuthEnabled(c.env)) return c.json(PASSWORD_OFF, 403)

  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  const throttleReply = { error: 'Too many attempts. Please try again in a few minutes.' }
  if (await rateLimited(c.env, `login:${ip}`)) return c.json(throttleReply, 429)

  const body = (await c.req.json().catch(() => ({}))) as LoginBody
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  // A second bucket keyed by account slows a distributed guess at one address,
  // which an IP-only limit would not catch.
  if (email.length <= 254 && (await rateLimited(c.env, `login:acct:${email}`, 10, 15 * 60_000))) {
    return c.json(throttleReply, 429)
  }

  const row = EMAIL_PATTERN.test(email) ? await findUserByEmail(c.env, email) : null
  const valid = row ? await verifyPassword(password, row.password_hash) : false
  if (!row || !valid) {
    return c.json({ error: "That email and password don't match. Try again?" }, 401)
  }

  await deleteExpiredSessions(c.env)
  await issueSession(c, c.env, row.id)
  await adoptGuestConversation(c, row.id)
  return c.json({ user: toPublicUser(row) })
})

app.post('/api/auth/logout', async (c) => {
  await endSession(c, c.env)
  return c.json({ ok: true })
})

app.get('/api/auth/me', (c) => c.json({ user: c.get('user') }))

app.patch('/api/auth/me', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const body = (await c.req.json().catch(() => ({}))) as { name?: unknown }
  const name = str(body.name)
  if (name.length < 2 || name.length > 60) return c.json({ error: 'Please enter a name between 2 and 60 characters.' }, 400)
  await updateUserName(c.env, user.id, name)
  return c.json({ user: { ...user, name } })
})

app.delete('/api/auth/account', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)

  const body = (await c.req.json().catch(() => ({}))) as { confirm?: unknown; password?: unknown }
  if (str(body.confirm).toUpperCase() !== 'DELETE') {
    return c.json({ error: 'Type DELETE to confirm you want to remove your account.' }, 400)
  }

  const row = await findUserById(c.env, user.id)
  if (!row) return c.json({ error: 'Please sign in first.' }, 401)

  if (row.password_hash) {
    const password = typeof body.password === 'string' ? body.password : ''
    const valid = await verifyPassword(password, row.password_hash)
    if (!valid) return c.json({ error: 'Those details did not match. Nothing was deleted.' }, 403)
  }

  await deleteUserData(c.env, user.id)
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  deleteCookie(c, LEGACY_SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/auth/google/start', async (c) => {
  if (!googleConfigured(c.env)) {
    return c.redirect('/login?error=google_unavailable')
  }
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  if (await rateLimited(c.env, `google:${ip}`, 20, 10 * 60_000)) {
    return c.redirect('/login?error=google_unavailable')
  }
  const state = newToken()
  const secure = new URL(c.req.url).protocol === 'https:'
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/api/auth/google',
    secure,
    maxAge: 600,
  })
  return c.redirect(googleAuthorizeUrl(c.env, new URL(c.req.url).origin, state))
})

app.get('/api/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const expected = getCookie(c, OAUTH_STATE_COOKIE) ?? getCookie(c, LEGACY_OAUTH_STATE_COOKIE)
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/api/auth/google' })
  deleteCookie(c, LEGACY_OAUTH_STATE_COOKIE, { path: '/api/auth/google' })

  if (!googleConfigured(c.env) || !code || !state || !expected || !timingSafeEqual(state, expected)) {
    return c.redirect('/login?error=google_failed')
  }

  const identity = await exchangeGoogleCode(c.env, new URL(c.req.url).origin, code)
  if (!identity) return c.redirect('/login?error=google_failed')

  const bySub = await findUserByGoogleSub(c.env, identity.sub)
  if (bySub) {
    await issueSession(c, c.env, bySub.id)
    await adoptGuestConversation(c, bySub.id)
    return c.redirect('/app')
  }

  const byEmail = await findUserByEmail(c.env, identity.email)
  if (byEmail) {
    await attachGoogleSub(c.env, byEmail.id, identity.sub)
    await issueSession(c, c.env, byEmail.id)
    await adoptGuestConversation(c, byEmail.id)
    return c.redirect('/app')
  }

  const user = await createUser(c.env, {
    email: identity.email,
    name: identity.name,
    googleSub: identity.sub,
  })
  queueSignupAlert(c, user)
  await issueSession(c, c.env, user.id)
  await adoptGuestConversation(c, user.id)
  return c.redirect('/app')
})

/* ------------------------------------- day logs ----------------------------------- */

app.get('/api/days', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const days = await listDays(c.env, user.id)
  return c.json({ days })
})

function parseDayBody(body: unknown, date: string): { value?: DayLog; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body.' }
  const input = body as Record<string, unknown>
  const bleeding = Boolean(input.bleeding)
  const flowRaw = typeof input.flow === 'string' ? input.flow : null
  const flow = flowRaw && (FLOWS as string[]).includes(flowRaw) ? (flowRaw as Flow) : null
  const symptoms = Array.isArray(input.symptoms)
    ? [...new Set(input.symptoms.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, 40)))].slice(0, 12)
    : []
  const mood = typeof input.mood === 'string' ? input.mood.slice(0, 40) : null
  const notes = typeof input.notes === 'string' ? input.notes.slice(0, 500) : null
  return { value: { date, bleeding, flow: bleeding ? flow : null, symptoms, mood, notes } }
}

app.put('/api/days/:date', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const date = c.req.param('date')
  if (!isIsoDate(date)) return c.json({ error: 'Dates must look like 2026-04-18.' }, 400)

  const body = await c.req.json().catch(() => null)
  const { value, error } = parseDayBody(body, date)
  if (!value) return c.json({ error: error ?? 'Invalid request body.' }, 400)

  const empty = !value.bleeding && value.symptoms.length === 0 && !value.mood && !value.notes
  if (empty) {
    await deleteDay(c.env, user.id, date)
    return c.json({ day: null })
  }

  await upsertDay(c.env, user.id, value)
  return c.json({ day: value })
})

app.delete('/api/days/:date', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const date = c.req.param('date')
  if (!isIsoDate(date)) return c.json({ error: 'Dates must look like 2026-04-18.' }, 400)
  await deleteDay(c.env, user.id, date)
  return c.json({ ok: true })
})

/* ------------------------------------- insights ----------------------------------- */

app.get('/api/insights', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const requested = c.req.query('today')
  const today = isIsoDate(requested) ? requested : toIsoDate(new Date())
  const [days, prefs] = await Promise.all([listDays(c.env, user.id), getPrefs(c.env, user.id)])
  return c.json({ insights: computeInsights(days, prefs, today), settings: prefs })
})

app.get('/api/prefs', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  return c.json({ settings: await getPrefs(c.env, user.id) })
})

app.put('/api/prefs', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const body = (await c.req.json().catch(() => ({}))) as Partial<CycleSettings>
  const cycleLength = Number(body.cycleLength)
  const periodLength = Number(body.periodLength)
  if (!Number.isFinite(cycleLength) || cycleLength < 21 || cycleLength > 45) {
    return c.json({ error: 'Cycle length should be between 21 and 45 days.' }, 400)
  }
  if (!Number.isFinite(periodLength) || periodLength < 2 || periodLength > 10) {
    return c.json({ error: 'Period length should be between 2 and 10 days.' }, 400)
  }
  const settings = { cycleLength: Math.round(cycleLength), periodLength: Math.round(periodLength) }
  await savePrefs(c.env, user.id, settings)
  return c.json({ settings })
})

/* ------------------------------------- education ---------------------------------- */

app.get('/api/articles', (c) => c.json({ articles: articles.map(({ slug, title, summary, readMinutes }) => ({ slug, title, summary, readMinutes })) }))

app.get('/api/articles/:slug', (c) => {
  const article = findArticle(c.req.param('slug'))
  if (!article) return c.json({ error: 'That article does not exist.' }, 404)
  return c.json({ article })
})

/* --------------------------------------- chat -------------------------------------- */

app.get('/api/chat', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  return c.json({ messages: await listChats(c.env, user.id) })
})

app.post('/api/chat', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  if (await rateLimited(c.env, `chat:${ip}`, 60, 5 * 60_000)) {
    return c.json({ error: 'You are sending messages quickly. Take a breath and try again in a minute.' }, 429)
  }

  const body = (await c.req.json().catch(() => ({}))) as { message?: unknown; today?: unknown }
  const message = str(body.message)
  if (!message) return c.json({ error: 'Type a question first.' }, 400)
  if (message.length > 800) return c.json({ error: 'Please keep questions under 800 characters.' }, 400)

  const [days, prefs] = await Promise.all([listDays(c.env, user.id), getPrefs(c.env, user.id)])
  const insights = computeInsights(days, prefs, isIsoDate(body.today) ? body.today : toIsoDate(new Date()))
  const answer = replyTo(message, {
    name: user.name.split(' ')[0] || 'there',
    cycleDay: insights.cycleDay,
    phase: insights.phase,
  })

  const userMessage = await insertChat(c.env, user.id, 'user', message)
  const assistantMessage = await insertChat(c.env, user.id, 'assistant', answer.content, answer.suggestions)

  return c.json({ messages: [userMessage, assistantMessage], urgent: answer.urgent }, 201)
})

app.delete('/api/chat', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Please sign in first.' }, 401)
  await clearChats(c.env, user.id)
  return c.json({ ok: true })
})

/* ------------------------------------ guest chat ----------------------------------- */

const GUEST_WINDOW_MS = 3 * 60 * 1000
const GUEST_MAX_MESSAGES = 24

function guestSecondsLeft(createdAt: string): number {
  const elapsed = Date.now() - Date.parse(createdAt)
  return Math.max(0, Math.ceil((GUEST_WINDOW_MS - elapsed) / 1000))
}

/** Carries a guest conversation over to the account that just signed in. */
async function adoptGuestConversation(c: Context<AppEnv>, userId: string): Promise<void> {
  const token = getCookie(c, GUEST_COOKIE) ?? getCookie(c, LEGACY_GUEST_COOKIE)
  if (!token) return
  try {
    await adoptGuestChats(c.env, await hashToken(token), userId)
  } finally {
    deleteCookie(c, GUEST_COOKIE, { path: '/' })
    deleteCookie(c, LEGACY_GUEST_COOKIE, { path: '/' })
  }
}

app.get('/api/guest/chat', async (c) => {
  await pruneGuests(c.env)
  const fresh = { messages: [], remainingSeconds: Math.round(GUEST_WINDOW_MS / 1000), limitReached: false }

  const token = readGuestToken(c)
  if (!token) return c.json(fresh)

  const guestId = await hashToken(token)
  const guest = await getGuest(c.env, guestId)
  if (!guest) return c.json(fresh)

  const messages = await listGuestChats(c.env, guestId)
  const remaining = guestSecondsLeft(guest.created_at)
  return c.json({
    messages,
    remainingSeconds: remaining,
    limitReached: remaining <= 0 || messages.length >= GUEST_MAX_MESSAGES,
  })
})

app.post('/api/guest/chat', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  if (await rateLimited(c.env, `guest:${ip}`, 30, 10 * 60_000)) {
    return c.json({ error: 'That is a lot of messages at once. Give it a minute and try again.' }, 429)
  }

  const body = (await c.req.json().catch(() => ({}))) as { message?: unknown }
  const message = str(body.message)
  if (!message) return c.json({ error: 'Type a message first.' }, 400)
  if (message.length > 800) return c.json({ error: 'Please keep it under 800 characters.' }, 400)

  let token = readGuestToken(c)
  if (!token) {
    token = newToken()
    issueGuestCookie(c, token)
  }
  const guestId = await hashToken(token)
  const guest =
    (await getGuest(c.env, guestId)) ??
    (await createGuest(c.env, guestId, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()))

  const remaining = guestSecondsLeft(guest.created_at)
  const used = await countGuestChats(c.env, guestId)
  if (remaining <= 0 || used >= GUEST_MAX_MESSAGES) {
    return c.json(
      {
        error: 'Your free three minutes are up. Create an account to keep chatting.',
        code: 'guest_limit',
        remainingSeconds: 0,
      },
      403,
    )
  }

  const answer = replyTo(message, { name: 'there', cycleDay: null, phase: null })
  const userMessage = await insertGuestChat(c.env, guestId, 'user', message)
  const assistantMessage = await insertGuestChat(c.env, guestId, 'assistant', answer.content, answer.suggestions)

  return c.json(
    {
      messages: [userMessage, assistantMessage],
      urgent: answer.urgent,
      remainingSeconds: guestSecondsLeft(guest.created_at),
    },
    201,
  )
})

app.delete('/api/guest/chat', async (c) => {
  const token = readGuestToken(c)
  if (!token) return c.json({ ok: true })
  await clearGuestChats(c.env, await hashToken(token))
  return c.json({ ok: true })
})

/* --------------------------------------- errors ------------------------------------ */

app.all('/api/*', (c) => c.json({ error: 'That endpoint does not exist.' }, 404))

/* ------------------------------ owner dashboard ------------------------------ */

// Secret-link dashboard; handleAdmin answers 404 unless ADMIN_TOKEN matches.
app.get('/admin', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  if (await rateLimited(c.env, `admin:${ip}`, 10, 10 * 60_000)) return c.text('Not found', 404)
  return handleAdmin(c)
})

app.onError((error, c) => {
  console.error('Unhandled worker error:', error)
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500)
})

/* --------------------------- static assets and SPA routing -------------------------- */

app.get('*', async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw)
  const url = new URL(c.req.url)
  const headers = new Headers(res.headers)
  // The manifest needs its registered type to be installable, and the service
  // worker must be revalidated so a new release is picked up.
  if (url.pathname === '/manifest.webmanifest') {
    headers.set('Content-Type', 'application/manifest+json')
  }
  if (url.pathname === '/sw.js') {
    headers.set('Cache-Control', 'no-cache')
  }
  const patched = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  return withSecurityHeaders(patched, url.protocol === 'https:')
})

export default app
