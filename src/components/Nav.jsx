// Nav per design spec section 7: fixed, z-50, h-16, bg-background/90 with
// backdrop-blur-md, 1px outline-variant bottom border. Links are label-mono
// uppercase tracking-widest in on-surface-variant, hover cyan; the active
// link is cyan with a 2px cyan bottom border.
//
// PHASE 9 BUG FIX, and the cause is not obvious. PasswordGate used to render
// INSIDE this header. The header carries backdrop-blur-md, and a backdrop-filter
// establishes a containing block for position: fixed descendants, so the gate's
// `fixed inset-0` resolved to the header's 64px tall box rather than to the
// viewport. Measured before the fix: the overlay was 1280x64 at desktop and
// 390x64 at mobile, and the panel's top edge sat at y=-65, hanging off the top
// of the screen at both widths. The gate now renders as a sibling of the header,
// which is the whole fix. Do not move it back inside.

import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { DOMAINS } from '../lib/taxonomy'
import { useEditMode } from '../lib/EditMode'
import PasswordGate from './PasswordGate'

const linkBase =
  'focus-ring flex h-16 items-center border-b-2 font-mono text-label-mono uppercase tracking-widest transition-colors'

function navClass({ isActive }) {
  return `${linkBase} ${
    isActive
      ? 'border-secondary-container text-secondary-container'
      : 'border-transparent text-on-surface-variant hover:text-secondary-container'
  }`
}

export default function Nav() {
  const { canEdit, lock } = useEditMode()
  const [gateOpen, setGateOpen] = useState(false)

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 lg:px-16">
        <Link to="/" className="focus-ring font-ui text-xl font-bold tracking-tight">
          R8<span className="text-on-surface-variant">ted</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {DOMAINS.map((d) => (
            <NavLink key={d.id} to={`/domain/${d.id}`} className={navClass}>
              {d.name}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {canEdit ? (
            <button
              onClick={lock}
              className="focus-ring font-mono text-label-mono uppercase tracking-widest text-on-surface-variant hover:text-secondary-container"
            >
              Lock edit mode
            </button>
          ) : (
            <button
              onClick={() => setGateOpen(true)}
              className="focus-ring font-mono text-label-mono uppercase tracking-widest text-on-surface-variant hover:text-secondary-container"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </header>
      {gateOpen && <PasswordGate onClose={() => setGateOpen(false)} />}
    </>
  )
}
