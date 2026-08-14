// Edit gate. PHASE 9: password only.
//
// The gate used to ask for an owner email and a password. The email was always
// the same value, and that value is already a build time constant: firebase.js
// reads VITE_OWNER_EMAIL and exports it as OWNER_EMAIL, and EditMode then checks
// the signed in user's email against it. Typing it in on a phone bought nothing.
//
// So the email field is gone and OWNER_EMAIL is submitted with the password.
// Nothing about what Firebase verifies has changed: the same
// signInWithEmailAndPassword call runs with the same two values, and the same
// owner check runs after it. This is a form change, not an auth change.
//
// FALLBACK, and it matters at deploy time. If VITE_OWNER_EMAIL is not set in the
// build environment while Firebase is configured, there is no email to sign in
// with and password only cannot work at all. In that case the email field comes
// back with an explicit note, rather than the gate silently failing.
//
// The modal itself is positioned by a `fixed inset-0` overlay. It renders as a
// sibling of the nav header, NOT inside it: the header carries backdrop-blur,
// and a backdrop-filter establishes a containing block for fixed descendants,
// which used to pin this panel to the header's 64px box. See the note in Nav.jsx.

import { useEffect, useRef, useState } from 'react'
import { useEditMode } from '../lib/EditMode'
import { OWNER_EMAIL } from '../lib/firebase'

export default function PasswordGate({ onClose }) {
  const { unlock, firebaseEnabled } = useEditMode()
  const needsEmail = firebaseEnabled && !OWNER_EMAIL
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const first = useRef(null)

  // Opening the gate should put the caret where the only thing to type goes.
  useEffect(() => {
    first.current?.focus()
  }, [])

  async function submit() {
    setBusy(true)
    setError('')
    const res = await unlock(needsEmail ? email.trim() : OWNER_EMAIL || '', password)
    setBusy(false)
    if (res.ok) onClose()
    else setError(res.error)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit mode"
    >
      <div
        className="w-full max-w-sm rounded border border-outline-variant bg-surface-container p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-headline-md font-semibold">Edit mode</h2>
        {firebaseEnabled ? (
          <div className="mt-4 space-y-3">
            {needsEmail ? (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-tertiary">
                  VITE_OWNER_EMAIL is not set in this build, so the owner address has to be typed.
                </p>
                <input
                  ref={first}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Owner email"
                  autoComplete="username"
                  className={inp}
                />
              </>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant">
                {OWNER_EMAIL}
              </p>
            )}
            <input
              ref={needsEmail ? undefined : first}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Password"
              autoComplete="current-password"
              className={inp}
            />
          </div>
        ) : (
          <p className="mt-3 font-body text-sm text-on-surface-variant">
            Firebase is not configured, so data lives in this browser. Unlock to edit locally.
          </p>
        )}
        {error && <p className="mt-3 font-mono text-xs text-error">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={submit} disabled={busy} className="focus-ring btn-primary disabled:opacity-50">
            {busy ? 'Checking' : 'Unlock'}
          </button>
          <button
            onClick={onClose}
            className="focus-ring px-4 py-2 font-ui text-sm text-on-surface-variant hover:text-on-surface"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const inp =
  'focus-ring w-full border border-outline-variant bg-background px-3 py-2 font-body text-sm text-on-surface placeholder:text-on-surface-variant'
