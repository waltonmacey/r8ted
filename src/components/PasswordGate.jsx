import { useState } from 'react'
import { useEditMode } from '../lib/EditMode'

export default function PasswordGate({ onClose }) {
  const { unlock, firebaseEnabled } = useEditMode()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    const res = await unlock(email, password)
    setBusy(false)
    if (res.ok) onClose()
    else setError(res.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-5" onClick={onClose}>
      <div
        className="w-full max-w-sm border border-edge bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold">Edit mode</h2>
        {firebaseEnabled ? (
          <div className="mt-4 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Owner email"
              className="focus-ring w-full border border-edge bg-ink px-3 py-2 font-body text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Password"
              className="focus-ring w-full border border-edge bg-ink px-3 py-2 font-body text-sm"
            />
          </div>
        ) : (
          <p className="mt-3 font-body text-sm text-mute">
            Firebase is not configured, so data lives in this browser. Unlock to edit locally.
          </p>
        )}
        {error && <p className="mt-3 font-mono text-xs text-lifestyle">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={submit}
            disabled={busy}
            className="focus-ring border border-paper px-4 py-2 font-ui text-sm font-medium hover:bg-paper hover:text-ink disabled:opacity-50"
          >
            {busy ? 'Checking' : 'Unlock'}
          </button>
          <button onClick={onClose} className="focus-ring px-4 py-2 font-ui text-sm text-mute hover:text-paper">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
