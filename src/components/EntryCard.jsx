// Tier 2 podium card (ranks 2-4) per POC tab 01, Phase 5 reshape of the
// original Power of Eight card. Rank numeral and composite overlay the image;
// name plus the four labeled barcode rows below. Blurb and keyStat no longer
// render at this tier (POC); both stay editable in EntryEditor. Framing,
// hover, and image treatment per design spec sections 6 and 7, with the
// cyan generalized to the domain accent as before.

import { compositeText, entryImage, onImageError } from '../lib/entries'
import BarcodeRow from './BarcodeRow'

export default function EntryCard({ entry, rank, scoreLabels, accent, onEdit, canEdit, dragProps = {} }) {
  return (
    <article
      className="group relative flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container p-4 transition-colors hover:border-[color:var(--accent)]"
      style={{ '--accent': accent }}
      {...dragProps}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-variant">
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt={entry.name}
          className="img-muted h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute left-2 top-1.5 font-ui text-[2.5rem] font-black leading-none drop-shadow-md"
          style={{ color: accent }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <span
          className="absolute bottom-2 right-2.5 font-mono text-[1.75rem] font-bold leading-none"
          style={{ color: accent, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
        >
          {compositeText(entry.scores)}
        </span>
      </div>
      <h3 className="font-display text-[1.6rem] font-semibold leading-[1.15]">{entry.name}</h3>
      <div className="mt-auto space-y-1.5 border-t border-outline-variant pt-2.5">
        {entry.scores.map((s, i) => (
          <BarcodeRow key={i} label={scoreLabels[i]} score={s} accent={accent} />
        ))}
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
