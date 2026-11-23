import { Link } from '../router'
import { MotionToggle, ThemeToggle } from '../theme'
import { Logo } from './Logo'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="nav">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          <Link to="/chat">Free chat</Link>
          <Link to="/signup">Tracker</Link>
          <Link to="/signup">Learn</Link>
        </nav>
        <div className="nav-actions">
          <MotionToggle />
          <ThemeToggle />
          <Link to="/login" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link to="/signup" className="btn btn-primary btn-sm">
            Create account
          </Link>
        </div>
      </div>
    </header>
  )
}
