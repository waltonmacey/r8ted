// Footer per design spec section 7: surface-container-lowest, top border,
// py-12, oversized R8TED wordmark at 20% opacity, label-mono underlined links
// hovering to cyan, copyright in muted label-mono.

import { Link } from 'react-router-dom'
import { DOMAINS } from '../lib/taxonomy'

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-lowest py-12">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-8 px-4 lg:px-16">
        <p className="select-none font-ui text-6xl font-bold tracking-tight opacity-20 sm:text-8xl" aria-hidden="true">
          R8TED
        </p>
        <div className="flex flex-col items-start gap-4">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              to="/"
              className="focus-ring font-mono text-label-mono uppercase tracking-widest underline underline-offset-4 hover:text-secondary-container"
            >
              Home
            </Link>
            {DOMAINS.map((d) => (
              <Link
                key={d.id}
                to={`/domain/${d.id}`}
                className="focus-ring font-mono text-label-mono uppercase tracking-widest underline underline-offset-4 hover:text-secondary-container"
              >
                {d.name}
              </Link>
            ))}
          </nav>
          <p className="font-mono text-label-mono text-on-surface-variant">
            &copy; {new Date().getFullYear()} R8ted. Everything, R8ted.
          </p>
        </div>
      </div>
    </footer>
  )
}
