import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useJobs } from '../hooks/useJobs'
import { JobCard } from './JobCard'
import { JobForm } from './JobForm'
import { TodaySummary } from './TodaySummary'
import { RevenueChart } from './RevenueChart'
import { paymentStatus } from '../constants'
import { Plus, Search, RefreshCw, Archive, TrendingUp, BarChart2, Copy, Check } from 'lucide-react'

export function Dashboard() {
  const { workshop } = useApp()
  const { jobs, loading, error, offline, fetchJobs, addJob, updateJob, deleteJob, addAttachment, deleteAttachment } = useJobs(workshop?.id)

  const [tab,       setTab]       = useState('active')
  const [search,    setSearch]    = useState('')
  const [payFilter, setPayFilter] = useState('all')
  const [adding,    setAdding]    = useState(false)
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

  const activeJobs   = jobs.filter(j => !j.archived)
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
      {/* Offline banner */}
      {offline && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex items-center gap-3 text-sm">
          <div>
            <p className="font-semibold text-amber-800">Mod Luar Talian — Data disimpan dalam peranti ini sahaja</p>
            <p className="text-amber-700 text-xs mt-0.5">Aktifkan semula projek di supabase.com untuk simpan ke cloud.</p>
          </div>
          <button onClick={fetchJobs} className="ml-auto text-xs text-amber-800 font-semibold underline whitespace-nowrap">Cuba lagi</button>
        </div>
      )}

      {/* Customer URL banner */}
      {customerUrl && (
        <div className="bg-surface-card border border-hairline rounded-md px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-charcoal mb-0.5">Link Semak Status Pelanggan</p>
            <p className="text-sm text-ink truncate font-mono">{customerUrl}</p>
          </div>
          <button onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-hairline bg-canvas hover:bg-surface-bone transition-colors whitespace-nowrap flex-shrink-0">
            {copied ? <><Check className="w-3.5 h-3.5 text-badge-success" /> Disalin</> : <><Copy className="w-3.5 h-3.5" /> Salin</>}
          </button>
        </div>
      )}

      {/* Today's summary */}
      {!loading && <TodaySummary jobs={jobs} onSelectJob={scrollToJob} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Kerja Aktif', value: activeJobs.length, color: 'text-primary'      },
          { label: 'Belum Bayar', value: unpaid,            color: 'text-red-600'       },
          { label: 'Deposit',     value: deposit,           color: 'text-amber-600'     },
          { label: 'Lunas',       value: paid,              color: 'text-badge-success' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-card rounded-md border border-hairline p-4">
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            <p className="text-charcoal text-xs mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue banner */}
      {totalRevenue > 0 && (
        <div className="bg-primary rounded-md p-4 flex items-center gap-3 text-white">
          <TrendingUp className="w-5 h-5 opacity-80" />
          <div className="flex-1">
            <p className="text-sm opacity-80">Jumlah Pendapatan (Lunas)</p>
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

      {/* Revenue chart */}
      {showChart && <RevenueChart jobs={jobs} />}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari plat, nama, model..."
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
        </div>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)}
          className="bg-surface-card border border-hairline rounded-full px-5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm">
          <option value="all">Semua Bayaran</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="deposit">Deposit</option>
          <option value="paid">Lunas</option>
        </select>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-deep text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors">
          <Plus className="w-4 h-4" /> Kerja Baru
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1 w-fit">
        {[
          { key: 'active',   label: 'Aktif',  count: activeJobs.length },
          { key: 'archived', label: 'Arkib',  count: jobs.filter(j => j.archived).length },
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

      {/* Job list */}
      {loading ? (
        <div className="text-center py-16 text-mute">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
          <p>Memuatkan...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <p className="text-red-600 font-medium">Ralat: {error}</p>
          <button onClick={fetchJobs} className="mt-3 text-sm text-red-600 font-semibold underline">Cuba lagi</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ash">
          <Archive className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-charcoal">{tab === 'active' ? 'Tiada kerja aktif' : 'Tiada rekod dalam arkib'}</p>
          {tab === 'active' && (
            <button onClick={() => setAdding(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
              + Tambah kerja baru
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

      {adding && <JobForm title="Kerja Baru" onSave={addJob} onClose={() => setAdding(false)} />}
    </div>
  )
}
