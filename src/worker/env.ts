import type { PublicUser } from '../shared/types'

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  APP_NAME?: string
  /** Public origin of the deployed site, used for OAuth redirect URLs. */
  APP_ORIGIN?: string
  /** Optional Google OAuth credentials. When absent, Google sign-in stays disabled. */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  /** Optional Resend key: when set, every new account emails an alert to SIGNUP_ALERT_TO. */
  RESEND_API_KEY?: string
  /** Comma-separated owner addresses for signup alerts. */
  SIGNUP_ALERT_TO?: string
  /** When set, /admin?token=… serves the owner dashboard; without it the page is a 404. */
  ADMIN_TOKEN?: string
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: PublicUser | null
  }
}
