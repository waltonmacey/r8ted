// Storage adapter pattern, carried over from the prototype so multi user stays open.
// Interface: getLists(), getList(id), saveList(list), deleteList(id). All async.
// A list document: { id, title, tagline, domainId, subId, scoreLabels[4],
//   catalogId, entries: [{ id, name, blurb, keyStat, imageUrl, scores, catalogItemRef }] }

import { firebaseEnabled, getFirebase } from './firebase'
import { SEED_LISTS } from './seed'

const LS_KEY = 'r8ted:lists:v1'
const SEED_FLAG = 'r8ted:seeded:v1'
const TAXONOMY_MIGRATION_FLAG = 'r8ted:migrated:taxonomy-4x4'

function localAdapter() {
  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || []
    } catch {
      return []
    }
  }
  function writeAll(lists) {
    localStorage.setItem(LS_KEY, JSON.stringify(lists))
  }
  // One-time seed so a fresh install shows the point guards list immediately.
  if (!localStorage.getItem(SEED_FLAG)) {
    if (readAll().length === 0) writeAll(SEED_LISTS)
    localStorage.setItem(SEED_FLAG, '1')
  }
  // One-time migration to the locked 4x4 taxonomy (2026-08-10 handoff).
  // Owner decision: only the seeded Point Guards list ports (to Food & Sports >
  // Athletes & Legends, per the handoff compatibility check). Other lists made
  // under the old taxonomy keep their old refs and simply stop appearing.
  if (!localStorage.getItem(TAXONOMY_MIGRATION_FLAG)) {
    const all = readAll()
    const pg = all.find(
      (l) => l.id === 'seed-point-guards' || (l.catalogId === 'point-guards' && l.domainId === 'leisure')
    )
    if (pg) {
      pg.domainId = 'food-sports'
      pg.subId = 'athletes-legends'
      pg.scoreLabels = ['Peak', 'Longevity', 'Accolades', 'Impact']
      writeAll(all)
    }
    localStorage.setItem(TAXONOMY_MIGRATION_FLAG, '1')
  }
  return {
    kind: 'local',
    async getLists() {
      return readAll()
    },
    async getList(id) {
      return readAll().find((l) => l.id === id) || null
    },
    async saveList(list) {
      const all = readAll()
      const i = all.findIndex((l) => l.id === list.id)
      if (i >= 0) all[i] = list
      else all.push(list)
      writeAll(all)
      return list
    },
    async deleteList(id) {
      writeAll(readAll().filter((l) => l.id !== id))
    },
  }
}

function firestoreAdapter() {
  // Lazy: Firebase SDK loads only when this adapter is active.
  async function f() {
    const { db } = await getFirebase()
    const fns = await import('firebase/firestore')
    return { db, ...fns }
  }
  const COL = 'lists'
  return {
    kind: 'firestore',
    async getLists() {
      const { db, collection, getDocs } = await f()
      const snap = await getDocs(collection(db, COL))
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    },
    async getList(id) {
      const { db, doc, getDoc } = await f()
      const snap = await getDoc(doc(db, COL, id))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    },
    async saveList(list) {
      const { db, doc, setDoc } = await f()
      const { id, ...data } = list
      await setDoc(doc(db, COL, id), data)
      return list
    },
    async deleteList(id) {
      const { db, doc, deleteDoc } = await f()
      await deleteDoc(doc(db, COL, id))
    },
  }
}

let instance = null
export function getStorage() {
  if (!instance) instance = firebaseEnabled ? firestoreAdapter() : localAdapter()
  return instance
}
