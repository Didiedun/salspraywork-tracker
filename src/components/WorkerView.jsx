import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useJobs } from '../hooks/useJobs'
import { StageBar } from './StageBar'
import { PaymentBadge } from './StatusBadge'
import { STAGES, STAGE_INDEX, nextStage, prevStage, daysIn, isOverdue, paymentStatus } from '../constants'
import { RefreshCw, ChevronRight, ChevronLeft, Search, LogOut, Wrench, Clock } from 'lucide-react'

export function WorkerView() {
  const { workshop, signOut } = useApp()
  const { jobs, loading, fetchJobs } = useJobs(workshop?.id)
  const [search, setSearch] = useState('')

  const activeJobs = useMemo(() =>
    jobs.filter(j => !j.archived && j.stage !== 'siap')
      .filter(j => {
        if (!search) return true
        const q = search.toLowerCase()
        return j.plate.toLowerCase().includes(q) ||
          j.owner.toLowerCase().includes(q) ||
          (j.car || '').toLowerCase().includes(q)
      }),
    [jobs, search]
  )

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })
    : '-'

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-canvas border-b border-hairline sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-ink text-sm leading-tight">{workshop?.name}</p>
              <p className="text-mute text-xs">Paparan Pekerja</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchJobs}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-card border border-hairline text-mute hover:text-ink transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-charcoal bg-surface-card hover:bg-surface-bone border border-hairline px-3 py-2 rounded-full transition-colors font-semibold">
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Kerja Aktif',  value: jobs.filter(j => !j.archived).length,           color: 'text-primary'  },
            { label: 'Dalam Proses', value: jobs.filter(j => !j.archived && j.stage !== 'siap' && j.stage !== 'ready').length, color: 'text-amber-600' },
            { label: 'Siap Hari Ini', value: jobs.filter(j => {
              if (j.stage !== 'siap') return false
              const d = new Date(j.updated_at || j.created_at)
              return d.toDateString() === new Date().toDateString()
            }).length, color: 'text-badge-success' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-card rounded-md border border-hairline p-3 text-center">
              <p className={`text-xl font-bold font-display ${color}`}>{value}</p>
              <p className="text-charcoal text-xs mt-0.5 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari plat, nama, model..."
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
        </div>

        {/* Job cards */}
        {loading ? (
          <div className="text-center py-16 text-mute">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
            <p>Memuatkan...</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="text-center py-16 text-ash">
            <p className="font-semibold text-charcoal">Tiada kerja dalam proses</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map(job => {
              const overdue  = isOverdue(job)
              const days     = daysIn(job)
              const stageIdx = STAGE_INDEX[job.stage] ?? 0
              const isFirst  = stageIdx === 0
              const isLast   = stageIdx === STAGES.length - 1

              return (
                <div key={job.id}
                  className={`bg-surface-card rounded-lg border overflow-hidden ${overdue ? 'border-red-200' : 'border-hairline'}`}>
                  {overdue && (
                    <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-red-600 text-xs font-semibold">Tertangguh — {days} hari</p>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-display font-bold text-ink text-lg tracking-tight">{job.plate}</p>
                        <p className="text-charcoal text-sm">{job.car} — {job.owner}</p>
                        <p className="text-mute text-xs mt-0.5">Masuk: {formatDate(job.date_in || job.created_at)}</p>
                      </div>
                      <PaymentBadge job={job} />
                    </div>

                    <StageBar current={job.stage} />

                    <div className="flex items-center gap-2 mt-3">
                      <button disabled={isFirst}
                        className="flex items-center gap-1 text-xs text-mute disabled:opacity-30 bg-canvas border border-hairline px-2.5 py-1.5 rounded-full font-semibold">
                        <ChevronLeft className="w-3.5 h-3.5" /> Undur
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-xs font-semibold text-charcoal">
                          {STAGES[stageIdx]?.label}
                        </span>
                      </div>
                      <button disabled={isLast}
                        className="flex items-center gap-1 text-xs text-primary disabled:opacity-30 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-full font-semibold">
                        Maju <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {job.notes && (
                      <div className="mt-3 bg-canvas rounded-md px-3 py-2 border border-hairline">
                        <p className="text-charcoal text-xs">{job.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
