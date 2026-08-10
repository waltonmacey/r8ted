// Catalog-first list creation (core commitment). Setup form: title, tagline,
// 4 score labels inherited from subcategory defaults (editable), catalog picker.
// Then straight into a duel session. Catalog items land on the Bench until scored.

import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { getDomain, getSubcategory } from '../lib/taxonomy'
import { catalogsForSubcategory, suggestKeyStat } from '../lib/catalogLoader'
import { getStorage } from '../lib/storage'
import { makeId } from '../lib/entries'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

export default function NewList() {
  const { domainId, subId } = useParams()
  const navigate = useNavigate()
  const { canEdit } = useEditMode()
  const domain = getDomain(domainId)
  const sub = getSubcategory(domainId, subId)
  const catalogs = catalogsForSubcategory(subId)

  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [labels, setLabels] = useState(sub ? sub.defaultScoreLabels.slice() : ['', '', '', ''])
  const [catalogId, setCatalogId] = useState(catalogs[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  if (!domain || !sub) return <NotFound label="subcategory" />
  if (!canEdit)
    return (
      <div className="py-20">
        <h1 className="font-display text-headline-md">Edit mode required.</h1>
        <p className="mt-2 font-body text-on-surface-variant">Unlock edit mode from the nav to create a list.</p>
      </div>
    )

  async function create() {
    setBusy(true)
    const catalog = catalogs.find((c) => c.id === catalogId)
    const entries = (catalog?.items ?? []).map((item) => ({
      id: makeId(),
      name: item.name,
      blurb: '',
      keyStat: suggestKeyStat(item),
      imageUrl: item.imageUrl || '',
      scores: null, // Bench until scored in the duel
      catalogItemRef: `${catalog.id}:${item.name}`,
    }))
    const list = {
      id: makeId(),
      title: title.trim(),
      tagline: tagline.trim(),
      domainId,
      subId,
      scoreLabels: labels.map((l) => l.trim() || '-'),
      catalogId: catalog?.id ?? null,
      entries,
    }
    await getStorage().saveList(list)
    navigate(entries.length >= 2 ? `/session/${list.id}` : `/list/${list.id}`)
  }

  return (
    <div className="py-12">
      <p className="eyebrow">
        <Link to={`/sub/${domainId}/${subId}`} className="focus-ring hover:text-on-surface">
          {sub.name}
        </Link>{' '}
        / New list
      </p>
      <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-headline-lg">New list</h1>

      <div className="mt-10 max-w-xl space-y-6">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} placeholder="Point Guards" />
        </Field>
        <Field label="Tagline">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inp} placeholder="The floor generals, ranked." />
        </Field>
        <div>
          <span className="eyebrow">Score labels (inherited from {sub.name}, editable)</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {labels.map((l, i) => (
              <input
                key={i}
                value={l}
                onChange={(e) =>
                  setLabels((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
                className={inp}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="eyebrow">Catalog</span>
          {catalogs.length === 0 ? (
            <p className="mt-2 font-body text-sm text-on-surface-variant">
              No catalog is tagged to {sub.name} yet. The list will start empty; add entries with + Custom.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {catalogs.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded border border-outline-variant bg-surface-container px-4 py-3 hover:border-secondary-container">
                  <input
                    type="radio"
                    name="catalog"
                    checked={catalogId === c.id}
                    onChange={() => setCatalogId(c.id)}
                  />
                  <span className="font-ui text-sm font-medium">{c.name}</span>
                  <span className="ml-auto font-mono text-xs text-on-surface-variant">{c.items.length} items</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 rounded border border-outline-variant bg-surface-container px-4 py-3 hover:border-secondary-container">
                <input type="radio" name="catalog" checked={catalogId === ''} onChange={() => setCatalogId('')} />
                <span className="font-ui text-sm font-medium">No catalog</span>
                <span className="ml-auto font-mono text-xs text-on-surface-variant">start empty</span>
              </label>
            </div>
          )}
        </div>
        <button
          onClick={create}
          disabled={busy || !title.trim()}
          className="focus-ring btn-primary disabled:opacity-40"
        >
          {catalogId ? 'Create and start dueling' : 'Create list'}
        </button>
      </div>
    </div>
  )
}

const inp =
  'focus-ring w-full border border-outline-variant bg-background px-3 py-2 font-body text-sm text-on-surface placeholder:text-on-surface-variant'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
