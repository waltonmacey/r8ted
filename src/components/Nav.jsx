import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useEditMode } from '../lib/EditMode'
import PasswordGate from './PasswordGate'

export default function Nav() {
  const { canEdit, lock } = useEditMode()
  const [gateOpen, setGateOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="focus-ring font-ui text-xl font-bold tracking-tight">
          R8<span className="text-mute">ted</span>
        </Link>
        <div className="flex items-center gap-4">
          {canEdit ? (
            <button onClick={lock} className="eyebrow focus-ring hover:text-paper">
              Lock edit mode
            </button>
          ) : (
            <button onClick={() => setGateOpen(true)} className="eyebrow focus-ring hover:text-paper">
              Edit
            </button>
          )}
        </div>
      </div>
      {gateOpen && <PasswordGate onClose={() => setGateOpen(false)} />}
    </header>
  )
}
