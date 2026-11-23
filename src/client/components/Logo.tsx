import { Link } from '../router'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="Sakhicycle home">
      <span className="brand-mark" aria-hidden="true">
        <svg className="heart" width="15" height="15" viewBox="0 0 24 24">
          <path
            d="M12 20.6C10.7 19.7 3.2 14.9 3.2 9.6a4.9 4.9 0 0 1 8.8-3 4.9 4.9 0 0 1 8.8 3c0 5.3-7.5 10.1-8.8 11Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span>Sakhicycle</span>
    </Link>
  )
}
