// Firebase is optional. The app runs on localStorage until these env vars exist.
// To enable Firestore + Auth, create a .env.local file in the repo root:
//
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
//   VITE_FIREBASE_PROJECT_ID=your-project
//   VITE_FIREBASE_APP_ID=...
//   VITE_OWNER_EMAIL=you@example.com
//
// Then restart the dev server / rebuild. Same pattern as the prototype.
// Everything here is dynamically imported so the Firebase SDK stays out of the
// bundle's critical path when it isn't configured.

const env = import.meta.env

export const firebaseEnabled = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID)

export const OWNER_EMAIL = env.VITE_OWNER_EMAIL || null

let cached = null
export async function getFirebase() {
  if (!firebaseEnabled) return null
  if (!cached) {
    const [{ initializeApp }, { getFirestore }, { getAuth }] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('firebase/auth'),
    ])
    const app = initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
    cached = { app, db: getFirestore(app), auth: getAuth(app) }
  }
  return cached
}
