import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppEnv, Env } from './env'
import { deleteSession, findSessionUser, insertSession } from './db'

export const SESSION_COOKIE = 'sakh_session'
export const OAUTH_STATE_COOKIE = 'sakh_oauth_state'
export const GUEST_COOKIE = 'sakh_guest'

/* Cookies written before the rename are still accepted, then upgraded in place. */
export const LEGACY_SESSION_COOKIE = 'ska_session'
export const LEGACY_OAUTH_STATE_COOKIE = 'ska_oauth_state'
export const LEGACY_GUEST_COOKIE = 'ska_guest'
const SESSION_DAYS = 30
// The deployed Worker runtime rejects PBKDF2 above 100k iterations, so this is
// the strongest count the platform allows.
const PBKDF2_ITERATIONS = 100_000
const MAX_PBKDF2_ITERATIONS = 100_000

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return toHex(new Uint8Array(digest))
}

/** Only token hashes are ever stored, so a database leak cannot be replayed as a session or guest cookie. */
export function hashToken(token: string): Promise<string> {
  return sha256(token)
}

export function newToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}

/**
 * Constant-time string compare. A plain `===` returns early on the first wrong
 * byte, which leaks how much of a token or OAuth state was guessed correctly.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return difference === 0
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false
  const [scheme, iterationsRaw, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'pbkdf2' || !saltHex || !hashHex) return false
  const iterations = Number.parseInt(iterationsRaw, 10)
  if (!Number.isFinite(iterations) || iterations < 1000 || iterations > MAX_PBKDF2_ITERATIONS) return false
  const candidate = await derive(password, fromHex(saltHex), iterations)
  const expected = fromHex(hashHex)
  if (candidate.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < candidate.length; i += 1) mismatch |= candidate[i] ^ expected[i]
  return mismatch === 0
}

export function isSecureRequest(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

function sessionCookieOptions(c: Context<AppEnv>) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    path: '/',
    secure: isSecureRequest(c),
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }
}

export async function issueSession(c: Context<AppEnv>, env: Env, userId: string): Promise<void> {
  const token = newToken()
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await insertSession(env, await sha256(token), userId, expires.toISOString())
  setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(c))
  deleteCookie(c, LEGACY_SESSION_COOKIE, { path: '/' })
}

export function issueGuestCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: isSecureRequest(c),
    maxAge: 24 * 60 * 60,
  })
}

/** Reads the guest token under either name and upgrades a legacy cookie in place. */
export function readGuestToken(c: Context<AppEnv>): string | null {
  const current = getCookie(c, GUEST_COOKIE)
  if (current) return current

  const legacy = getCookie(c, LEGACY_GUEST_COOKIE)
  if (!legacy) return null

  issueGuestCookie(c, legacy)
  deleteCookie(c, LEGACY_GUEST_COOKIE, { path: '/' })
  return legacy
}

export async function resolveSessionUser(
  c: Context<AppEnv>,
  env: Env,
  options: { migrate?: boolean } = {},
) {
  const current = getCookie(c, SESSION_COOKIE)
  const token = current ?? getCookie(c, LEGACY_SESSION_COOKIE)
  if (!token) return null

  const user = await findSessionUser(env, await sha256(token))

  // Keep signed-in people signed in across the cookie rename.
  if (user && !current && options.migrate !== false) {
    setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(c))
    deleteCookie(c, LEGACY_SESSION_COOKIE, { path: '/' })
  }

  return user
}

export async function endSession(c: Context<AppEnv>, env: Env): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE) ?? getCookie(c, LEGACY_SESSION_COOKIE)
  if (token) await deleteSession(env, await sha256(token))
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  deleteCookie(c, LEGACY_SESSION_COOKIE, { path: '/' })
}

/** Rejects cross-site writes. Same-origin browser requests always carry a matching Origin header. */
export function isSameOrigin(c: Context<AppEnv>): boolean {
  const origin = c.req.header('origin')
  if (origin && origin !== new URL(c.req.url).origin) return false
  // Defence in depth for browsers that report the initiator: a cross-site
  // navigation or fetch is refused even if the Origin header is absent.
  return c.req.header('sec-fetch-site') !== 'cross-site'
}

/* ----------------------------------- Google OAuth ---------------------------------- */

export function googleConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

export function googleRedirectUri(env: Env, origin: string): string {
  return `${env.APP_ORIGIN ?? origin}/api/auth/google/callback`
}

export function googleAuthorizeUrl(env: Env, origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(env, origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

type GoogleIdentity = { sub: string; email: string; name: string }

export async function exchangeGoogleCode(env: Env, origin: string, code: string): Promise<GoogleIdentity | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: googleRedirectUri(env, origin),
      grant_type: 'authorization_code',
    }),
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { id_token?: string }
  if (!payload.id_token) return null

  const part = payload.id_token.split('.')[1]
  if (!part) return null
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as {
      iss?: string
      aud?: string
      exp?: number
      sub?: string
      email?: string
      email_verified?: boolean
      name?: string
      given_name?: string
    }
    // The token comes straight from Google's token endpoint, but still check who
    // issued it and that it was minted for this client and has not expired.
    const issuer = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com'
    if (!issuer || claims.aud !== env.GOOGLE_CLIENT_ID) return null
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null
    if (!claims.sub || !claims.email || claims.email_verified === false) return null
    const name = (claims.given_name || claims.name || claims.email.split('@')[0] || 'Friend').slice(0, 60)
    return { sub: claims.sub, email: claims.email, name }
  } catch {
    return null
  }
}
