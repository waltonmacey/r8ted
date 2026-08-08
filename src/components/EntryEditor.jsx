// Full entry CRUD in a modal. Delete uses a two-tap arm/confirm, no browser dialogs (POC behavior).

import { useState } from 'react'
import { clampScore, isScored } from '../lib/entries'

export default function EntryEditor({ entry, scoreLabels, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    name: entry.name || '',
    blurb: entry.blurb || '',
    keyStat: entry.keyStat || '',
    imageUrl: entry.imageUrl || '',
    scores: isScored(entry.scores) ? entry.scores.slice() : ['', '', '', ''],
  })
  const [armed, setArmed] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setScore = (i, v) =>
    setForm((f) => {
      const scores = f.scores.slice()
      scores[i] = v
      return { ...f, scores }
    })

  function save() {
    const scores = form.scores.every((s) => s !== '' && s !== null)
      ? form.scores.map(clampScore)
      : null
    onSave({ ...entry, ...form, scores })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-5" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-edge bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold">{entry.id ? 'Edit entry' : 'New entry'}</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} />
          </Field>
          <Field label="Blurb">
            <textarea value={form.blurb} onChange={(e) => set('blurb', e.target.value)} rows={2} className={inp} />
          </Field>
          <Field label="Key stat (optional)">
            <input value={form.keyStat} onChange={(e) => set('keyStat', e.target.value)} className={inp} />
          </Field>
          <Field label="Image URL (optional)">
            <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className={inp} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {scoreLabels.map((l, i) => (
              <Field key={i} label={`${l} (0-10)`}>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={form.scores[i]}
                  onChange={(e) => setScore(i, e.target.value)}
                  className={inp}
                />
              </Field>
            ))}
          </div>
          <p className="font-mono text-[11px] text-mute">
            Leave all four scores blank to keep this entry on the Bench.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={!form.name.trim()}
            className="focus-ring border border-paper px-4 py-2 font-ui text-sm font-medium hover:bg-paper hover:text-ink disabled:opacity-40"
          >
            Save
          </button>
          <button onClick={onClose} className="focus-ring px-3 py-2 font-ui text-sm text-mute hover:text-paper">
            Cancel
          </button>
          {entry.id && onDelete && (
            <button
              onClick={() => {
                if (!armed) return setArmed(true)
                onDelete(entry)
                onClose()
              }}
              className={`focus-ring ml-auto px-3 py-2 font-mono text-[11px] uppercase tracking-label ${
                armed ? 'bg-lifestyle text-ink' : 'text-mute hover:text-lifestyle'
              }`}
            >
              {armed ? 'Confirm delete' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const inp =
  'focus-ring w-full border border-edge bg-ink px-3 py-2 font-body text-sm text-paper placeholder:text-mute'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
