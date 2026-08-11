// Podium tiers 1 and 3 per POC tab 01 (Phase 5). Tier 2 (ranks 2-4) is
// EntryCard, reshaped to the POC pcard in the same pass. Blurbs do not render
// in any Power of Eight tier (POC); they stay editable in EntryEditor and can
// return in a later phase. The Edit affordance is retained app chrome the
// static POC did not carry.

import { compositeText, entryImage } from '../lib/entries'
import BarcodeRow from './BarcodeRow'

// Tier 1: The One. Full width hero card, domain accent border, biggest
// numeral, all four barcode rows, keyStat.
export function TheOneCard({ entry, scoreLabels, accent, canEdit, onEdit, dragProps = {} }) {
  return (
    <article
      className="group relative grid gap-6 rounded-lg border bg-surface-container p-5 sm:grid-cols-[minmax(220px,320px)_1fr]"
      style={{ borderColor: accent }}
      {...dragProps}
    >
      <div className="relative aspect-[4/5] max-w-[300px] overflow-hidden rounded-sm bg-surface-variant">
        <img src={entryImage(entry)} alt={entry.name} className="img-muted h-full w-full object-cover" loading="lazy" />
        <span
          className="absolute left-2.5 top-1.5 font-ui text-[4rem] font-black leading-none drop-shadow-md"
          style={{ color: accent }}
        >
          01
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: accent }}>
          The One
        </p>
        <h3 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.1] tracking-tight">
          {entry.name}
        </h3>
        <p className="font-mono text-[clamp(2.5rem,5vw,3.5rem)] font-bold leading-none" style={{ color: accent }}>
          {compositeText(entry.scores)}
        </p>
        <div className="mt-auto space-y-[7px] border-t border-outline-variant pt-3.5">
          {entry.scores.map((s, i) => (
            <BarcodeRow key={i} label={scoreLabels[i]} score={s} accent={accent} />
          ))}
          {entry.keyStat && (
            <p className="pt-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
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
      </div>
    </article>
  )
}

// Tier 3: ranks 5-8, compact rows. Composite and keyStat only, no barcode rows.
export function CompactCard({ entry, rank, accent, canEdit, onEdit, dragProps = {} }) {
  return (
    <article
      className="group flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-2.5 transition-colors hover:border-[color:var(--accent)]"
      style={{ '--accent': accent }}
      {...dragProps}
    >
      <span className="w-[34px] shrink-0 text-center font-ui text-[1.4rem] font-black" style={{ color: accent }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-sm bg-surface-variant">
        <img src={entryImage(entry)} alt={entry.name} className="img-muted h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-display text-[1.05rem] font-semibold leading-tight">{entry.name}</h3>
        <p className="mt-0.5 font-mono text-[0.95rem] font-bold leading-none" style={{ color: accent }}>
          {compositeText(entry.scores)}
        </p>
        {entry.keyStat && (
          <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
            {entry.keyStat}
          </p>
        )}
        {canEdit && (
          <button
            onClick={onEdit}
            className="focus-ring font-mono text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
          >
            Edit
          </button>
        )}
      </div>
    </article>
  )
}
