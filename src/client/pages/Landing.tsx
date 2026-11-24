import { useState } from 'react'
import type { Phase } from '../../shared/types'
import { addDays, formatShort, parseIso, todayIso } from '../lib/dates'
import { Link } from '../router'
import { CycleRing } from '../components/CycleRing'
import { Logo } from '../components/Logo'
import { SiteHeader } from '../components/SiteHeader'

const FEATURES = [
  {
    title: 'Track it in ten seconds',
    body: 'Mark the days you bleed, then add cramps or mood when you remember. Your calendar fills itself in.',
  },
  {
    title: 'Learn without being lectured',
    body: 'Short, plain reads on cramps, products, school days and when to ask a doctor.',
  },
  {
    title: 'Ask, then ask again',
    body: 'The guide knows where you are in your cycle, so the answers fit your week, not a textbook.',
  },
]

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const PHASE_NAME: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
  unknown: 'Not enough data',
}

const phaseOf = (cycleDay: number): Phase =>
  cycleDay <= 5 ? 'menstrual' : cycleDay <= 13 ? 'follicular' : cycleDay <= 16 ? 'ovulation' : 'luteal'

const dayOfCycle = (cycleDay: number, offset: number) => (((cycleDay + offset - 1) % 28) + 28) % 28 + 1

export function Landing() {
  const today = todayIso()
  const yearStart = `${today.slice(0, 4)}-01-01`
  const dayOfYear = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${yearStart}T00:00:00Z`)) / 86_400_000)
  const cycleDay = (dayOfYear % 28) + 1
  const daysUntil = 28 - cycleDay + 1
  const nextPeriod = addDays(today, daysUntil)
  const todayIndex = (parseIso(today).getDay() + 6) % 7

  const [activeOffset, setActiveOffset] = useState(0)
  const activeCycleDay = dayOfCycle(cycleDay, activeOffset)
  const activePhase = phaseOf(activeCycleDay)
  const activeDate = addDays(today, activeOffset)

  const week = WEEKDAYS.map((letter, index) => {
    const offset = index - todayIndex
    const day = dayOfCycle(cycleDay, offset)
    return {
      letter,
      offset,
      day,
      bleeding: day <= 5,
      predicted: day >= 26,
    }
  })

  return (
    <div>
      <SiteHeader />

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Period tracking &amp; a guide that answers</p>
            <h1>Your period, understood.</h1>
            <p className="lede">
              A calm place to track your cycle, learn what is really going on, and ask the questions you would rather not
              say out loud.
            </p>
            <div className="hero-actions">
              <Link to="/chat" className="btn btn-primary">
                Chat free for 3 minutes
              </Link>
              <Link to="/signup" className="btn btn-ghost">
                Create an account
              </Link>
            </div>
            <div className="hero-trust">
              <span>No account needed to chat</span>
              <span>No ads, ever</span>
              <span>Private by default</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-head">
              <div className="panel-meta">
                <span className="panel-label">Cycle overview</span>
                <strong>
                  {activeOffset === 0
                    ? 'Today'
                    : parseIso(activeDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                </strong>
              </div>
              <span className="pill-phase" data-phase={activePhase}>
                {PHASE_NAME[activePhase]}
              </span>
            </div>

            <div className="panel-main">
              <CycleRing cycleDay={activeCycleDay} cycleLength={28} phase={activePhase} size={148} />
              <div className="panel-stats">
                <div>
                  <span>Next period</span>
                  <strong>{daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}</strong>
                </div>
                <div>
                  <span>Expected</span>
                  <strong>{formatShort(nextPeriod)}</strong>
                </div>
                <div>
                  <span>Cycle day</span>
                  <strong>
                    {activeCycleDay} of 28
                  </strong>
                </div>
              </div>
            </div>

            <div className="panel-week" role="group" aria-label="Try a week of the tracker">
              {week.map((entry) => {
                const classes = ['panel-day']
                if (entry.bleeding) classes.push('is-bleeding')
                else if (entry.predicted) classes.push('is-predicted')
                return (
                  <button
                    key={`${entry.letter}-${entry.offset}`}
                    type="button"
                    className={classes.join(' ')}
                    aria-pressed={entry.offset === activeOffset}
                    aria-label={`Day ${entry.day} of the cycle`}
                    onClick={() => setActiveOffset(entry.offset)}
                  >
                    {entry.letter}
                    <em>{entry.day}</em>
                  </button>
                )
              })}
            </div>
            <p className="panel-note">
              {activeOffset === 0
                ? 'Tap any day above to move through the cycle.'
                : `${formatShort(activeDate)} · day ${activeCycleDay} · ${PHASE_NAME[activePhase].toLowerCase()}`}
            </p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">What you get</p>
            <h2>Everything you need. Nothing you don&apos;t.</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map((feature, index) => (
              <article key={feature.title} className="feature">
                <span className="feature-num">{String(index + 1).padStart(2, '0')}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-alt">
          <div className="split">
            <div>
              <p className="eyebrow">Try it first</p>
              <h2>Three free minutes. No account.</h2>
              <p className="split-lede">
                Ask about your first period, cramps, a late cycle or what to keep in your bag. When the three minutes are up,
                sign in and the conversation comes with you.
              </p>
              <ul className="check-list">
                <li>Start chatting straight away</li>
                <li>Your chat moves to your account when you sign in</li>
                <li>Answers point you to a doctor when it matters</li>
              </ul>
              <Link to="/chat" className="btn btn-primary">
                Start chatting
              </Link>
            </div>
            <div className="chat-preview" aria-hidden="true">
              <div className="preview-row">
                <span className="preview-avatar">You</span>
                <div className="preview-bubble preview-user">Why do I get cramps?</div>
              </div>
              <div className="preview-row">
                <span className="preview-avatar preview-bot">S</span>
                <div className="preview-bubble preview-bot-bubble">
                  Cramps are your uterus contracting to shed its lining. Heat for 15 to 20 minutes, gentle movement and steady
                  meals usually take the edge off.
                </div>
              </div>
              <div className="preview-chips">
                <span className="chip">Is my pain normal?</span>
                <span className="chip">Can I swim?</span>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-wrap">
          <div className="cta-band">
            <div>
              <h2>Start with today.</h2>
              <p>Log one day and Sakhicycle starts learning your rhythm.</p>
            </div>
            <Link to="/signup" className="btn btn-primary">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Logo />
            <p className="footer-note">
              Education and tracking, not medical advice. If something feels urgent, talk to a doctor or your local emergency
              service.
            </p>
          </div>
          <div className="footer-links">
            <Link to="/chat">Free chat</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
