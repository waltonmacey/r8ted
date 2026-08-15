// Power of Eight cards.
//
// Phase 6 (locked decision 1, second amendment): ranks 1 to 4 render as
// QuadCard, the compact row from r8ted-top4-poc.html variant 03, laid out 2x2
// on desktop and a single stack on mobile. The four row barcode treatment
// leaves the top 4 entirely. Tier 3 (ranks 5 to 8) is unchanged.
//
// TheOneCard below is the Phase 5 tier 1 hero and is no longer used on the list
// page. It is kept, unrendered, because the four row barcode treatment may want
// a home again later; the same is true of EntryCard, the Phase 5 tier 2 podium
// card. Blurbs do not render in any Power of Eight tier (POC); they stay
// editable in EntryEditor. The Edit affordance is retained app chrome the
// static POCs did not carry.

import { compositeText, entryImage, onImageError } from '../lib/entries'
import BarcodeRow from './BarcodeRow'
import RankNudge from './RankNudge'

// Ranks 1 to 4, POC variant 03. Geometry straight off the POC .qcard: 76px
// portrait, 42px rank column, 12px padding, so the whole row lands near 120px
// and all four together take about the height one Phase 5 podium card took.
// #1 adds an accent border, a faint accent wash, and a floating tier tag; the
// rows are otherwise identical. The POC hardcodes cyan for the wash because it
// demos Story & Screen; here it generalises to the domain accent, the same way
// Phase 5 generalised the cyan in every other card.
export function QuadCard({ entry, rank, accent, canEdit, onEdit, dragProps = {}, move = null }) {
  const lead = rank === 1
  return (
    <article
      className={`group relative flex items-stretch gap-[14px] rounded-lg border bg-surface-container-low p-3 transition-colors ${
        lead ? '' : 'border-outline-variant hover:border-[color:var(--accent)]'
      }`}
      style={
        lead
          ? {
              borderColor: accent,
              backgroundImage: `linear-gradient(90deg, ${accent}12, ${accent}04 55%, transparent)`,
              '--accent': accent,
            }
          : { '--accent': accent }
      }
      {...dragProps}
    >
      {lead && (
        <span
          className="absolute -top-[9px] left-3 bg-background px-2 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          The One
        </span>
      )}
      <span
        className="w-[42px] shrink-0 self-center text-center font-ui text-[1.6rem] font-black leading-none"
        style={{ color: accent }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      <div className="aspect-[4/5] w-[76px] shrink-0 overflow-hidden rounded-sm bg-surface-container-highest">
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt={entry.name}
          className="img-muted h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px]">
        <h3 className="font-display text-[1.15rem] font-semibold leading-[1.15]">{entry.name}</h3>
        <p className="font-mono text-[1.05rem] font-bold leading-none" style={{ color: accent }}>
          {compositeText(entry.scores)}
        </p>
        {entry.keyStat && (
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">{entry.keyStat}</p>
        )}
        {canEdit && (
          <button
            onClick={onEdit}
            className="focus-ring self-start font-mono text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
          >
            Edit
          </button>
        )}
      </div>
      <RankNudge move={move} accent={accent} />
    </article>
  )
}

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
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt={entry.name}
          className="img-muted h-full w-full object-cover"
          loading="lazy"
        />
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
export function CompactCard({ entry, rank, accent, canEdit, onEdit, dragProps = {}, move = null }) {
  return (
    <article
      className="group flex items-center gap-2.5 rounded-lg border border-outline-variant bg-surface-container-low p-2.5 transition-colors hover:border-[color:var(--accent)]"
      style={{ '--accent': accent }}
      {...dragProps}
    >
      <span className="w-[34px] shrink-0 text-center font-ui text-[1.4rem] font-black" style={{ color: accent }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-sm bg-surface-variant">
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt={entry.name}
          className="img-muted h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
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
      <RankNudge move={move} accent={accent} />
    </article>
  )
}
