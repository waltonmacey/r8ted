// One rank step up or down. Phase 9.
//
// WHY THIS EXISTS. Reorder was drag only, built on the HTML5 drag and drop API:
// draggable=true plus onDragStart, onDragOver, onDrop. That API does not fire on
// touch devices at all, so reorder was not merely awkward on a phone, it was
// absent. Measured on the list page at 390: 11 draggable slots, zero touch or
// pointer handlers.
//
// Owner decision 2026-08-13, chosen over a dedicated reorder mode and over
// reimplementing drag on pointer events: a pair of chevrons on every ranked
// slot, at both widths, one rank step per tap. Drag stays exactly as it is on
// desktop, so this adds a second path rather than replacing the first. It also
// gives reorder a keyboard story for the first time, which neither of the other
// two options did.
//
// The cost, stated plainly: moving rank 8 to rank 1 is seven taps. If that
// turns out to be the common move rather than the rare one, the reorder mode
// alternative is the answer, not more chevrons.

const PATH_UP = 'M2 7.5 6 3.5 10 7.5'
const PATH_DOWN = 'M2 3.5 6 7.5 10 3.5'

function Chevron({ dir, disabled, onClick, accent, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // Ranked slots are drag sources and some are inside link or edit
        // regions, so a nudge must not bubble into either.
        e.stopPropagation()
        e.preventDefault()
        if (!disabled) onClick()
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`focus-ring flex h-[22px] w-[26px] items-center justify-center rounded-sm border transition-colors ${
        disabled
          ? 'cursor-default border-outline-variant/40 text-outline/30'
          : 'border-outline-variant text-on-surface-variant hover:border-[color:var(--nudge)] hover:text-on-surface'
      }`}
      style={{ '--nudge': accent }}
    >
      <svg viewBox="0 0 12 11" className="h-[11px] w-3" aria-hidden="true">
        <path
          d={dir === 'up' ? PATH_UP : PATH_DOWN}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
        />
      </svg>
    </button>
  )
}

// `move` is the object ListDetail hands down: { canUp, canDown, onMove }.
// Absent means not in edit mode, and nothing renders.
export default function RankNudge({ move, accent, layout = 'column' }) {
  if (!move) return null
  return (
    <div className={`flex shrink-0 gap-1 ${layout === 'column' ? 'flex-col self-center' : 'flex-row'}`}>
      <Chevron dir="up" disabled={!move.canUp} onClick={() => move.onMove(-1)} accent={accent} label="Move up one rank" />
      <Chevron
        dir="down"
        disabled={!move.canDown}
        onClick={() => move.onMove(1)}
        accent={accent}
        label="Move down one rank"
      />
    </div>
  )
}
