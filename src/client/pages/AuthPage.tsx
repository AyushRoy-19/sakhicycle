import { useEffect, useState, type FormEvent } from 'react'
import type { AuthConfig, PublicUser } from '../../shared/types'
import { useAuth } from '../auth'
import { api, errorMessage } from '../lib/api'
import { Link, navigate } from '../router'
import { Logo } from '../components/Logo'
import { MotionToggle, ThemeToggle } from '../theme'

const ERROR_COPY: Record<string, string> = {
  google_unavailable: 'Google sign-in is not switched on for this site yet.',
  google_failed: 'Google sign-in did not complete. Please try again.',
}

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { setUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null)
  const [passwordEnabled, setPasswordEnabled] = useState(true)

  const isSignup = mode === 'signup'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('error')
    if (code) setError(ERROR_COPY[code] ?? 'Something went wrong. Please try again.')
  }, [])

  useEffect(() => {
    let active = true
    api<AuthConfig>('/api/auth/config')
      .then((config) => {
        if (!active) return
        setGoogleEnabled(config.googleEnabled)
        setPasswordEnabled(config.passwordEnabled)
      })
      .catch(() => {
        if (!active) return
        setGoogleEnabled(false)
      })
    return () => {
      active = false
    }
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const payload = isSignup ? { name, email, password } : { email, password }
      const result = await api<{ user: PublicUser }>(isSignup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        body: payload,
      })
      setUser(result.user)
      navigate('/app')
    } catch (caught) {
      setError(errorMessage(caught, 'We could not complete that. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-top">
          <Logo />
          <div className="auth-toggles">
            <MotionToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="auth-form-wrap">
          <p className="eyebrow">{isSignup ? 'Create your account' : 'Welcome back'}</p>
          <h1>{isSignup ? 'A calmer way to track.' : 'Sign in to Sakhicycle.'}</h1>
          <p className="auth-lede">
            {isSignup
              ? 'Your cycle, your notes, your questions. Private, and free to start.'
              : 'Your tracker, your history and your guide, right where you left them.'}
          </p>

          {passwordEnabled && (
            <form onSubmit={submit} noValidate>
              {isSignup && (
                <div className="field">
                  <label className="label" htmlFor="name">
                    Your first name
                  </label>
                  <input
                    id="name"
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                    placeholder="Amara"
                    required
                  />
                </div>
              )}

              <div className="field">
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                  minLength={8}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'One moment…' : isSignup ? 'Create my account' : 'Sign in'}
              </button>
            </form>
          )}

          {passwordEnabled && <div className="divider">or</div>}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {googleEnabled ? (
            <a className="btn btn-google btn-block" href="/api/auth/google/start">
              <GoogleGlyph />
              Continue with Google
            </a>
          ) : (
            <button type="button" className="btn btn-google btn-block" disabled>
              <GoogleGlyph />
              Continue with Google
            </button>
          )}
          {googleEnabled === false && (
            <p className="hint">
              {passwordEnabled
                ? 'Google sign-in is not switched on for this site yet. Your email works right now.'
                : 'Sign-in is not available right now. Please check back in a moment.'}
            </p>
          )}
          {!passwordEnabled && googleEnabled && (
            <p className="hint">No password to remember — your Google account is all you need.</p>
          )}

          <p className="auth-legal">
            By continuing you agree to our <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          {passwordEnabled && (
            <p className="auth-switch">
              {isSignup ? 'Already have an account? ' : 'New to Sakhicycle? '}
              <Link to={isSignup ? '/login' : '/signup'} className="text-link">
                {isSignup ? 'Sign in' : 'Create one'}
              </Link>
            </p>
          )}
        </div>
      </div>

      <aside className="auth-right">
        <Logo to="/" />
        <div>
          <p className="auth-quote">
            “The first time is the hardest. After that it is just another week of the month.”
          </p>
          <ul className="auth-points">
            <li>Your cycle in one glance, with predictions from your own logs</li>
            <li>A guide that answers without judging</li>
            <li>Plain-language lessons on pain, products and when to get help</li>
          </ul>
        </div>
        <p className="auth-small">Education and tracking, not medical advice.</p>
      </aside>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6 0-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.9.9-3.1.9a5.4 5.4 0 0 1-5.1-3.7H.9v2.3A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.9 10.8a5.4 5.4 0 0 1 0-3.6V4.9H.9a9 9 0 0 0 0 8.2l3-2.3Z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 4.9l3 2.3A5.4 5.4 0 0 1 9 3.6Z" />
    </svg>
  )
}
