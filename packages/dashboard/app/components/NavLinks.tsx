'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="nav-links">
      <Link
        href="/sessions"
        className={`nav-link ${pathname && pathname.startsWith('/sessions') ? 'active' : ''}`}
      >
        Sessions
      </Link>
      <Link
        href="/heatmap"
        className={`nav-link ${pathname && pathname.startsWith('/heatmap') ? 'active' : ''}`}
      >
        Heatmap
      </Link>
    </div>
  )
}

export default NavLinks
