// Power of Eight card. Locked decision: big composite numeral plus four thin
// labeled barcode stripe rows, one per dimension, with optional free-text keyStat.
// (Flagged departure from the literal mockup's single hero stat.)
// Framing, rank numeral, hover behavior per design spec section 7; image
// treatment per section 6 (muted color at rest, full color on hover).
// The spec's cyan hover border and cyan numerals generalize to the domain
// accent, set as a CSS variable (cyan on Culture pages, matching the mockup).

import { compositeText, entryImage } from '../lib/entries'
import BarcodeRow from './BarcodeRow'

export default function EntryCard({ entry, rank, scoreLabels, accent, onEdit, canEdit }) {
  return (
    <article
      className="group relative flex flex-col gap-4 rounded border border-outline-variant bg-surface-container p-4 transition-colors hover:border-[color:var(--accent)]"
      style={{ '--accent': accent }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-variant">
        <img
          src={entryImage(entry)}
          alt={entry.name}
          className="img-muted h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute left-2 top-2 font-ui text-headline-lg font-black leading-none drop-shadow-md"
          style={{ color: accent }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <span
          className="absolute bottom-2 right-3 font-mono text-3xl font-bold leading-none"
          style={{ color: accent, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
        >
          {compositeText(entry.scores)}
        </span>
      </div>
      <div>
        <h3 className="font-display text-headline-lg-mobile leading-tight">{entry.name}</h3>
        {entry.blurb && <p className="mt-1 font-body text-body-md text-on-surface-variant">{entry.blurb}</p>}
      </div>
      <div className="mt-auto space-y-1.5 border-t border-outline-variant pt-3">
        {entry.scores.map((s, i) => (
          <BarcodeRow key={i} label={scoreLabels[i]} score={s} accent={accent} />
        ))}
        {entry.keyStat && (
          <p className="pt-2 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
            {entry.keyStat}
          </p>
        )}
      </div>
      {canEdit && (
        <button
          onClick={onEdit}
          className="focus-ring self-start font-mono text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
        >
          Edit
        </button>
      )}
    </article>
  )
}
