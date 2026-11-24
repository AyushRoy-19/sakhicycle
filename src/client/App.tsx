import { useEffect } from 'react'
import { AuthProvider, useAuth } from './auth'
import { navigate, usePath } from './router'
import { Logo } from './components/Logo'
import { Landing } from './pages/Landing'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { CalendarPage } from './pages/CalendarPage'
import { Learn } from './pages/Learn'
import { Chat } from './pages/Chat'
import { Privacy, Terms } from './pages/Legal'

function Boot() {
  return (
    <div className="boot">
      <Logo to="/" />
      <p className="card-sub">Loading…</p>
    </div>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to)
  }, [to])
  return <Boot />
}

function Routes() {
  const path = usePath()
  const { user, loading } = useAuth()

  if (loading) return <Boot />

  if (path === '/chat') return user ? <Redirect to="/app/guide" /> : <Chat guest />
  if (path === '/login') return user ? <Redirect to="/app" /> : <AuthPage mode="login" />
  if (path === '/signup') return user ? <Redirect to="/app" /> : <AuthPage mode="signup" />

  if (path === '/app' || path === '/app/') {
    return user ? <Dashboard /> : <Redirect to="/login" />
  }
  if (path === '/app/calendar') return user ? <CalendarPage /> : <Redirect to="/login" />
  if (path === '/app/learn') return user ? <Learn /> : <Redirect to="/login" />
  if (path === '/app/guide') return user ? <Chat /> : <Redirect to="/login" />

  if (path === '/privacy') return <Privacy />
  if (path === '/terms') return <Terms />

  if (path === '/' || path === '') return <Landing />

  return (
    <div className="boot">
      <h1 className="display-sm">That page moved.</h1>
      <p className="card-sub">Let&apos;s get you back to somewhere useful.</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
        Back to the start
      </button>
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  )
}
