import { useState } from 'react'
import { useAuth } from '../auth'
import { api, errorMessage } from '../lib/api'
import { navigate } from '../router'

export function AccountCard() {
  const { user, setUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const close = () => {
    setOpen(false)
    setConfirmText('')
    setPassword('')
    setError(null)
  }

  const removeAccount = async () => {
    setError(null)
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm.')
      return
    }
    if (user.hasPassword && password.length === 0) {
      setError('Enter your password to confirm.')
      return
    }

    setBusy(true)
    try {
      await api('/api/auth/account', {
        method: 'DELETE',
        body: { confirm: confirmText.trim(), password },
      })
      setUser(null)
      navigate('/')
    } catch (caught) {
      setError(errorMessage(caught, "That didn't go through. Nothing was deleted."))
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Account</h2>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className="stat">
          <span>Signed in with</span>
          <strong>{user.hasPassword ? 'Email and password' : 'Google'}</strong>
        </div>
      </div>

      {!open ? (
        <div className="form-actions">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setOpen(true)}>
            Delete account
          </button>
        </div>
      ) : (
        <div className="danger-zone">
          <p>
            <strong>This cannot be undone.</strong> Your cycle logs, symptoms, notes, settings and chat history will be
            erased from Sakhicycle, and you will be signed out.
          </p>

          <div className="field">
            <label className="label" htmlFor="confirm-delete">
              Type DELETE to confirm
            </label>
            <input
              id="confirm-delete"
              className="input"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              placeholder="DELETE"
            />
          </div>

          {user.hasPassword && (
            <div className="field">
              <label className="label" htmlFor="delete-password">
                Your password
              </label>
              <input
                id="delete-password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Confirm it is you"
              />
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-danger" onClick={() => void removeAccount()} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={close} disabled={busy}>
              Keep my account
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
