import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { TutorialModal } from './TutorialModal'
import {
  LayoutDashboard, Package, Users, LogOut, ExternalLink, Settings,
  Menu, X, Globe, HelpCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'

function Sidebar({ workshop, signOut, onClose, collapsed, onToggleCollapsed }) {
  const { lang, setLang, t } = useLang()
  const [showTutorial, setShowTutorial] = useState(false)

  const navItems = [
    { to: '/dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/inventory', label: t('nav_inventory'), icon: Package },
    { to: '/workers',   label: t('nav_workers'),   icon: Users },
    { to: '/settings',  label: t('nav_settings'),  icon: Settings },
  ]

  const logoEl = workshop?.logo_url
    ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
    : <span className="font-display font-bold text-white text-xs">{workshop?.name?.[0]?.toUpperCase() || 'D'}</span>

  const navCls = ({ isActive }) =>
    `flex items-center rounded-lg text-sm font-semibold transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-on-dark/60 hover:text-on-dark hover:bg-white/5'
    } ${collapsed ? 'justify-center p-2.5 gap-0' : 'gap-3 px-3 py-2.5'}`

  const footerCls = `w-full flex items-center rounded-lg text-sm font-semibold text-on-dark/60 hover:text-on-dark hover:bg-white/5 transition-colors ${
    collapsed ? 'justify-center p-2.5 gap-0' : 'gap-3 px-3 py-2.5'
  }`

  return (
    <div className="bg-surface-deep h-full flex flex-col w-full overflow-hidden">

      {/* Brand */}
      <div className={`py-4 border-b border-white/10 flex items-center flex-shrink-0 ${
        collapsed ? 'justify-center px-2' : 'px-4 justify-between gap-2'
      }`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
            {logoEl}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logoEl}
            </div>
            <div className="min-w-0">
              <p className="text-on-dark font-display font-bold text-sm leading-tight truncate">{workshop?.name || 'Digital Depot'}</p>
              <p className="text-on-dark/40 text-xs leading-tight">Digital Depot</p>
            </div>
          </div>
        )}
        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} className="sm:hidden text-on-dark/50 hover:text-on-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Desktop collapse toggle */}
      {!onClose && (
        <button onClick={onToggleCollapsed}
          className={`hidden sm:flex items-center py-2 text-on-dark/30 hover:text-on-dark/60 transition-colors ${
            collapsed ? 'justify-center px-2' : 'justify-end px-3'
          }`}>
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={navCls}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/10 space-y-0.5 flex-shrink-0">
        {workshop?.slug && (
          <a href={`/w/${workshop.slug}`} target="_blank" rel="noreferrer" className={footerCls}>
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            {!collapsed && t('nav_portal')}
          </a>
        )}
        <button onClick={() => setShowTutorial(true)} className={footerCls}>
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && t('nav_tutorial')}
        </button>
        <button onClick={() => setLang(lang === 'ms' ? 'en' : 'ms')} className={footerCls}>
          <Globe className="w-4 h-4 flex-shrink-0" />
          {!collapsed && t('lang_other')}
        </button>
        <button onClick={signOut} className={footerCls}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && t('nav_logout')}
        </button>
      </div>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  )
}

export function Layout({ children }) {
  const { workshop, signOut } = useApp()
  const [open,      setOpen]      = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true')

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  const sidebarW  = collapsed ? 'w-14' : 'w-56'
  const contentMl = collapsed ? 'sm:ml-14' : 'sm:ml-56'

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* Desktop sidebar */}
      <aside className={`hidden sm:flex fixed inset-y-0 left-0 z-30 ${sidebarW} shadow-lg transition-all duration-200`}>
        <Sidebar workshop={workshop} signOut={signOut} onClose={null} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile off-canvas sidebar */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="relative z-50 flex w-56 shadow-xl">
            <Sidebar workshop={workshop} signOut={signOut} onClose={() => setOpen(false)} collapsed={false} onToggleCollapsed={() => {}} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 ${contentMl} transition-all duration-200`}>
        {/* Mobile top bar */}
        <div className="sm:hidden sticky top-0 z-20 bg-canvas border-b border-hairline px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-surface-bone transition-colors">
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
