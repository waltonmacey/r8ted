// Landing. Domain cards keep the Phase 2 layout the owner prefers (accent
// top bar, slash-separated mono subcategory line, list count), recolored to
// the Ash 1 tokens. Phase 5 puts the featured list into the hero as a muted
// full-bleed background (owner picked this over a card row and a side visual,
// 2026-08-11, per r8ted-home-hero-poc.html tab 03): the leader entry's image
// runs behind Everything, R8ted. under heavy gradients, a small chip names
// the list, and multiple featured lists crossfade on a timer. Fed by the
// featured flag toggled on each list page; editorial content is owner-only,
// nothing is seeded. Also hosts the one-time localStorage to Firestore
// migration button (edit-mode-only, guarded, see lib/migrate.js).

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DOMAINS } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import { rankedEntries, compositeText, entryImage, onImageError } from '../lib/entries'
import { migrationCandidates, migrateLocalToFirestore } from '../lib/migrate'
import { useEditMode } from '../lib/EditMode'

export default function Home() {
  const { canEdit } = useEditMode()
  const [lists, setLists] = useState([])
  const [slide, setSlide] = useState(0)
  useEffect(() => {
    getStorage().getLists().then(setLists)
  }, [])

  // Featured hero only works with a leader image to show.
  const featured = lists.filter((l) => l.featured && rankedEntries(l.entries).length > 0)

  useEffect(() => {
    if (featured.length < 2) return undefined
    const t = setInterval(() => setSlide((s) => s + 1), 7000)
    return () => clearInterval(t)
  }, [featured.length])

  const active = featured.length ? slide % featured.length : 0
  const current = featured[active]
  const currentLeader = current ? rankedEntries(current.entries)[0] : null

  return (
    <div>
      <section className="relative -mx-4 overflow-hidden border-b border-outline-variant px-4 py-16 sm:py-24 lg:-mx-16 lg:px-16">
        {/* Featured backdrop: leader imagery kept deliberately quiet (low
            opacity, saturation cut) so the hero type stays the subject. */}
        {featured.map((l, i) => {
          const leader = rankedEntries(l.entries)[0]
          return (
            <div
              key={l.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden="true"
            >
              <img
                src={entryImage(leader)}
                onError={onImageError(leader)}
                alt=""
                className="h-full w-full object-cover opacity-50 brightness-95 saturate-[.55]"
                // PHASE 9, owner decision: was 'center 22%', which anchored the
                // crop near the top of the frame. A 4:5 portrait covering a wide
                // hero overflows vertically by a large margin, so 22% showed the
                // upper fifth and cut everything below it. Centred is the honest
                // default until entries can carry their own focal point.
                style={{ objectPosition: 'center center' }}
              />
            </div>
          )
        })}
        {featured.length > 0 && (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/45 to-background/10"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"
              aria-hidden="true"
            />
          </>
        )}
        <div className="relative">
          <p className="eyebrow">A personal ranking system</p>
          <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-display">
            Everything,
            <br />
            R8ted.
          </h1>
          <p className="mt-5 max-w-xl font-body text-body-lg text-on-surface-variant">
            Four scores per entry, one composite, eight cards at the top. The rest live beyond the eight.
          </p>
          {current && currentLeader && (
            <Link
              to={`/list/${current.id}`}
              className="focus-ring mt-6 inline-flex flex-wrap items-center gap-2 rounded-sm border border-secondary-container/30 bg-surface/50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-secondary-container backdrop-blur transition-colors hover:border-secondary-container/60"
            >
              <span>Featured</span>
              <span className="text-outline-variant">/</span>
              <span>{current.title}</span>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface-variant">
                01 {currentLeader.name} {compositeText(currentLeader.scores)}
              </span>
            </Link>
          )}
          {canEdit && featured.length === 0 && (
            <p className="mt-6 font-mono text-[11px] text-on-surface-variant">
              No featured lists yet. Feature one from its list page to put its imagery behind this hero.
            </p>
          )}
        </div>
      </section>

      {canEdit && <MigrationPanel onDone={() => getStorage().getLists().then(setLists)} />}

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {DOMAINS.map((d) => {
          const count = lists.filter((l) => l.domainId === d.id).length
          return (
            <Link
              key={d.id}
              to={`/domain/${d.id}`}
              className="group focus-ring relative rounded border border-outline-variant bg-surface-container p-6 transition-colors hover:border-[color:var(--accent-50)] hover:bg-surface-container-high"
              style={{ '--accent-50': `${d.accent}80` }}
            >
              <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: d.accent }} />
              <h2 className="font-ui text-2xl font-bold tracking-tight">{d.name}</h2>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                {d.subcategories.map((s) => s.name).join(' / ')}
              </p>
              <p className="mt-6 font-mono text-label-mono text-on-surface-variant">
                {count} {count === 1 ? 'list' : 'lists'}
              </p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

// One-time localStorage to Firestore migration (Phase 3 remainder). Renders
// only in edit mode, only when the Firestore adapter is live, only while
// unmigrated localStorage lists exist. Never overwrites a Firestore doc.
function MigrationPanel({ onDone }) {
  const [candidates, setCandidates] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    setCandidates(migrationCandidates())
  }, [])

  if (!candidates && !result) return null

  async function run() {
    setBusy(true)
    const r = await migrateLocalToFirestore()
    setBusy(false)
    setResult(r)
    setCandidates(null)
    onDone()
  }

  return (
    <section className="mt-12 rounded border border-outline-variant bg-surface-container-low p-5">
      <p className="eyebrow">One-time migration</p>
      {result ? (
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Done. {result.migrated} {result.migrated === 1 ? 'list' : 'lists'} migrated to Firestore,{' '}
          {result.skipped} skipped (already there). This button will not appear again on this browser.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-xl font-body text-sm text-on-surface-variant">
            Found {candidates.length} {candidates.length === 1 ? 'list' : 'lists'} in this browser's
            localStorage from before Firestore. Copy them in? Lists already in Firestore are never
            overwritten.
          </p>
          <button onClick={run} disabled={busy} className="focus-ring btn-primary mt-4 disabled:opacity-40">
            {busy ? 'Migrating' : 'Migrate to Firestore'}
          </button>
        </>
      )}
    </section>
  )
}
