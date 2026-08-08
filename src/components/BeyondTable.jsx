import { compositeText } from '../lib/entries'

export default function BeyondTable({ entries, startRank, scoreLabels, accent, canEdit, onEdit }) {
  if (entries.length === 0) return null
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-semibold">Beyond the Eight</h2>
      <div className="mt-4 overflow-x-auto border border-edge">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-edge">
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-label text-mute">#</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-label text-mute">Name</th>
              {scoreLabels.map((l) => (
                <th key={l} className="hidden px-3 py-2 font-mono text-[10px] uppercase tracking-label text-mute sm:table-cell">
                  {l}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-label text-mute">
                Composite
              </th>
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className="border-b border-edge/60 last:border-0 hover:bg-panel">
                <td className="px-3 py-2.5 font-ui text-sm font-medium text-mute">
                  {String(startRank + i).padStart(2, '0')}
                </td>
                <td className="px-3 py-2.5 font-display text-base">{e.name}</td>
                {e.scores.map((s, j) => (
                  <td key={j} className="hidden px-3 py-2.5 font-mono text-xs text-mute sm:table-cell">
                    {Number(s).toFixed(1)}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: accent }}>
                  {compositeText(e.scores)}
                </td>
                {canEdit && (
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => onEdit(e)}
                      className="focus-ring font-mono text-[10px] uppercase tracking-label text-mute hover:text-paper"
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
