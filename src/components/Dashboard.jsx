import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useJobs } from '../hooks/useJobs'
import { JobCard } from './JobCard'
import { JobForm } from './JobForm'
import { TodaySummary } from './TodaySummary'
import { RevenueChart } from './RevenueChart'
import { paymentStatus, isStale } from '../constants'
import { useStages } from '../hooks/useStages'
import { Plus, Search, RefreshCw, Archive, TrendingUp, BarChart2, Copy, Check, AlertTriangle } from 'lucide-react'
import { TutorialModal } from './TutorialModal'

export function Dashboard() {
  const { workshop } = useApp()
  const { t } = useLang()
  const { jobs, loading, error, offline, fetchJobs, addJob, updateJob, deleteJob, addAttachment, deleteAttachment } = useJobs(workshop?.id)

  const [tab,       setTab]       = useState('active')
  const [search,    setSearch]    = useState('')
  const [payFilter, setPayFilter] = useState('all')
  const [adding,    setAdding]    = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_done'))

  const closeOnboarding = () => {
    localStorage.setItem('onboarding_done', 'true')
    setShowOnboarding(false)
  }
  const [showChart, setShowChart] = useState(false)
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
  const totalRevenue = jobs.filter(j => j.paid).reduce((s, j) => s + (Number(j.total_amount) || 0), 0)

  const scrollToJob = (job) => {
    setSearch(job.plate)
    setTab(job.archived ? 'archived' : 'active')
  }

  const customerUrl = workshop?.slug ? `${window.location.origin}/w/${workshop.slug}` : ''
  const copyUrl = async () => {
    await navigator.clipboard.writeText(customerUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      {showOnboarding && <TutorialModal onClose={closeOnboarding} />}
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
          <div className="flex-1">
            <p className="text-sm opacity-80">{t('dash_revenue')}</p>
            <p className="font-display font-bold text-xl">
              RM {totalRevenue.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={() => setShowChart(x => !x)}
            className={`p-2 rounded-full transition-colors ${showChart ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}>
            <BarChart2 className="w-4 h-4" />
          </button>
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
        <button onClick={() => setAdding(true)}
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
            <button onClick={() => setAdding(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
              {t('dash_add_first')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(job => (
            <JobCard key={job.id} job={job}
              onUpdate={updateJob} onDelete={deleteJob}
              onAddAttachment={addAttachment} onDeleteAttachment={deleteAttachment} />
          ))}
        </div>
      )}

      {adding && <JobForm onSave={addJob} onClose={() => setAdding(false)} />}
    </div>
  )
}
