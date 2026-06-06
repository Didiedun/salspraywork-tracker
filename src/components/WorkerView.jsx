import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useJobs } from '../hooks/useJobs'
import { supabase } from '../lib/supabase'
import { StageBar } from './StageBar'
import { PaymentBadge } from './StatusBadge'
import { daysIn } from '../constants'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { RefreshCw, ChevronRight, ChevronLeft, Search, LogOut, Wrench, Clock, Camera, X, Image } from 'lucide-react'

export function WorkerView() {
  const { workshop, signOut } = useApp()
  const { jobs, loading, fetchJobs, updateJob, addAttachment } = useJobs(workshop?.id)
  const [search, setSearch]     = useState('')
  const [advancing, setAdvancing] = useState({})
  const [uploading, setUploading] = useState({})
  const [lightbox, setLightbox]   = useState(null)
  const { stages, stageMap, lastValue, nextStage, prevStage, isOverdue: checkOverdue } = useStages()
  const { t } = useLang()

  const activeJobs = useMemo(() =>
    jobs.filter(j => !j.archived && j.stage !== lastValue)
      .filter(j => {
        if (!search) return true
        const q = search.toLowerCase()
        return j.plate.toLowerCase().includes(q) ||
          j.owner.toLowerCase().includes(q) ||
          (j.car || '').toLowerCase().includes(q)
      }),
    [jobs, search, lastValue]
  )

  const advanceStage = async (job, dir) => {
    setAdvancing(a => ({ ...a, [job.id]: true }))
    try {
      const newStage = dir === 'next' ? nextStage(job.stage) : prevStage(job.stage)
      await updateJob(job.id, { stage: newStage, updated_at: new Date().toISOString() })
    } finally {
      setAdvancing(a => ({ ...a, [job.id]: false }))
    }
  }

  const uploadPhoto = async (job, file) => {
    setUploading(u => ({ ...u, [job.id]: true }))
    try {
      const ext  = file.name.split('.').pop()
      const path = `photos/${job.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
      await addAttachment(job.id, publicUrl, 'photo', '', job.stage)
    } catch (e) { alert('Gagal muat naik: ' + e.message) }
    finally { setUploading(u => ({ ...u, [job.id]: false })) }
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })
    : '-'

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-canvas border-b border-hairline sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-ink text-sm leading-tight">{workshop?.name}</p>
              <p className="text-mute text-xs">{t('wv_title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchJobs}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-card border border-hairline text-mute hover:text-ink transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-charcoal bg-surface-card hover:bg-surface-bone border border-hairline px-3 py-2 rounded-full transition-colors font-semibold">
              <LogOut className="w-3.5 h-3.5" /> {t('nav_logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('wv_active'),      value: jobs.filter(j => !j.archived).length,           color: 'text-primary'  },
            { label: t('wv_in_progress'), value: jobs.filter(j => !j.archived && j.stage !== lastValue && j.stage !== stages[0]?.value).length, color: 'text-amber-600' },
            { label: t('wv_done_today'),  value: jobs.filter(j => {
              if (j.stage !== lastValue) return false
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

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('wv_search_ph')}
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-mute">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
            <p>{t('loading')}</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="text-center py-16 text-ash">
            <p className="font-semibold text-charcoal">{t('wv_no_jobs')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map(job => {
              const overdue   = checkOverdue(job)
              const days      = daysIn(job)
              const stageIdx  = stageMap[job.stage] ?? 0
              const isFirst   = stageIdx === 0
              const isLast    = job.stage === lastValue
              const isBusy    = advancing[job.id]

              return (
                <div key={job.id}
                  className={`bg-surface-card rounded-lg border overflow-hidden ${overdue ? 'border-red-200' : 'border-hairline'}`}>
                  {overdue && (
                    <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-red-600 text-xs font-semibold">{t('overdue_label')} — {days} {t('overdue_days')}</p>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-display font-bold text-ink text-lg tracking-tight">{job.plate}</p>
                        <p className="text-charcoal text-sm">{job.car} — {job.owner}</p>
                        <p className="text-mute text-xs mt-0.5">{t('wv_date_in')} {formatDate(job.date_in || job.created_at)}</p>
                      </div>
                      <PaymentBadge job={job} />
                    </div>

                    <StageBar current={job.stage} stages={stages} />

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => advanceStage(job, 'prev')}
                        disabled={isFirst || isBusy}
                        className="flex items-center gap-1 text-xs text-mute hover:text-ink disabled:opacity-30 bg-canvas hover:bg-surface-bone border border-hairline px-2.5 py-1.5 rounded-full transition-colors font-semibold">
                        <ChevronLeft className="w-3.5 h-3.5" /> {t('card_retreat')}
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-xs font-semibold text-charcoal">
                          {isBusy
                            ? <RefreshCw className="w-3 h-3 animate-spin inline" />
                            : stages[stageIdx]?.label
                          }
                        </span>
                      </div>
                      <button
                        onClick={() => advanceStage(job, 'next')}
                        disabled={isLast || isBusy}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-deep disabled:opacity-30 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-full transition-colors font-semibold">
                        {t('card_advance')} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {job.notes && (
                      <div className="mt-3 bg-canvas rounded-md px-3 py-2 border border-hairline">
                        <p className="text-charcoal text-xs">{job.notes}</p>
                      </div>
                    )}

                    {/* Photo upload */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-mute">
                        <Image className="w-3.5 h-3.5" />
                        <span>{(job.job_attachments?.filter(a => a.type === 'photo') || []).length} {t('card_photos')}</span>
                      </div>
                      <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                        uploading[job.id]
                          ? 'bg-canvas border-hairline text-ash'
                          : 'bg-canvas border-hairline text-charcoal hover:bg-surface-bone'
                      }`}>
                        <Camera className="w-3.5 h-3.5" />
                        {uploading[job.id] ? t('uploading') : t('card_add_photo')}
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          disabled={!!uploading[job.id]}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(job, f); e.target.value = '' }} />
                      </label>
                    </div>

                    {/* Photo thumbnails */}
                    {(job.job_attachments?.filter(a => a.type === 'photo') || []).length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {job.job_attachments.filter(a => a.type === 'photo').map(img => (
                          <div key={img.id} className="relative">
                            <img src={img.url} alt={img.stage}
                              className="w-full aspect-square object-cover rounded-md cursor-pointer"
                              onClick={() => setLightbox(img.url)} />
                            {img.stage && (
                              <span className="absolute bottom-0.5 left-0.5 bg-ink/60 text-white text-xs px-1 rounded truncate max-w-[90%] text-[10px]">{img.stage}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-md" />
          <button className="absolute top-4 right-4 text-white bg-ink/60 hover:bg-ink/80 rounded-full w-10 h-10 flex items-center justify-center"
            onClick={() => setLightbox(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
