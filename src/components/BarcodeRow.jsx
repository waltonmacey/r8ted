// One thin labeled barcode stripe row per score dimension.
// Fill width = score / 10. Stripes come from the .barcode utility in tailwind.config.js.

export default function BarcodeRow({ label, score, accent }) {
  const pct = Math.min(100, Math.max(0, (Number(score) / 10) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate font-mono text-[10px] uppercase tracking-label text-mute">
        {label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden">
        <div className="barcode absolute inset-0 text-edge" aria-hidden="true" />
        <div
          className="barcode absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, color: accent }}
          aria-hidden="true"
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[11px] text-paper">
        {Number(score).toFixed(1)}
      </span>
    </div>
  )
}
