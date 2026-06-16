import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import { paymentStatus, PAYMENT_COLOR } from '../constants'
import { X, Clock, RefreshCw } from 'lucide-react'

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(v) {
  if (v == null) return '-'
  return `RM ${Number(v).toFixed(2)}`
}

export function CustomerHistoryModal({ plate, onClose }) {
  const { t } = useLang()
  const { workshop } = useApp()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    if (!workshop?.id || !plate) return
    setLoading(true)
    const normalized = plate.replace(/\s/g, '').toUpperCase()
    supabase
      .from('jobs')
      .select('id, created_at, date_in, stage, paid, total_amount, discount, downpayment, services, owner, car, plate, notes')
      .eq('workshop_id', workshop.id)
      .ilike('plate', normalized)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobs(data || [])
        setLoading(false)
      })
  }, [workshop?.id, plate])

  const PAYMENT_LABEL = { unpaid: t('pay_unpaid'), deposit: t('pay_deposit'), paid: t('pay_paid') }

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-hairline">

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline flex-shrink-0">
          <div>
            <p className="font-semibold text-ink text-sm">{t('hist_title')}</p>
            <p className="text-xs text-mute font-mono mt-0.5">{plate}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-5 h-5 text-ash" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-mute">
              <RefreshCw className="w-6 h-6 animate-spin mb-3 opacity-40" />
              <p className="text-sm">{t('loading')}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-ash">
              <p className="font-semibold text-charcoal">{t('hist_empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-mute font-medium">{jobs.length} {t('hist_jobs_count')}</p>
              {jobs.map((job, idx) => {
                const pStatus = paymentStatus(job)
                const pColor  = PAYMENT_COLOR[pStatus]
                const pLabel  = PAYMENT_LABEL[pStatus]
                const balance = (Number(job.total_amount) || 0) - (Number(job.discount) || 0) - (Number(job.downpayment) || 0)
                const isCurrent = idx === 0

                return (
                  <div key={job.id} className={`rounded-lg border p-4 ${isCurrent ? 'border-primary/30 bg-red-50/40' : 'border-hairline bg-surface-card'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-mute">
                          <Clock className="w-3 h-3" />
                          {fmtDate(job.date_in || job.created_at)}
                        </span>
                        {isCurrent && (
                          <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{t('hist_current')}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white flex-shrink-0" style={{ background: pColor }}>
                        {pLabel}
                      </span>
                    </div>

                    {job.car && (
                      <p className="text-xs text-charcoal font-medium mb-2">{job.car}</p>
                    )}

                    {job.services?.length > 0 ? (
                      <div className="space-y-1 mb-2">
                        {job.services.map((svc, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-body truncate flex-1 pr-3">
                              {svc.description}
                              {(parseFloat(svc.qty) || 1) > 1 && (
                                <span className="text-ash ml-1">×{svc.qty}</span>
                              )}
                            </span>
                            <span className="text-charcoal font-medium flex-shrink-0">
                              {fmtMoney(svc.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : job.notes ? (
                      <p className="text-xs text-body italic mb-2">{job.notes}</p>
                    ) : null}

                    <div className="flex items-center justify-between pt-2 border-t border-hairline/60">
                      <span className="text-xs font-semibold text-mute uppercase tracking-wide">{job.stage}</span>
                      <span className="text-sm font-bold text-ink">
                        {fmtMoney(job.total_amount)}
                        {!job.paid && balance > 0 && (
                          <span className="text-xs text-amber-600 font-medium ml-1">· Baki {fmtMoney(balance)}</span>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
