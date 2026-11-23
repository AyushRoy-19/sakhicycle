import type { Env } from './env'
import { signupStats } from './db'
import { escapeHtml } from './html'

/** Constant-time compare so a wrong token reveals nothing through timing. */
function tokenMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < given.length; index += 1) {
    difference |= given.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
}

// Built per request: constructing a Response at module scope is disallowed in Workers.
function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function ago(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

function timestamp(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

const PAGE_STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 20px 56px; background: #171013; color: #f6e9ed;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .wrap { max-width: 980px; margin: 0 auto; }
  .top { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: 1.45rem; letter-spacing: -0.01em; }
  h1 span { color: #d63a64; }
  .muted { color: #b99aa4; font-size: 0.86rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 22px 0 26px; }
  .card { background: #21161b; border: 1px solid #3a2830; border-radius: 14px; padding: 14px 16px; }
  .card .big { font-size: 1.7rem; font-weight: 650; margin-top: 4px; }
  .panel { background: #21161b; border: 1px solid #3a2830; border-radius: 16px; padding: 18px; margin-bottom: 20px; }
  .panel h2 { margin: 0 0 14px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.12em; color: #d9b7c1; }
  .bars { display: flex; align-items: flex-end; gap: 8px; height: 130px; }
  .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
  .bar i { width: 100%; background: linear-gradient(180deg,#d63a64,#8d2244); border-radius: 6px 6px 3px 3px; min-height: 3px; }
  .bar b { font-size: 0.78rem; font-weight: 600; color: #f6e9ed; }
  .bar small { font-size: 0.68rem; color: #9c7a86; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th { text-align: left; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: #a5858f;
    padding: 0 10px 8px; font-weight: 600; }
  td { padding: 10px; border-top: 1px solid #33242c; vertical-align: top; }
  td.email { color: #f0dbe1; word-break: break-all; }
  td.time { color: #b99aa4; white-space: nowrap; }
  .empty { color: #b99aa4; padding: 6px 0 2px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem;
    border: 1px solid #4a333d; color: #d9b7c1; }
`

async function renderPage(env: Env): Promise<string> {
  const stats = await signupStats(env)
  const peak = Math.max(1, ...stats.daily.map((entry) => entry.count))

  // SQL returns the newest 14 days first; reverse so the newest day is on the right.
  const bars = stats.daily
    .slice()
    .reverse()
    .map((entry) => {
      const height = Math.max(entry.count > 0 ? 6 : 2, Math.round((entry.count / peak) * 92))
      const label = entry.day.slice(5).replace('-', '/')
      return `<div class="bar" title="${escapeHtml(entry.day)}: ${entry.count}">
        <b>${entry.count}</b><i style="height:${height}px"></i><small>${escapeHtml(label)}</small>
      </div>`
    })
    .join('')

  const rows = stats.recent
    .map(
      (user) => `<tr>
        <td>${escapeHtml(user.name)}</td>
        <td class="email">${escapeHtml(user.email)}</td>
        <td><span class="tag">${user.method === 'google' ? 'Google' : 'Password'}</span></td>
        <td class="time">${escapeHtml(ago(user.createdAt))}<br><span class="muted">${escapeHtml(timestamp(user.createdAt))}</span></td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sakhicycle — signups</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>Sa<span>khi</span>cycle <span style="color:#a5858f;font-size:0.9rem;font-weight:400">· owner view</span></h1>
    <div class="muted">Updated ${escapeHtml(timestamp(new Date().toISOString()))}</div>
  </div>

  <div class="cards">
    <div class="card"><div class="muted">Total accounts</div><div class="big">${stats.total}</div></div>
    <div class="card"><div class="muted">Last 24 hours</div><div class="big">${stats.last24h}</div></div>
    <div class="card"><div class="muted">Last 7 days</div><div class="big">${stats.last7d}</div></div>
    <div class="card"><div class="muted">Last 30 days</div><div class="big">${stats.last30d}</div></div>
  </div>

  <div class="panel">
    <h2>Signups per day</h2>
    <div class="bars">${bars}</div>
  </div>

  <div class="panel">
    <h2>Newest accounts</h2>
    ${
      stats.recent.length === 0
        ? '<div class="empty">No accounts yet.</div>'
        : `<table>
      <thead><tr><th>Name</th><th>Email</th><th>Method</th><th>Signed up</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
    }
  </div>
</div>
</body>
</html>`
}

/**
 * Secret-link dashboard. Without ADMIN_TOKEN set, or with the wrong token, the
 * route is indistinguishable from a missing page.
 */
export async function handleAdmin(env: Env, given: string): Promise<Response> {
  const expected = env.ADMIN_TOKEN
  if (!expected || !given || !tokenMatches(given, expected)) return notFound()
  return new Response(await renderPage(env), { status: 200, headers: PAGE_HEADERS })
}
