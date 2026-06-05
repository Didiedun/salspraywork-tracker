import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { LayoutDashboard, Package, Users, LogOut, ExternalLink, Settings, Menu, X, Globe } from 'lucide-react'

function Sidebar({ workshop, signOut, onClose }) {
  const { lang, setLang, t } = useLang()

  const navItems = [
    { to: '/dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/inventory', label: t('nav_inventory'), icon: Package },
    { to: '/workers',   label: t('nav_workers'),   icon: Users },
    { to: '/settings',  label: t('nav_settings'),  icon: Settings },
  ]

  const initial = workshop?.name?.[0]?.toUpperCase() || 'D'
  const logoEl = workshop?.logo_url
    ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
    : <span className="font-display font-bold text-white text-xs">{initial}</span>

  return (
    <div className="w-56 bg-surface-deep h-full flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoEl}
          </div>
          <div className="min-w-0">
            <p className="text-on-dark font-display font-bold text-sm leading-tight truncate">{workshop?.name || 'Digital Depot'}</p>
            <p className="text-on-dark/40 text-xs leading-tight">Digital Depot</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sm:hidden text-on-dark/50 hover:text-on-dark transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-on-dark/60 hover:text-on-dark hover:bg-white/5'
              }`
            }>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-2 py-3 border-t border-white/10 space-y-0.5 flex-shrink-0">
        {workshop?.slug && (
          <a href={`/w/${workshop.slug}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-on-dark/60 hover:text-on-dark hover:bg-white/5 transition-colors">
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            {t('nav_portal')}
          </a>
        )}
        <button
          onClick={() => setLang(lang === 'ms' ? 'en' : 'ms')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-on-dark/60 hover:text-on-dark hover:bg-white/5 transition-colors">
          <Globe className="w-4 h-4 flex-shrink-0" />
          {t('lang_other')}
        </button>
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-on-dark/60 hover:text-on-dark hover:bg-white/5 transition-colors">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {t('nav_logout')}
        </button>
      </div>
    </div>
  )
}

export function Layout({ children }) {
  const { workshop, signOut } = useApp()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* ── Desktop sidebar (always visible) ── */}
      <aside className="hidden sm:flex fixed inset-y-0 left-0 z-30 w-56 shadow-lg">
        <Sidebar workshop={workshop} signOut={signOut} onClose={null} />
      </aside>

      {/* ── Mobile off-canvas sidebar ── */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="relative z-50 flex w-56 shadow-xl">
            <Sidebar workshop={workshop} signOut={signOut} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 sm:ml-56">
        {/* Mobile top bar */}
        <div className="sm:hidden sticky top-0 z-20 bg-canvas border-b border-hairline px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg hover:bg-surface-bone transition-colors">
            <Menu className="w-5 h-5 text-charcoal" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
              {workshop?.logo_url
                ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <span className="font-display font-bold text-white text-[10px]">
                    {workshop?.name?.[0]?.toUpperCase() || 'D'}
                  </span>
              }
            </div>
            <p className="font-display font-bold text-ink text-sm truncate">{workshop?.name}</p>
          </div>
        </div>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
