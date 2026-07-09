import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useJobs } from '../hooks/useJobs'
import { useInventory } from '../hooks/useInventory'
import { JobCard } from './JobCard'
import { JobForm } from './JobForm'
import { TodaySummary } from './TodaySummary'
import { RevenueChart } from './RevenueChart'
import { EODReport } from './EODReport'
import { paymentStatus, isStale } from '../constants'
import { planStatus } from '../lib/plan'
import { useStages } from '../hooks/useStages'
import { Plus, Search, RefreshCw, Archive, TrendingUp, BarChart2, Copy, Check, AlertTriangle, Bell, Download, ClipboardList } from 'lucide-react'
import { TutorialModal } from './TutorialModal'

const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

export function Dashboard() {
  const { workshop } = useApp()
  const { t } = useLang()
  const { jobs, loading, error, offline, fetchJobs, addJob, updateJob, deleteJob, addAttachment, deleteAttachment } = useJobs(workshop?.id)
  const { items: stockItems } = useInventory(workshop?.id)
  const lowStockItems = stockItems.filter(i => i.reorder_level > 0 && i.quantity <= i.reorder_level)

  const [tab,       setTab]       = useState('active')
  const [search,    setSearch]    = useState('')
  const [payFilter, setPayFilter] = useState('all')
  const [adding,    setAdding]    = useState(false)

  const planExpired = planStatus(workshop).state === 'expired'
  const openAddJob = () => {
    if (planExpired) { alert(t('plan_expired_block')); return }
    setAdding(true)
  }
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_done'))

  const closeOnboarding = () => {
    localStorage.setItem('onboarding_done', 'true')
    setShowOnboarding(false)
  }
  const [showChart, setShowChart] = useState(false)
  const [showEOD,   setShowEOD]   = useState(false)
  const [copied,    setCopied]    = useState(false)

  const filtered = useMemo(() => jobs.filter(j => {
    if (!!j.archived !== (tab === 'archived')) return false
    if (payFilter !== 'all' && paymentStatus(j) !== payFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return j.plate.toLowerCase().includes(q) ||
        j.owner.toLowerCase().includes(q) ||
        (j.car || '').toLowerCase().includes(q) ||
        (j.phone || '').includes(q)
    }
    return true
  }), [jobs, tab, search, payFilter])

  const { lastValue } = useStages()
  const activeJobs   = jobs.filter(j => !j.archived)
  const staleCount   = activeJobs.filter(j => j.stage !== lastValue && isStale(j)).length
  const unpaid       = activeJobs.filter(j => paymentStatus(j) === 'unpaid').length
  const deposit      = activeJobs.filter(j => paymentStatus(j) === 'deposit').length
  const paid         = activeJobs.filter(j => paymentStatus(j) === 'paid').length
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
    const parseLocalDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
    return jobs
      .filter(j => {
        if (!j.next_service_date) return false
        const d = parseLocalDate(j.next_service_date)
        return d >= today && d <= in30
      })
      .sort((a, b) => parseLocalDate(a.next_service_date) - parseLocalDate(b.next_service_date))
  }, [jobs])

  const scrollToJob = (job) => {
    setSearch(job.plate)
    setTab(job.archived ? 'archived' : 'active')
  }

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      {showOnboarding && <TutorialModal onClose={closeOnboarding} />}
      {showEOD && <EODReport jobs={jobs} workshop={workshop} onClose={() => setShowEOD(false)} />}
      {offline && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex items-center gap-3 text-sm">
          <div>
            <p className="font-semibold text-amber-800">{t('dash_offline_title')}</p>
            <p className="text-amber-700 text-xs mt-0.5">{t('dash_offline_sub')}</p>
          </div>
          <button onClick={fetchJobs} className="ml-auto text-xs text-amber-800 font-semibold underline whitespace-nowrap">{t('retry')}</button>
        </div>
      )}

      {!loading && staleCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">{staleCount} {t('dash_stale_label')}</p>
            <p className="text-amber-700 text-xs mt-0.5">{t('dash_stale_sub')}</p>
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">{lowStockItems.length} {t('dash_low_stock_label')}</p>
            <p className="text-amber-700 text-xs mt-0.5">{t('dash_low_stock_sub')}</p>
          </div>
        </div>
      )}

      {serviceReminders.length > 0 && (
        <div className="bg-surface-card border border-hairline rounded-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-hairline flex items-center gap-2 bg-canvas">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-ink">{t('remind_title')} ({serviceReminders.length})</p>
          </div>
          <div className="divide-y divide-hairline">
            {serviceReminders.map(j => {
              const days  = Math.ceil((parseLocalDate(j.next_service_date) - new Date().setHours(0,0,0,0)) / 86400000)
              const phone = j.phone?.replace(/\D/g, '')
              const waNum = phone ? (phone.startsWith('60') ? phone : '60' + phone.replace(/^0/, '')) : null
              const waUrl = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(t('remind_wa_msg') + ' ' + j.plate)}` : null
              return (
                <div key={j.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-ink font-mono">{j.plate}</span>
                    <span className="text-mute ml-2">{j.owner}</span>
                    <span className={`ml-2 text-xs font-medium ${days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-600' : 'text-charcoal'}`}>
                      · {t('remind_due')} {days === 0 ? 'hari ini' : `${days}h`}
                    </span>
                  </div>
                  {waUrl && (
                    <a href={waUrl} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 text-xs font-semibold text-badge-success hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                      {t('remind_wa')}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {customerUrl && (
        <div className="bg-surface-card border border-hairline rounded-md px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-charcoal mb-0.5">{t('dash_link_label')}</p>
            <p className="text-sm text-ink truncate font-mono">{customerUrl}</p>
          </div>
          <button onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-hairline bg-canvas hover:bg-surface-bone transition-colors whitespace-nowrap flex-shrink-0">
            {copied ? <><Check className="w-3.5 h-3.5 text-badge-success" /> {t('copied')}</> : <><Copy className="w-3.5 h-3.5" /> {t('dash_copy_url')}</>}
          </button>
        </div>
      )}

      {!loading && <TodaySummary jobs={jobs} onSelectJob={scrollToJob} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('dash_active'),   value: activeJobs.length, color: 'text-primary'      },
          { label: t('dash_unpaid'),   value: unpaid,            color: 'text-red-600'       },
          { label: t('dash_deposit'),  value: deposit,           color: 'text-amber-600'     },
          { label: t('dash_paid'),     value: paid,              color: 'text-badge-success' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-card rounded-md border border-hairline p-4">
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            <p className="text-charcoal text-xs mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {totalRevenue > 0 && (
        <div className="bg-primary rounded-md p-4 flex items-center gap-3 text-white">
          <TrendingUp className="w-5 h-5 opacity-80" />
          <div className="flex-1 min-w-0">
            <p className="text-sm opacity-80">{t('dash_revenue')}</p>
            <p className="font-display font-bold text-xl">
              RM {totalRevenue.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={() => setShowEOD(true)}
            title={t('eod_title')}
            className="p-2 rounded-full transition-colors bg-white/10 hover:bg-white/20">
            <ClipboardList className="w-4 h-4" />
          </button>
          <button onClick={() => setShowChart(x => !x)}
            className={`p-2 rounded-full transition-colors ${showChart ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Monthly comparison */}
      {(monthlyStats.thisRev > 0 || monthlyStats.lastRev > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-card border border-hairline rounded-md p-4">
            <p className="text-xs text-mute font-medium mb-1">{t('dash_this_month')}</p>
            <p className="font-display font-bold text-lg text-ink">
              RM {monthlyStats.thisRev.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-mute mt-0.5">{monthlyStats.thisJobs} {t('dash_month_jobs')}</p>
          </div>
          <div className="bg-surface-card border border-hairline rounded-md p-4">
            <p className="text-xs text-mute font-medium mb-1">{t('dash_last_month')}</p>
            <p className="font-display font-bold text-lg text-charcoal">
              RM {monthlyStats.lastRev.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-mute mt-0.5">{monthlyStats.lastJobs} {t('dash_month_jobs')}</p>
          </div>
        </div>
      )}

      {showChart && <RevenueChart jobs={jobs} />}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('dash_search_ph')}
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
        </div>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)}
          className="bg-surface-card border border-hairline rounded-lg px-4 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm">
          <option value="all">{t('dash_filter_all')}</option>
          <option value="unpaid">{t('pay_unpaid')}</option>
          <option value="deposit">{t('pay_deposit')}</option>
          <option value="paid">{t('pay_paid')}</option>
        </select>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-canvas border border-hairline hover:bg-surface-bone text-charcoal font-semibold rounded-full px-4 py-2.5 text-sm transition-colors">
          <Download className="w-4 h-4" /> {t('dash_export')}
        </button>
        <button onClick={openAddJob}
          className="flex items-center gap-2 bg-primary hover:bg-primary-deep text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors">
          <Plus className="w-4 h-4" /> {t('dash_new_job')}
        </button>
      </div>

      <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1 w-fit">
        {[
          { key: 'active',   label: t('dash_tab_active'),   count: activeJobs.length },
          { key: 'archived', label: t('dash_tab_archived'), count: jobs.filter(j => j.archived).length },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? 'bg-surface-dark text-on-dark' : 'text-mute hover:text-charcoal'
            }`}>
            {label}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              tab === key ? 'bg-white/20 text-on-dark' : 'bg-surface-card text-mute'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-mute">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
          <p>{t('dash_loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <p className="text-red-600 font-medium">{t('error_prefix')} {error}</p>
          <button onClick={fetchJobs} className="mt-3 text-sm text-red-600 font-semibold underline">{t('retry')}</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ash">
          <Archive className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-charcoal">{tab === 'active' ? t('dash_empty_active') : t('dash_empty_arch')}</p>
          {tab === 'active' && (
            <button onClick={openAddJob} className="mt-3 text-primary text-sm font-semibold hover:underline">
              {t('dash_add_first')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(job => (
            <JobCard key={job.id} job={job}
              visitCount={visitCounts[job.plate.replace(/\s/g, '').toUpperCase()] || 1}
              onUpdate={updateJob} onDelete={deleteJob}
              onAddAttachment={addAttachment} onDeleteAttachment={deleteAttachment} />
          ))}
        </div>
      )}

      {adding && <JobForm onSave={addJob} onClose={() => setAdding(false)} jobs={jobs} />}
    </div>
  )
}
