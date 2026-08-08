// Power of Eight card. Locked decision: big composite numeral plus four thin
// labeled barcode stripe rows, one per dimension, with optional free-text keyStat.
// (Flagged departure from the literal mockup's single hero stat.)

import { compositeText, entryImage } from '../lib/entries'
import BarcodeRow from './BarcodeRow'

export default function EntryCard({ entry, rank, scoreLabels, accent, onEdit, canEdit }) {
  return (
    <article className="group relative flex flex-col border border-edge bg-panel">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={entryImage(entry)}
          alt={entry.name}
          className="img-mono h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute left-3 top-2 font-ui text-5xl font-bold leading-none text-paper/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
          {String(rank).padStart(2, '0')}
        </span>
        <span
          className="absolute bottom-2 right-3 font-mono text-3xl font-bold leading-none"
          style={{ color: accent, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
        >
          {compositeText(entry.scores)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-xl font-semibold leading-tight">{entry.name}</h3>
          {entry.blurb && <p className="mt-1 font-body text-sm text-mute">{entry.blurb}</p>}
        </div>
        <div className="space-y-1.5">
          {entry.scores.map((s, i) => (
            <BarcodeRow key={i} label={scoreLabels[i]} score={s} accent={accent} />
          ))}
        </div>
        {entry.keyStat && (
          <p className="mt-auto border-t border-edge pt-2 font-mono text-[11px] uppercase tracking-label text-mute">
            {entry.keyStat}
          </p>
        )}
        {canEdit && (
          <button
            onClick={onEdit}
            className="focus-ring self-start font-mono text-[11px] uppercase tracking-label text-mute hover:text-paper"
          >
            Edit
          </button>
        )}
      </div>
    </article>
  )
}
