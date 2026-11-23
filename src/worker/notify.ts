import type { Context } from 'hono'
import type { PublicUser } from '../shared/types'
import type { AppEnv, Env } from './env'
import { escapeHtml } from './html'

/**
 * Resend's shared sender needs no domain verification; it can only deliver to the
 * inbox that owns the Resend account, which covers owner-only signup alerts.
 */
const FROM = 'Sakhicycle <onboarding@resend.dev>'

/** Comma-separated SIGNUP_ALERT_TO values, trimmed. Empty when unset. */
function recipients(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
}

/** Emails the owner about a new account. Never throws: alerts must not break sign-up. */
async function sendSignupAlert(env: Env, user: PublicUser): Promise<void> {
  const to = recipients(env.SIGNUP_ALERT_TO)
  if (!env.RESEND_API_KEY || to.length === 0) return

  const method = user.hasPassword ? 'email and password' : 'Google'
  const html = `<div style="font-family:system-ui,sans-serif;color:#2a1219">
  <h2 style="margin:0 0 12px;color:#b4234c">New Sakhicycle signup</h2>
  <p style="margin:0 0 4px"><strong>${escapeHtml(user.name)}</strong></p>
  <p style="margin:0 0 4px">${escapeHtml(user.email)}</p>
  <p style="margin:0 0 4px;color:#6b4a53">${escapeHtml(new Date(user.createdAt).toUTCString())} (UTC)</p>
  <p style="margin:0;color:#6b4a53">Signed up with ${method}.</p>
</div>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `New Sakhicycle signup: ${user.name}`,
        html,
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.warn('signup alert rejected:', response.status, detail.slice(0, 300))
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
