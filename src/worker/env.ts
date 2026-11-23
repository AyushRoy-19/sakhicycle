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
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: PublicUser | null
  }
}
