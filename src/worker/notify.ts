import type { Context } from 'hono'
import type { PublicUser } from '../shared/types'
import type { AppEnv, Env } from './env'

/**
 * Resend's shared sender needs no domain verification; it can only deliver to the
 * address that owns the Resend account, which is exactly the owner-notification case.
 */
const FROM = 'Sakhicycle <onboarding@resend.dev>'
const DEFAULT_TO = 'royayush1901@gmail.com'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

/**
 * Emails the owner about a new account. Never throws: a failed alert must not
 * break sign-up, so problems are only logged.
 */
export async function sendSignupAlert(env: Env, user: PublicUser): Promise<void> {
  if (!env.RESEND_API_KEY) return

  const to = (env.SIGNUP_ALERT_TO ?? DEFAULT_TO)
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
  if (to.length === 0) return

  const when = new Date(user.createdAt).toUTCString()
  const method = user.hasPassword ? 'email and password' : 'Google'
  const html = `<div style="font-family:system-ui,sans-serif;color:#2a1219">
  <h2 style="margin:0 0 12px;color:#b4234c">New Sakhicycle signup</h2>
  <p style="margin:0 0 4px"><strong>${escapeHtml(user.name)}</strong></p>
  <p style="margin:0 0 4px">${escapeHtml(user.email)}</p>
  <p style="margin:0 0 4px;color:#6b4a53">${escapeHtml(when)} (UTC)</p>
  <p style="margin:0;color:#6b4a53">Signed up with ${escapeHtml(method)}.</p>
</div>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `New Sakhicycle signup: ${user.name}`,
        html,
      }),
    })
    if (!response.ok) {
      console.warn('signup alert rejected:', response.status, (await response.text().catch(() => '')).slice(0, 300))
    }
  } catch (error) {
    console.warn('signup alert failed:', error)
  }
}

/** Sends the alert after the response, so sign-up never waits on the email provider. */
export function queueSignupAlert(c: Context<AppEnv>, user: PublicUser): void {
  const task = sendSignupAlert(c.env, user)
  try {
    c.executionCtx.waitUntil(task)
  } catch {
    void task
  }
}
