import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LayoutDashboard, Package, Users, LogOut, Wrench, ExternalLink, Settings } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Kerja',     icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventori', icon: Package },
  { to: '/workers',   label: 'Pekerja',   icon: Users },
  { to: '/settings',  label: 'Tetapan',   icon: Settings },
]

export function Layout({ children }) {
  const { workshop, signOut } = useApp()

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top bar */}
      <div className="bg-canvas border-b border-hairline sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
              {workshop?.logo_url
                ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <Wrench className="w-4 h-4 text-white" />
              }
            </div>
            <p className="font-display font-bold text-ink text-sm truncate">{workshop?.name}</p>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-surface-dark text-on-dark'
                      : 'text-mute hover:text-ink hover:bg-surface-bone'
                  }`
                }>
                <Icon className="w-3.5 h-3.5" /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {workshop?.slug && (
              <a href={`/w/${workshop.slug}`} target="_blank" rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs text-mute hover:text-ink border border-hairline bg-surface-card px-3 py-2 rounded-full transition-colors font-semibold">
                <ExternalLink className="w-3 h-3" /> Paparan Pelanggan
              </a>
            )}
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-charcoal bg-surface-card hover:bg-surface-bone border border-hairline px-3 py-2 rounded-full transition-colors font-semibold">
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface-card border-t border-hairline z-30 safe-area-inset-bottom">
        <div className="flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-mute'
                }`
              }>
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sm:hidden h-16" />
    </div>
  )
}
