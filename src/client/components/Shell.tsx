import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { Link, usePath } from '../router'
import { Logo } from './Logo'
import { MotionToggle, ThemeToggle } from '../theme'

const TABS = [
  { to: '/app', label: 'Today' },
  { to: '/app/calendar', label: 'Calendar' },
  { to: '/app/learn', label: 'Learn' },
  { to: '/app/guide', label: 'Chat' },
]

export function Shell({ children, fixed = false }: { children: ReactNode; fixed?: boolean }) {
  const { user, signOut } = useAuth()
  const path = usePath()
  const initial = (user?.name?.[0] ?? 'S').toUpperCase()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={fixed ? 'app-frame is-fixed' : 'app-frame'}>
      <header className={scrolled ? 'app-header is-scrolled' : 'app-header'}>
        <div className="app-nav">
          <Logo to="/app" />
          <nav className="app-tabs" aria-label="Sections">
            {TABS.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className="app-tab"
                aria-current={path === tab.to ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="app-user">
            <MotionToggle />
            <ThemeToggle />
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="app-user-name">{user?.name.split(' ')[0]}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
      <footer className="app-footer">
        Sakhicycle is an education and tracking tool, not medical advice. For anything urgent, talk to a trusted adult or a
        doctor.
      </footer>
    </div>
  )
}
