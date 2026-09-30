import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useJobs } from '../hooks/useJobs'
import { useInventory } from '../hooks/useInventory'
import { useStages } from '../hooks/useStages'
import { usePlanGate } from '../hooks/usePlanGate'
import { JobCard } from './JobCard'
import { JobForm } from './JobForm'
import { RevenueChart } from './RevenueChart'
import { EODReport } from './EODReport'
import { TutorialModal } from './TutorialModal'
import { PageHeader } from './PageHeader'
import { paymentStatus, isStale, OVERDUE_DAYS } from '../constants'
import { planStatus, isLimitedTrial, TRIAL_LIMITS } from '../lib/plan'
import {
  Plus, Search, X, Archive, BarChart2, Copy, Check, AlertTriangle, Bell, Download,
  ClipboardList, Package, ExternalLink, Car, FileText,
} from 'lucide-react'

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const balanceOf = (j) => (Number(j.total_amount) || 0) - (Number(j.discount) || 0) - (Number(j.downpayment) || 0)
const money = (v, digits = 2) => `RM ${Number(v).toLocaleString('ms-MY', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// One filter model for the list. The attention tiles are shortcuts into it.
const FILTERS = {
  all:     () => true,
  overdue: (j, s) => s.isOverdue(j),
  stale:   (j, s) => !j.archived && j.stage !== s.lastValue && isStale(j),
  ready:   (j, s) => j.stage === s.lastValue,
  owing:   (j) => paymentStatus(j) !== 'paid',
  paid:    (j) => paymentStatus(j) === 'paid',
}
const ACTIVE_CHIPS   = ['all', 'overdue', 'stale', 'ready', 'owing', 'paid']
const ARCHIVED_CHIPS = ['all', 'owing', 'paid']

function AttentionTile({ tone, value, label, sub, active, onClick }) {
  const colour = { ok: 'text-badge-success', danger: 'text-red-700', warn: 'text-amber-700', ink: 'text-ink' }[tone]
  const empty = value === 0
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`attention-tile ${active ? 'attention-tile-active' : ''}`}>
      <span className={`font-display text-3xl font-bold leading-none ${empty ? 'text-ash' : colour}`}>{value}</span>
      <span className="mt-2 text-sm font-semibold leading-snug text-ink">{label}</span>
      <span className="mt-0.5 min-h-4 truncate text-xs text-mute">{sub}</span>
    </button>
  )
}

export function Dashboard() {
  const { workshop } = useApp()
  const { t, lang } = useLang()
  const planGate = usePlanGate()
  const { jobs, loading, error, offline, fetchJobs, addJob, updateJob, refreshJob, deleteJob, addAttachment, deleteAttachment } = useJobs(workshop?.id)
  const { items: stockItems } = useInventory(workshop?.id)
  const lowStockItems = stockItems.filter(i => i.reorder_level > 0 && i.quantity <= i.reorder_level)
  const stageHelpers = useStages()

  const [tab,       setTab]       = useState('active')
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [adding,    setAdding]    = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [showEOD,   setShowEOD]   = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_done'))
  const listRef = useRef(null)
  const chipRowRef = useRef(null)
  // On phones the chip row scrolls sideways; keep the active filter in view.
  useEffect(() => {
    const row = chipRowRef.current
    const chip = row?.querySelector('[aria-pressed="true"]')
    if (!chip || row.scrollWidth <= row.clientWidth) return
    const x = chip.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
    row.scrollTo({ left: x - (row.clientWidth - chip.offsetWidth) / 2 })
  }, [filter, tab])

  const closeOnboarding = () => {
    localStorage.setItem('onboarding_done', 'true')
    setShowOnboarding(false)
  }

  const activeJobs = jobs.filter(j => !j.archived)
  const openAddJob = () => {
    if (planStatus(workshop).state === 'expired') { planGate('plan_expired_block', 'plan_expired_title'); return }
    if (isLimitedTrial(workshop) && activeJobs.length >= TRIAL_LIMITS.jobs) { planGate('plan_limit_jobs'); return }
    setAdding(true)
  }

  const inTab = useMemo(() => jobs.filter(j => !!j.archived === (tab === 'archived')), [jobs, tab])
  const chipKeys = tab === 'archived' ? ARCHIVED_CHIPS : ACTIVE_CHIPS
  const count = (key) => inTab.filter(j => FILTERS[key](j, stageHelpers)).length

  const filtered = useMemo(() => inTab.filter(j => {
    if (!FILTERS[filter](j, stageHelpers)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return j.plate.toLowerCase().includes(q) ||
      j.owner.toLowerCase().includes(q) ||
      (j.car || '').toLowerCase().includes(q) ||
      (j.phone || '').includes(q)
  }), [inTab, filter, search, stageHelpers])

  // Attention tiles always describe the live (non-archived) workload.
  const attention = useMemo(() => {
    const pick = (key) => activeJobs.filter(j => FILTERS[key](j, stageHelpers))
    const owing = pick('owing')
    return {
      ready: pick('ready'), overdue: pick('overdue'), stale: pick('stale'), owing,
      owingTotal: owing.reduce((s, j) => s + Math.max(balanceOf(j), 0), 0),
    }
  }, [activeJobs, stageHelpers])
  const newToday = activeJobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString()).length

  const plates = (list) => list.length === 0 ? t('dash_tile_none')
    : list.slice(0, 2).map(j => j.plate).join(', ') + (list.length > 2 ? ` +${list.length - 2}` : '')

  const showFilter = (key) => {
    const next = filter === key && tab === 'active' ? 'all' : key
    setTab('active'); setFilter(next)
    if (next !== 'all') listRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' })
  }
  const switchTab = (key) => {
    setTab(key)
    if (!(key === 'archived' ? ARCHIVED_CHIPS : ACTIVE_CHIPS).includes(filter)) setFilter('all')
  }
  const clearFilters = () => { setSearch(''); setFilter('all') }

  const totalRevenue = jobs.filter(j => j.paid).reduce((s, j) => s + (Number(j.total_amount) || 0) - (Number(j.discount) || 0), 0)
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey  = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const monthlyStats = useMemo(() => {
    let thisRev = 0, lastRev = 0, thisJobs = 0, lastJobs = 0
    jobs.forEach(j => {
      if (!j.paid || !j.total_amount) return
      const key = (j.date_in || j.created_at || '').slice(0, 7)
      const net = Number(j.total_amount) - (Number(j.discount) || 0)
      if (key === thisMonthKey) { thisRev += net; thisJobs++ }
      if (key === lastMonthKey) { lastRev += net; lastJobs++ }
    })
    return { thisRev, lastRev, thisJobs, lastJobs }
  }, [jobs, thisMonthKey, lastMonthKey])

  const visitCounts = useMemo(() => {
    const m = {}
    jobs.forEach(j => {
      const p = j.plate.replace(/\s/g, '').toUpperCase()
      m[p] = (m[p] || 0) + 1
    })
    return m
  }, [jobs])

  const serviceReminders = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const in30  = new Date(today); in30.setDate(in30.getDate() + 30)
    return jobs
      .filter(j => {
        if (!j.next_service_date) return false
        const d = parseLocalDate(j.next_service_date)
        return d >= today && d <= in30
      })
      .sort((a, b) => parseLocalDate(a.next_service_date) - parseLocalDate(b.next_service_date))
  }, [jobs])

  const exportCSV = () => {
    const headers = ['Plate', 'Owner', 'Car', 'Phone', 'Stage', 'Payment', 'Total (RM)', 'Downpayment (RM)', 'Date In', 'Assigned To', 'Next Service']
    const rows = filtered.map(j => [
      j.plate, j.owner, j.car || '', j.phone || '',
      j.stage, paymentStatus(j),
      j.total_amount != null ? Number(j.total_amount).toFixed(2) : '',
      j.downpayment  != null ? Number(j.downpayment).toFixed(2)  : '',
      (j.date_in || j.created_at || '').slice(0, 10),
      j.assigned_to      || '',
      j.next_service_date || '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `jobs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const customerUrl = workshop?.slug ? `${window.location.origin}/w/${workshop.slug}` : ''
  const copyUrl = async () => {
    await navigator.clipboard.writeText(customerUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const chipLabel = { all: t('dash_chip_all'), overdue: t('ui_overdue'), stale: t('stale_label'), ready: t('dash_chip_ready'), owing: t('dash_chip_owing'), paid: t('pay_paid') }
  const today = now.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstRun = !loading && !error && jobs.length === 0
  const filtering = search || filter !== 'all'

  return (
    <div className="app-page">
      <PageHeader
        kicker={today}
        title={t('ui_overview')}
        description={loading ? t('ui_overview_sub') : t('dash_summary', { active: activeJobs.length, today: newToday })}
        actions={<>
          <Link to="/quotations" className="ui-secondary"><FileText className="w-4 h-4" aria-hidden="true" /> {t('dash_quotes')}</Link>
          <button onClick={openAddJob} className="ui-primary hidden sm:inline-flex"><Plus className="w-4 h-4" /> {t('dash_new_job')}</button>
        </>}
      />

      {showOnboarding && <TutorialModal onClose={closeOnboarding} />}
      {showEOD && <EODReport jobs={jobs} workshop={workshop} onClose={() => setShowEOD(false)} />}

      {offline && (
        <div className="notice notice-warn">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-800">{t('dash_offline_title')}</p>
            <p className="text-amber-700 text-xs mt-0.5">{t('dash_offline_sub')}</p>
          </div>
          <button onClick={fetchJobs} className="text-xs text-amber-800 font-semibold underline whitespace-nowrap">{t('retry')}</button>
        </div>
      )}

      {firstRun ? (
        <section className="rounded-2xl border border-hairline bg-surface-card p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Car className="h-5 w-5" aria-hidden="true" /></div>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">{t('dash_welcome_title')}</h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-charcoal">{t('dash_welcome_sub')}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={openAddJob} className="ui-primary"><Plus className="w-4 h-4" /> {t('dash_add_first')}</button>
            {customerUrl && <button onClick={copyUrl} className="ui-secondary">{copied ? <Check className="w-4 h-4 text-badge-success" /> : <Copy className="w-4 h-4" />} {copied ? t('copied') : t('dash_copy_link')}</button>}
          </div>
        </section>
      ) : (
        <section aria-label={t('dash_attention')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AttentionTile tone="ok" value={attention.ready.length} label={t('ui_ready')} sub={plates(attention.ready)}
            active={tab === 'active' && filter === 'ready'} onClick={() => showFilter('ready')} />
          <AttentionTile tone="danger" value={attention.overdue.length} label={t('dash_tile_overdue', { days: OVERDUE_DAYS })} sub={plates(attention.overdue)}
            active={tab === 'active' && filter === 'overdue'} onClick={() => showFilter('overdue')} />
          <AttentionTile tone="warn" value={attention.stale.length} label={t('stale_label')} sub={plates(attention.stale)}
            active={tab === 'active' && filter === 'stale'} onClick={() => showFilter('stale')} />
          <AttentionTile tone="ink" value={attention.owing.length} label={t('dash_tile_owing')}
            sub={attention.owing.length ? money(attention.owingTotal) : t('dash_tile_none')}
            active={tab === 'active' && filter === 'owing'} onClick={() => showFilter('owing')} />
        </section>
      )}

      {lowStockItems.length > 0 && (
        <div className="notice notice-warn">
          <Package className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-amber-800">
            <span className="font-semibold">{lowStockItems.length} {t('dash_low_stock_label')}</span>
            <span className="text-amber-700"> · {lowStockItems.slice(0, 2).map(i => i.name).join(', ')}{lowStockItems.length > 2 ? '…' : ''}</span>
          </p>
          <Link to="/inventory?tab=stok" className="whitespace-nowrap text-xs font-semibold text-amber-800 underline underline-offset-2">{t('dash_view_stock')}</Link>
        </div>
      )}

      {serviceReminders.length > 0 && (
        <div className="bg-surface-card border border-hairline rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-hairline flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink">{t('remind_title')} ({serviceReminders.length})</h2>
          </div>
          <ul className="divide-y divide-hairline">
            {serviceReminders.map(j => {
              const days  = Math.ceil((parseLocalDate(j.next_service_date) - new Date().setHours(0,0,0,0)) / 86400000)
              const phone = j.phone?.replace(/\D/g, '')
              const waNum = phone ? (phone.startsWith('60') ? phone : '60' + phone.replace(/^0/, '')) : null
              const waUrl = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(t('remind_wa_msg') + ' ' + j.plate)}` : null
              return (
                <li key={j.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <span className="plate text-[13px] flex-shrink-0">{j.plate}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-ink">{j.owner}</p>
                    <p className={`text-xs font-medium ${days <= 3 ? 'text-red-700' : days <= 7 ? 'text-amber-700' : 'text-mute'}`}>
                      {t('remind_due')} {days === 0 ? t('ui_today_lower') : t('dash_in_days', { n: days })}
                    </p>
                  </div>
                  {waUrl && (
                    <a href={waUrl} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 text-xs font-semibold text-badge-success hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-full transition-colors whitespace-nowrap">
                      {t('remind_wa')}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!firstRun && (
        <section ref={listRef} aria-labelledby="jobs-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3 pt-2">
            <h2 id="jobs-heading" className="font-display text-xl font-bold text-ink">{t('ui_jobs')}</h2>
            <p className="text-xs text-mute" role="status">{filtered.length} {t('ui_results')}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" aria-hidden="true" />
              <input type="search" aria-label={t('dash_search_ph')} value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('dash_search_ph')} enterKeyHint="search"
                className="w-full min-h-11 bg-surface-card border border-hairline rounded-full pl-11 pr-11 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label={t('dash_search_clear')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-canvas hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="segmented flex-1 sm:flex-none" role="group" aria-label={t('ui_jobs')}>
                {[
                  { key: 'active',   label: t('dash_tab_active'),   n: activeJobs.length },
                  { key: 'archived', label: t('dash_tab_archived'), n: jobs.length - activeJobs.length },
                ].map(({ key, label, n }) => (
                  <button key={key} type="button" aria-pressed={tab === key} onClick={() => switchTab(key)}
                    className={`segmented-item ${tab === key ? 'segmented-item-on' : ''}`}>
                    {label} <span className="segmented-count">{n}</span>
                  </button>
                ))}
              </div>
              <button onClick={exportCSV} className="ui-secondary px-3.5" aria-label={t('dash_export')} title={t('dash_export')}>
                <Download className="w-4 h-4" /> <span className="hidden lg:inline">{t('dash_export')}</span>
              </button>
            </div>
          </div>

          <div ref={chipRowRef} className="chip-row" role="group" aria-label={t('dash_filter_label')}>
            {chipKeys.map(key => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
                className={`chip ${filter === key ? 'chip-on' : ''}`}>
                {chipLabel[key]} <span className="chip-count">{count(key)}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div role="status" aria-label={t('dash_loading')} className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map(item => <div key={item} aria-hidden="true" className="rounded-2xl border border-hairline bg-surface-card p-5 space-y-5">
                <div className="ui-skeleton h-6 w-1/3" /><div className="ui-skeleton h-4 w-2/3" />
                <div className="ui-skeleton h-12 w-full" /><div className="ui-skeleton h-10 w-full" />
              </div>)}
              <span className="sr-only">{t('dash_loading')}</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-700 font-medium">{t('error_prefix')} {error}</p>
              <button onClick={fetchJobs} className="mt-3 text-sm text-red-700 font-semibold underline">{t('retry')}</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ui-empty">
              <Archive className="w-10 h-10 mx-auto mb-3 text-ash opacity-40" aria-hidden="true" />
              <p className="font-semibold text-charcoal">{filtering ? t('ui_no_results') : tab === 'active' ? t('dash_empty_active') : t('dash_empty_arch')}</p>
              {filtering ? (
                <><p className="mt-2 text-sm text-mute">{t('ui_no_results_sub')}</p><button className="ui-secondary mt-5" onClick={clearFilters}>{t('ui_clear')}</button></>
              ) : tab === 'active' && (
                <button onClick={openAddJob} className="ui-primary mt-5"><Plus className="w-4 h-4" /> {t('dash_add_first')}</button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map(job => (
                <JobCard key={job.id} job={job}
                  visitCount={visitCounts[job.plate.replace(/\s/g, '').toUpperCase()] || 1}
                  onUpdate={updateJob} onRefresh={refreshJob} onDelete={deleteJob}
                  onAddAttachment={addAttachment} onDeleteAttachment={deleteAttachment} />
              ))}
            </div>
          )}
        </section>
      )}

      {(totalRevenue > 0 || monthlyStats.lastRev > 0) && (
        <section aria-labelledby="revenue-heading" className="rounded-2xl border border-hairline bg-surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <h2 id="revenue-heading" className="font-display text-lg font-bold text-ink">{t('dash_money_section')}</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowEOD(true)} className="ui-secondary min-h-10 px-3.5 py-2 text-xs">
                <ClipboardList className="w-4 h-4" /> {t('eod_title')}
              </button>
              <button onClick={() => setShowChart(x => !x)} aria-expanded={showChart} className="ui-secondary min-h-10 px-3.5 py-2 text-xs">
                <BarChart2 className="w-4 h-4" /> {t('dash_chart_toggle')}
              </button>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-hairline">
            {[
              { label: t('dash_this_month'), value: money(monthlyStats.thisRev, 0), sub: `${monthlyStats.thisJobs} ${t('dash_month_jobs')}`, strong: true },
              { label: t('dash_last_month'), value: money(monthlyStats.lastRev, 0), sub: `${monthlyStats.lastJobs} ${t('dash_month_jobs')}` },
              { label: t('dash_revenue'),    value: money(totalRevenue, 0), sub: t('dash_all_time') },
            ].map(({ label, value, sub, strong }) => (
              <div key={label} className="px-4 py-4 sm:px-5">
                <dt className="text-xs font-medium text-mute">{label}</dt>
                <dd className={`mt-1 font-display text-lg font-bold sm:text-2xl ${strong ? 'text-primary' : 'text-ink'}`}>{value}</dd>
                <dd className="mt-0.5 text-xs text-mute">{sub}</dd>
              </div>
            ))}
          </dl>
          {showChart && <div className="border-t border-hairline"><RevenueChart jobs={jobs} /></div>}
        </section>
      )}

      {customerUrl && !firstRun && (
        <div className="bg-surface-card border border-hairline rounded-2xl px-4 py-3.5 flex flex-wrap items-center gap-3 sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-charcoal">{t('dash_link_label')}</p>
            <p className="text-sm text-ink truncate font-mono mt-0.5">{customerUrl}</p>
            <p className="text-xs text-mute mt-0.5">{t('dash_link_hint')}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a href={customerUrl} target="_blank" rel="noreferrer" className="ui-secondary min-h-10 px-3.5 py-2 text-xs">
              <ExternalLink className="w-4 h-4" /> {t('dash_open_portal')}
            </a>
            <button onClick={copyUrl} className="ui-secondary min-h-10 px-3.5 py-2 text-xs">
              {copied ? <><Check className="w-4 h-4 text-badge-success" /> {t('copied')}</> : <><Copy className="w-4 h-4" /> {t('dash_copy_url')}</>}
            </button>
          </div>
        </div>
      )}

      {/* Phones: the day's main action stays under the thumb. */}
      <button onClick={openAddJob} className="fab sm:hidden">
        <Plus className="w-5 h-5" aria-hidden="true" /> {t('dash_new_job')}
      </button>

      {adding && <JobForm onSave={addJob} onClose={() => setAdding(false)} jobs={jobs} />}
    </div>
  )
}
