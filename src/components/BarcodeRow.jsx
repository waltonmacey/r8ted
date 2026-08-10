// One thin labeled barcode stripe row per score dimension.
// Fill width = score / 10. Stripes come from the .barcode utility in
// tailwind.config.js, at the spec's exact geometry: 12px tall (h-3),
// 2px bar / 6px period, 0.3 opacity on the colored fill (spec section 7).
// The faint full-width track behind the fill is our addition so short bars
// keep their footprint; the mockup's single bar had no track.

export default function BarcodeRow({ label, score, accent }) {
  const pct = Math.min(100, Math.max(0, (Number(score) / 10) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden">
        <div className="barcode absolute inset-0 text-outline-variant opacity-30" aria-hidden="true" />
        <div
          className="barcode absolute inset-y-0 left-0 opacity-30"
          style={{ width: `${pct}%`, color: accent }}
          aria-hidden="true"
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[11px]" style={{ color: accent }}>
        {Number(score).toFixed(1)}
      </span>
    </div>
  )
}
