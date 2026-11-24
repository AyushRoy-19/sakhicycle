import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ChatMessage } from '../../shared/types'
import { ApiError, api, errorMessage } from '../lib/api'
import { todayIso } from '../lib/dates'
import { Link } from '../router'
import { Shell } from '../components/Shell'
import { SiteHeader } from '../components/SiteHeader'

const STARTERS = ['My first period is here', 'How do I stop cramps?', 'Is my cycle normal?', 'What do I keep in my bag?']

const mmss = (seconds: number) => {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

type ChatReply = { messages: ChatMessage[]; urgent?: boolean; remainingSeconds?: number }
type ChatFeed = { messages: ChatMessage[]; remainingSeconds?: number; limitReached?: boolean }

function RichText({ text }: { text: string }) {
  const blocks: Array<{ type: 'p'; lines: string[] } | { type: 'ul' | 'ol'; items: string[] }> = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const bullet = line.startsWith('•') || line.startsWith('- ')
    const numbered = /^\d+\.\s/.test(line)

    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      const item = bullet ? line.replace(/^[•\-]\s*/, '') : line.replace(/^\d+\.\s/, '')
      const last = blocks[blocks.length - 1]
      if (last && last.type === type) last.items.push(item)
      else blocks.push({ type, items: [item] })
    } else {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'p') last.lines.push(line)
      else blocks.push({ type: 'p', lines: [line] })
    }
  }

  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'p' ? (
          <p key={index}>{block.lines.join(' ')}</p>
        ) : block.type === 'ul' ? (
          <ul key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <ol key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ol>
        ),
      )}
    </>
  )
}

export function Chat({ guest = false }: { guest?: boolean }) {
  const today = todayIso()
  const endpoint = guest ? '/api/guest/chat' : '/api/chat'
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState(180)
  const [limitReached, setLimitReached] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    api<ChatFeed>(endpoint)
      .then((result) => {
        if (!active) return
        setMessages(result.messages)
        if (typeof result.remainingSeconds === 'number') setRemaining(result.remainingSeconds)
        if (result.limitReached) setLimitReached(true)
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, 'We could not open the chat. Try reloading.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [endpoint])

  // The free clock starts with the first message, matching the server.
  const started = messages.length > 0

  useEffect(() => {
    if (!guest || !started) return
    const id = window.setInterval(() => setRemaining((current) => (current > 0 ? current - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [guest, started])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const blocked = guest && (limitReached || (started && remaining <= 0))

  const send = async (value: string) => {
    const text = value.trim()
    if (!text || sending || blocked) return

    setInput('')
    setError(null)
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      role: 'user',
      content: text,
      suggestions: [],
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, optimistic])

    try {
      const result = await api<ChatReply>(endpoint, {
        method: 'POST',
        body: guest ? { message: text } : { message: text, today },
      })
      setMessages((current) => [...current.filter((message) => message.id !== tempId), ...result.messages])
      if (typeof result.remainingSeconds === 'number') {
        setRemaining(result.remainingSeconds)
        if (result.remainingSeconds <= 0) setLimitReached(true)
      }
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== tempId))
      if (caught instanceof ApiError && caught.status === 403) {
        setLimitReached(true)
        setRemaining(0)
        setError(caught.message)
      } else {
        setError(errorMessage(caught, 'That message did not send. Try again?'))
        setInput(text)
      }
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send(input)
    }
  }

  const clear = async () => {
    try {
      await api(endpoint, { method: 'DELETE' })
      setMessages([])
    } catch (caught) {
      setError(errorMessage(caught, 'We could not clear the chat.'))
    }
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')

  const thread = (
    <main className="chat-wrap">
      <div className="chat-card">
        <div className="chat-head">
          <div>
            <h1 className="card-title">Ask Sakhicycle</h1>
            <p className="card-sub">{guest ? 'Free for three minutes, no account needed.' : 'Education, not medical advice.'}</p>
          </div>
          {guest ? (
            <span className={`chat-countdown${blocked || remaining < 30 ? ' is-low' : ''}`}>
              {blocked ? 'Free time ended' : `${mmss(remaining)} left`}
            </span>
          ) : (
            messages.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void clear()}>
                Clear chat
              </button>
            )
          )}
        </div>

        <div className="chat-scroll">
          {loading && <p className="card-sub">Opening the chat…</p>}

          {!loading && messages.length === 0 && (
            <div className="chat-empty">
              <h2>Ask anything. No question is too small.</h2>
              <p>
                Cramps, first periods, products, late cycles: ask in your own words and you will get a straight answer.
              </p>
              <div className="suggestions suggestions-static">
                {STARTERS.map((starter) => (
                  <button key={starter} type="button" className="chip" onClick={() => void send(starter)} disabled={blocked}>
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`msg ${message.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
              <div className="msg-body">
                <RichText text={message.content} />
              </div>
              <span className="msg-time">
                {message.role === 'user' ? 'You' : 'Sakhicycle'} ·{' '}
                {new Date(message.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {sending && (
            <div className="msg msg-bot">
              <div className="msg-body">
                <p className="typing">Thinking it through…</p>
              </div>
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        {lastAssistant && lastAssistant.suggestions.length > 0 && !sending && !blocked && (
          <div className="suggestions">
            {lastAssistant.suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="chip" onClick={() => void send(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {blocked ? (
          <div className="chat-gate">
            <p className="eyebrow">Your free three minutes are up</p>
            <h3>Keep going with an account.</h3>
            <p>Sign in and this conversation comes with you, along with the tracker and the lessons.</p>
            <div className="form-actions">
              <Link to="/signup" className="btn btn-primary">
                Create an account
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="composer">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your question…"
              maxLength={800}
              rows={1}
              aria-label="Your message"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void send(input)}
              disabled={sending || input.trim().length === 0}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </main>
  )

  if (guest) {
    return (
      <div className="app-frame is-fixed">
        <SiteHeader />
        {thread}
        <footer className="app-footer">
          Sakhicycle is an education tool, not medical advice. For anything urgent, talk to a trusted adult or a doctor.
        </footer>
      </div>
    )
  }

  return <Shell fixed>{thread}</Shell>
}
