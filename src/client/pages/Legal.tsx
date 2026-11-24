import type { ReactNode } from 'react'
import { Link } from '../router'
import { Logo } from '../components/Logo'
import { SiteHeader } from '../components/SiteHeader'

// Single place to change the contact address shown on both pages.
const CONTACT = 'royayush1901@gmail.com'
const UPDATED = '24 November 2026'

function LegalLayout({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede: string
  children: ReactNode
}) {
  return (
    <div>
      <SiteHeader />
      <main className="legal-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="dash-lede">{lede}</p>
        <p className="legal-meta">Last updated {UPDATED}</p>
        <div className="article-body">{children}</div>
        <p className="legal-back">
          <Link to="/" className="text-link">
            ← Back to Sakhicycle
          </Link>
        </p>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Logo />
            <p className="footer-note">Education and tracking, not medical advice.</p>
          </div>
          <div className="footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function Privacy() {
  return (
    <LegalLayout
      eyebrow="Privacy"
      title="Privacy policy"
      lede="Sakhicycle holds some of the most personal information there is. Here is exactly what we keep, why, and how to get rid of it."
    >
      <section>
        <h2>The short version</h2>
        <p>
          We store what a cycle tracker needs to work: your sign-in details, the days you log, and the messages you send the
          guide. We do not sell it, we do not show ads, and your messages are never sent to an AI provider. You can delete
          everything from inside the app whenever you want.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul className="legal-list">
          <li>
            <strong>Account details.</strong> When you sign in with Google we receive your name, your email address, a Google
            account identifier and whether Google has verified that address. We never see your Google password.
          </li>
          <li>
            <strong>Cycle logs.</strong> For every day you record: the date, whether you were bleeding, the flow, any symptoms
            or mood you pick, and any note you write. Also your cycle length and period length settings.
          </li>
          <li>
            <strong>Chat messages.</strong> What you type to the guide and the replies you receive, so the conversation is
            still there when you come back. A free chat started without an account is stored the same way, under a random
            identifier held in a cookie.
          </li>
        </ul>
      </section>

      <section>
        <h2>Technical information</h2>
        <p>
          We do not run advertising or analytics trackers, and we set no third-party cookies. Our hosting provider, Cloudflare,
          processes the technical details of each request (such as IP address, browser and time) in order to deliver the site
          and protect it from abuse. We use your IP address to apply rate limits; those counters are stored keyed by address
          and expire on their own.
        </p>
      </section>

      <section>
        <h2>Cookies we set</h2>
        <ul className="legal-list">
          <li>
            <strong>sakh_session</strong> — keeps you signed in. Lasts 30 days, not readable by scripts.
          </li>
          <li>
            <strong>sakh_guest</strong> — remembers a free chat started without an account. Lasts 24 hours.
          </li>
          <li>
            <strong>sakh_oauth_state</strong> — a one-time value that protects the Google sign-in step. Lasts 10 minutes.
          </li>
        </ul>
        <p>
          We store a hash of each of these values, not the value itself, so a copy of our database cannot be replayed as
          someone&apos;s session.
        </p>
      </section>

      <section>
        <h2>Who else sees your data</h2>
        <ul className="legal-list">
          <li>
            <strong>Google</strong> handles the sign-in. It learns that you signed in to Sakhicycle and gives us your name,
            email and account identifier. Google&apos;s own privacy policy covers its side.
          </li>
          <li>
            <strong>Cloudflare</strong> hosts the site and stores the database on our behalf.
          </li>
          <li>
            <strong>Resend</strong>, if new-account notifications are switched on, sends the operator a short email containing
            a new account&apos;s name and email address. It never receives cycle logs or chat messages.
          </li>
        </ul>
        <p>We never sell or rent your information, and we never share it for advertising.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <ul className="legal-list">
          <li>A guest chat and its messages are removed within 24 hours.</li>
          <li>A sign-in session lasts 30 days, or until you sign out.</li>
          <li>Account details, logs, settings and messages stay until you delete your account.</li>
          <li>Rate-limit counters expire automatically within minutes to hours.</li>
        </ul>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          Open your account page and choose to delete your account, then type DELETE to confirm. That permanently removes your
          profile, your logs, your settings, your messages and your sessions at once. It cannot be undone, and we keep no
          copy. A guest chat can be cleared from the chat screen, and it expires on its own within a day.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can see and correct your name and your logs inside the app at any time, and you can remove everything as
          described above. If you would like a copy of what we hold, write to the address below and we will help.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          The site is served over HTTPS only, session cookies cannot be read by scripts and are never sent on plain HTTP, and
          sign-in tokens are stored hashed. There are no passwords to protect because sign-in happens entirely through
          Google.
        </p>
      </section>

      <section>
        <h2>Younger users</h2>
        <p>
          Sakhicycle is written for teenagers as well as adults, but it is not directed at children under 13. If you are below
          the age at which you can agree to a service like this where you live, please use it with a parent or guardian.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If what we collect or how we use it changes, we will update this page and its date, and point out anything
          significant in the app.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy, or a request about your data: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </LegalLayout>
  )
}

export function Terms() {
  return (
    <LegalLayout
      eyebrow="Terms"
      title="Terms of use"
      lede="The plain-language agreement for using Sakhicycle. Nothing here is meant to catch you out."
    >
      <section>
        <h2>What Sakhicycle is</h2>
        <p>
          Sakhicycle is a period tracker and an education tool. You log days, it works out roughly where you are in your cycle,
          and a written guide answers common questions. It is not a medical device, it does not diagnose anything, and it is
          not a method of contraception.
        </p>
      </section>

      <section>
        <h2>Who can use it</h2>
        <p>
          You need to be at least 13. If you are below the age at which you can agree to a service like this where you live,
          use Sakhicycle with a parent or guardian&apos;s agreement.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          Accounts are created through Google sign-in only. Keep access to your Google account secure, because anyone who can
          use it can use your Sakhicycle account. One account per person, please, and use your own details.
        </p>
      </section>

      <section>
        <h2>Free chats without an account</h2>
        <p>
          You can talk to the guide for three minutes, or up to 24 messages, without signing up. If you then create an
          account, that conversation moves across with you. We may change these limits.
        </p>
      </section>

      <section>
        <h2>Using it fairly</h2>
        <ul className="legal-list">
          <li>Do not use Sakhicycle for anything unlawful, or to harm or impersonate someone else.</li>
          <li>Do not attempt to break, overload or probe the service, or access another person&apos;s account or data.</li>
          <li>Do not scrape, copy or resell the guide&apos;s written content.</li>
          <li>Do not use it in a medical emergency — call your local emergency number instead.</li>
        </ul>
        <p>We may suspend an account that is used this way.</p>
      </section>

      <section>
        <h2>Not medical advice</h2>
        <p>
          Predictions are estimates calculated from the days you have logged, and they get less reliable with irregular cycles.
          The guide&apos;s answers are general education, not a diagnosis or a treatment plan. For anything that worries you,
          especially severe pain, very heavy bleeding or a missed period you cannot explain, talk to a doctor or a trusted
          adult.
        </p>
      </section>

      <section>
        <h2>Your content and ours</h2>
        <p>
          Your logs, notes and messages belong to you. You give us permission to store them and show them back to you, which
          is all we do with them. The app itself, its design, its writing and the guide&apos;s answers belong to us.
        </p>
      </section>

      <section>
        <h2>Availability and changes</h2>
        <p>
          Sakhicycle is free and offered as it is. We cannot promise it will always be available or that a feature will never
          change or be withdrawn. Where we can, we will give notice of significant changes in the app.
        </p>
      </section>

      <section>
        <h2>Ending your use</h2>
        <p>
          You can stop at any time — sign out, or delete your account and everything in it. We may close an account that
          breaks these terms.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          As far as the law allows, we are not liable for indirect or consequential loss arising from your use of Sakhicycle.
          Nothing in these terms limits rights you have under consumer law where you live, or liability that cannot lawfully
          be excluded.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>If these terms change, we will update this page and its date. Continuing to use Sakhicycle means accepting the
          current version.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Anything unclear, or a problem with your account: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
