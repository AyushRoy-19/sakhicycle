import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'sakh-theme'
const MOTION_KEY = 'sakh-motion'
const LEGACY_THEME_KEY = 'ska-theme'
const LEGACY_MOTION_KEY = 'ska-motion'

/** Moves preferences stored under the old prefix, so saved theme and motion survive. */
function migratePreferences(): void {
  try {
    const pairs: Array<[string, string]> = [
      [THEME_KEY, LEGACY_THEME_KEY],
      [MOTION_KEY, LEGACY_MOTION_KEY],
    ]
    for (const [next, previous] of pairs) {
      const legacy = localStorage.getItem(previous)
      if (legacy === null) continue
      if (localStorage.getItem(next) === null) localStorage.setItem(next, legacy)
      localStorage.removeItem(previous)
    }
  } catch {
    /* storage blocked: nothing to migrate */
  }
}

migratePreferences()

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

function readMotion(): boolean {
  return document.documentElement.getAttribute('data-motion') !== 'off'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage can be blocked; the theme still applies for this session */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), [])

  return { theme, toggle }
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.6" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
          </g>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span>{dark ? 'Light' : 'Dark'}</span>
    </button>
  )
}

/** Heart animation is on by default; this is the only thing that turns it off. */
export function MotionToggle() {
  const [enabled, setEnabled] = useState(readMotion)

  useEffect(() => {
    document.documentElement.setAttribute('data-motion', enabled ? 'on' : 'off')
    try {
      localStorage.setItem(MOTION_KEY, enabled ? 'on' : 'off')
    } catch {
      /* storage can be blocked; the preference still applies for this session */
    }
  }, [enabled])

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setEnabled((current) => !current)}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn the heart animation off' : 'Turn the heart animation on'}
      title={enabled ? 'Turn the heart animation off' : 'Turn the heart animation on'}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.6 12h3.6l2.3-5 3.4 10 2.5-5h6.9" />
        {!enabled && <path d="M4.2 19.8 19.8 4.2" />}
      </svg>
      <span>{enabled ? 'Motion on' : 'Motion off'}</span>
    </button>
  )
}
