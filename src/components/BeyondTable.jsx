// Beyond the Eight table per design spec section 7. Header row label-mono
// uppercase over a 2px rule; body rows body-md with 1px rules and py-4 cells;
// row hover fills surface-variant and turns the name to the accent (cyan on
// Culture pages, matching the mockup). Our score columns stand in for the
// mockup's era column; composite is the right-aligned mono accent value.

import { compositeText } from '../lib/entries'

export default function BeyondTable({ entries, startRank, scoreLabels, accent, canEdit, onEdit }) {
  if (entries.length === 0) return null
  return (
    <section className="mt-14">
      <h2 className="font-display text-headline-md font-semibold">Beyond the Eight</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-outline-variant">
              <th className="px-3 py-3 font-mono text-label-mono font-normal uppercase tracking-wider text-on-surface-variant">#</th>
              <th className="px-3 py-3 font-mono text-label-mono font-normal uppercase tracking-wider text-on-surface-variant">Name</th>
              {scoreLabels.map((l) => (
                <th key={l} className="hidden px-3 py-3 font-mono text-label-mono font-normal uppercase tracking-wider text-on-surface-variant md:table-cell">
                  {l}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-mono text-label-mono font-normal uppercase tracking-wider text-on-surface-variant">
                Composite
              </th>
              {canEdit && <th className="px-3 py-3" />}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr
                key={e.id}
                className="group border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-variant"
                style={{ '--accent': accent }}
              >
                <td className="px-3 py-4 font-mono text-label-mono text-on-surface-variant">
                  {String(startRank + i).padStart(2, '0')}
                </td>
                <td className="px-3 py-4 font-display text-body-md font-medium text-on-background transition-colors group-hover:text-[color:var(--accent)]">
                  {e.name}
                </td>
                {e.scores.map((s, j) => (
                  <td key={j} className="hidden px-3 py-4 font-mono text-xs text-on-surface-variant md:table-cell">
                    {Number(s).toFixed(1)}
                  </td>
                ))}
                <td className="px-3 py-4 text-right font-mono text-label-mono font-bold" style={{ color: accent }}>
                  {compositeText(e.scores)}
                </td>
                {canEdit && (
                  <td className="px-3 py-4 text-right">
                    <button
                      onClick={() => onEdit(e)}
                      className="focus-ring font-mono text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
