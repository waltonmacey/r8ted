// Edit gate. With Firebase configured: email/password sign-in, and edit mode
// only unlocks when the signed-in email matches VITE_OWNER_EMAIL (prototype pattern).
// Without Firebase: a simple local toggle, since localStorage mode is single machine anyway.

import { createContext, useContext, useEffect, useState } from 'react'
import { firebaseEnabled, getFirebase, OWNER_EMAIL } from './firebase'

const Ctx = createContext(null)

export function EditModeProvider({ children }) {
  const [canEdit, setCanEdit] = useState(false)
  const [authReady, setAuthReady] = useState(!firebaseEnabled)

  useEffect(() => {
    if (!firebaseEnabled) return
    let unsub = () => {}
    ;(async () => {
      const { onAuthStateChanged } = await import('firebase/auth')
      const { auth } = await getFirebase()
      unsub = onAuthStateChanged(auth, (user) => {
        setCanEdit(Boolean(user && OWNER_EMAIL && user.email === OWNER_EMAIL))
        setAuthReady(true)
      })
    })()
    return () => unsub()
  }, [])

  async function unlock(email, password) {
    if (!firebaseEnabled) {
      setCanEdit(true)
      return { ok: true }
    }
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await getFirebase()
      const cred = await signInWithEmailAndPassword(auth, email, password)
      if (OWNER_EMAIL && cred.user.email !== OWNER_EMAIL) {
        return { ok: false, error: 'Signed in, but this account is not the owner.' }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message || 'Sign-in failed.' }
    }
  }

  async function lock() {
    if (firebaseEnabled) {
      const { signOut } = await import('firebase/auth')
      const { auth } = await getFirebase()
      await signOut(auth)
    }
    setCanEdit(false)
  }

  return (
    <Ctx.Provider value={{ canEdit, unlock, lock, authReady, firebaseEnabled }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEditMode() {
  return useContext(Ctx)
}
