import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { planStatus } from '../lib/plan'
import { TutorialModal } from './TutorialModal'
import { FeedbackWidget } from './FeedbackWidget'
import {
  LayoutDashboard, Package, Users, LogOut, ExternalLink, Settings, Wallet,
  Menu, X, Globe, HelpCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'

function Sidebar({ workshop, signOut, onClose, collapsed, onToggleCollapsed }) {
  const { lang, setLang, t } = useLang()
  const [showTutorial, setShowTutorial] = useState(false)

  const navItems = [
    { to: '/dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/inventory', label: t('nav_inventory'), icon: Package },
    { to: '/finance',   label: t('nav_finance'),   icon: Wallet },
    { to: '/payroll',   label: t('nav_payroll'),   icon: Users    },
    { to: '/settings',  label: t('nav_settings'),  icon: Settings },
  ]

  const logoEl = workshop?.logo_url
    ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
    : <span className="font-display font-bold text-white text-xs">{workshop?.name?.[0]?.toUpperCase() || 'D'}</span>

  const navCls = ({ isActive }) =>
    `app-nav-link flex items-center rounded-xl text-sm font-semibold transition-colors ${
      isActive ? 'bg-on-dark text-ink' : 'text-on-dark/70 hover:text-on-dark hover:bg-white/5'
    } ${collapsed ? 'justify-center p-2.5 gap-0' : 'gap-3 px-3 py-2.5'}`

  const footerCls = `w-full flex items-center rounded-lg text-sm font-semibold text-on-dark/70 hover:text-on-dark hover:bg-white/5 transition-colors ${
    collapsed ? 'justify-center p-2.5 gap-0' : 'gap-3 px-3 py-2.5'
  }`

  return (
    <div className="app-sidebar h-full flex flex-col w-full overflow-hidden">

      {/* Brand */}
      <div className={`py-6 border-b border-white/10 flex items-center flex-shrink-0 ${
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
              <p className="text-on-dark font-display font-bold text-base leading-tight truncate">{workshop?.name || 'Digital Depot'}</p>
              <p className="text-on-dark/60 text-xs leading-tight">Digital Depot</p>
            </div>
          </div>
        )}
        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} aria-label={t('ui_close')} className="sm:hidden min-h-11 min-w-11 flex items-center justify-center text-on-dark/50 hover:text-on-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Desktop collapse toggle */}
      {!onClose && (
        <button onClick={onToggleCollapsed} aria-label={collapsed ? t('ui_expand') : t('ui_collapse')} title={collapsed ? t('ui_expand') : t('ui_collapse')} aria-expanded={!collapsed}
          className={`hidden sm:flex items-center min-h-11 py-2 text-on-dark/60 hover:text-on-dark/70 transition-colors ${
            collapsed ? 'justify-center px-2' : 'justify-end px-3'
          }`}>
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5" />
          }
        </button>
      )}

      {/* Nav */}
      <nav aria-label={t('ui_workspace')} className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} aria-label={label} title={collapsed ? label : undefined} onClick={onClose} className={navCls}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/10 space-y-0.5 flex-shrink-0">
        {workshop?.slug && (
          <a href={`/w/${workshop.slug}`} target="_blank" rel="noreferrer" aria-label={t('nav_portal')} title={collapsed ? t('nav_portal') : undefined} className={footerCls}>
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            {!collapsed && t('nav_portal')}
          </a>
        )}
        <button onClick={() => setShowTutorial(true)} aria-label={t('nav_tutorial')} title={collapsed ? t('nav_tutorial') : undefined} className={footerCls}>
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && t('nav_tutorial')}
        </button>
        <button onClick={() => setLang(lang === 'ms' ? 'en' : 'ms')} aria-label={t('lang_other')} title={collapsed ? t('lang_other') : undefined} className={footerCls}>
          <Globe className="w-4 h-4 flex-shrink-0" />
          {!collapsed && t('lang_other')}
        </button>
        <button onClick={signOut} aria-label={t('nav_logout')} title={collapsed ? t('nav_logout') : undefined} className={footerCls}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && t('nav_logout')}
        </button>
      </div>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  )
}

function PlanBanner({ workshop }) {
  const { t } = useLang()
  const status = planStatus(workshop)
  const soon = status.daysLeft !== null && status.daysLeft <= 7
  const trialExpiring = status.state === 'trial' && soon
  const proExpiring   = status.state === 'pro' && soon
  const expired       = status.state === 'expired'
  if (!expired && !trialExpiring && !proExpiring) return null

  const msg = expired ? t('plan_banner_expired')
    : proExpiring ? t('plan_banner_pro_expiring', { days: status.daysLeft })
    : t('plan_banner_expiring', { days: status.daysLeft })

  return (
    <div className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold ${
      expired ? 'bg-red-50 text-red-700 border-b border-red-200' : 'bg-amber-50 text-amber-800 border-b border-amber-200'
    }`}>
      <span>{msg}</span>
      <Link to="/settings" className={`flex-shrink-0 text-white px-3 py-1.5 rounded-full ${expired ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-700 hover:bg-amber-800'} transition-colors`}>
        {proExpiring ? t('plan_banner_renew') : t('plan_banner_cta')}
      </Link>
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

  const sidebarW  = collapsed ? 'w-20' : 'w-60'
  const contentMl = collapsed ? 'sm:ml-20' : 'sm:ml-60'

  const { t } = useLang()
  const { pathname } = useLocation()
  const drawer = useRef(null)
  const currentPage = { '/dashboard': 'nav_dashboard', '/inventory': 'nav_inventory', '/finance': 'nav_finance', '/payroll': 'nav_payroll', '/settings': 'nav_settings' }[pathname] || 'nav_dashboard'

  useEffect(() => {
    const dialog = drawer.current
    if (!open) { dialog?.close(); return }
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = matchMedia('(min-width: 640px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', closeOnDesktop)
      dialog?.close()
    }
  }, [open])

  return (
    <div className="app-shell min-h-dvh bg-canvas flex">
      <a href="#main-content" className="skip-link">{t('ui_skip')}</a>
      <aside className={`hidden sm:flex fixed inset-y-0 left-0 z-30 ${sidebarW} transition-[width] duration-200`}>
        <Sidebar workshop={workshop} signOut={signOut} onClose={null} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <dialog ref={drawer} className="app-drawer" aria-label={t('ui_workspace')}
        onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
        onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
        <Sidebar workshop={workshop} signOut={signOut} onClose={() => setOpen(false)} collapsed={false} onToggleCollapsed={() => {}} />
      </dialog>

      <div className={`flex-1 flex flex-col min-w-0 ${contentMl} transition-[margin] duration-200`}>
        <header className="app-topbar sticky top-0 z-20 sm:static">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} aria-label={t('ui_menu')} aria-expanded={open}
              className="sm:hidden min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-hairline bg-white">
              <Menu className="w-5 h-5 text-charcoal" />
            </button>
            <span className="hidden sm:inline text-xs text-mute">Digital Depot</span>
            <span className="hidden sm:inline text-stone" aria-hidden="true">/</span>
            <span className="text-sm font-semibold text-ink truncate">{t(currentPage)}</span>
          </div>
          <span className="max-w-[45%] truncate text-xs font-medium text-mute">{workshop?.name}</span>
        </header>
        <PlanBanner workshop={workshop} />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
      <FeedbackWidget />
    </div>
  )
}
