// One-time localStorage to Firestore migration (Phase 3 remainder, ships in
// Phase 5 so old lists never straddle two schema generations). Edit-mode-only
// UI lives on the home page. Guards: only offered when the Firestore adapter
// is active, only runs once per browser (flag), and never overwrites an
// existing Firestore doc (existence check before every write).

import { getStorage, LS_KEY } from './storage'

const MIGRATED_FLAG = 'r8ted:migrated:firestore-v1'

// Returns the localStorage lists eligible for migration, or null when the
// button should not appear (local adapter active, already migrated, nothing
// stored, or unparseable storage).
export function migrationCandidates() {
  if (getStorage().kind !== 'firestore') return null
  if (localStorage.getItem(MIGRATED_FLAG)) return null
  try {
    const lists = JSON.parse(localStorage.getItem(LS_KEY)) || []
    return lists.length > 0 ? lists : null
  } catch {
    return null
  }
}

export async function migrateLocalToFirestore() {
  const lists = migrationCandidates() || []
  const storage = getStorage()
  let migrated = 0
  let skipped = 0
  for (const list of lists) {
    const existing = await storage.getList(list.id)
    if (existing) {
      skipped += 1
      continue
    }
    await storage.saveList(list)
    migrated += 1
  }
  localStorage.setItem(MIGRATED_FLAG, '1')
  return { migrated, skipped }
}
