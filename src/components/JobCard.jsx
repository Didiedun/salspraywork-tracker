import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PaymentBadge, TypeBadge } from './StatusBadge'
import { StageBar } from './StageBar'
import { JobForm } from './JobForm'
import { ReceiptModal } from './ReceiptModal'
import { daysIn, isStale } from '../constants'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import {
  Edit2, Trash2, Camera, Printer, Image,
  ChevronDown, ChevronUp, X, ChevronRight, ChevronLeft, Clock, UserCheck
} from 'lucide-react'

export function JobCard({ job, onUpdate, onDelete, onAddAttachment, onDeleteAttachment }) {
  const [expanded, setExpanded]       = useState(false)
  const [editing, setEditing]         = useState(false)
  const [uploading, setUploading]     = useState(null)
  const [lightbox, setLightbox]       = useState(null)
  const [advancing, setAdvancing]     = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const photoRef = useRef()

  const { stages, stageMap, lastValue, nextStage, prevStage, isOverdue: checkOverdue } = useStages()
  const { t } = useLang()
  const { workshop } = useApp()

  const photos = job.job_attachments?.filter(a => a.type === 'photo') || []

  const stageIdx = stageMap[job.stage] ?? 0
  const isFirst  = stageIdx === 0
  const isLast   = job.stage === lastValue
  const overdue  = checkOverdue(job)
  const stale    = !overdue && !isLast && isStale(job)
  const days     = daysIn(job)

  const formatDate  = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  const formatMoney = (v) => v != null ? `RM ${Number(v).toFixed(2)}` : '-'
  const balance     = (Number(job.total_amount) || 0) - (Number(job.downpayment) || 0)

  const advanceStage = async (dir) => {
    setAdvancing(true)
    try {
      const newStage = dir === 'next' ? nextStage(job.stage) : prevStage(job.stage)
      await onUpdate(job.id, { stage: newStage, updated_at: new Date().toISOString() })
    } finally { setAdvancing(false) }
  }

  const uploadFile = async (file, type) => {
    setUploading(type)
    try {
      const ext    = file.name.split('.').pop()
      const folder = type === 'photo' ? 'photos' : 'receipts'
      const path   = `${folder}/${job.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
      await onAddAttachment(job.id, publicUrl, type, '', type === 'photo' ? job.stage : '')
    } catch (e) { alert('Gagal muat naik: ' + e.message) }
    finally { setUploading(null) }
  }

  const handleFileChange = (type) => (e) => {
    const file = e.target.files?.[0]; if (file) uploadFile(file, type); e.target.value = ''
  }

  const handleDelete = () => {
    if (window.confirm(`${t('card_confirm_delete')} ${job.plate}?`)) onDelete(job.id)
  }

  return (
    <>
      {editing && (
        <JobForm initial={job}
          onSave={(d) => onUpdate(job.id, d)} onClose={() => setEditing(false)} />
      )}
      {showReceipt && (
        <ReceiptModal job={job} workshop={workshop} onClose={() => setShowReceipt(false)} />
      )}
      {lightbox && (
        <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-md" />
          <button className="absolute top-4 right-4 text-white bg-ink/60 hover:bg-ink/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors" onClick={() => setLightbox(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`bg-surface-card rounded-lg border overflow-hidden transition-shadow hover:shadow-sm ${
        overdue ? 'border-red-200' : stale ? 'border-amber-200' : 'border-hairline'
      }`}>
        {overdue && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <p className="text-red-600 text-xs font-semibold">{t('overdue_label')} — {days} {t('card_overdue')}</p>
          </div>
        )}
        {stale && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-amber-700 text-xs font-semibold">{t('stale_label')}</p>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-ink text-lg tracking-tight">{job.plate}</span>
                <TypeBadge type={job.type} />
                {!overdue && days > 0 && (
                  <span className="text-xs text-mute flex items-center gap-1">
                    <Clock className="w-3 h-3" />{days}{t('days_short')}
                  </span>
                )}
              </div>
              <p className="text-charcoal text-sm mt-0.5 truncate">{job.car} — {job.owner}</p>
            </div>
            <PaymentBadge job={job} />
          </div>

          <div className="mt-3">
            <StageBar current={job.stage} stages={stages} />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => advanceStage('prev')}
              disabled={isFirst || advancing}
              className="flex items-center gap-1 text-xs text-mute hover:text-ink disabled:opacity-30 bg-canvas hover:bg-surface-bone border border-hairline px-2.5 py-1.5 rounded-full transition-colors font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {t('card_retreat')}
            </button>
            <div className="flex-1 text-center">
              <span className="text-xs font-semibold text-charcoal">
                {stages[stageIdx]?.label}
              </span>
            </div>
            <button
              onClick={() => advanceStage('next')}
              disabled={isLast || advancing}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-deep disabled:opacity-30 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-full transition-colors font-semibold"
            >
              {t('card_advance')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2.5 text-xs text-mute flex-wrap">
            <span>{formatDate(job.date_in || job.created_at)}</span>
            {job.updated_by && (
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                {job.updated_by.split('@')[0]}
              </span>
            )}
            {job.est_completion && (
              <span className="text-primary font-semibold">{t('form_est')}: {formatDate(job.est_completion)}</span>
            )}
            {job.total_amount != null && (
              <span className="font-semibold text-charcoal">
                {formatMoney(job.total_amount)}
                {!job.paid && balance > 0 && <span className="text-amber-600"> · {t('pay_balance').split(' ')[0]} {formatMoney(balance)}</span>}
              </span>
            )}
            {job.phone && (
              <a href={(() => { const d = job.phone.replace(/\D/g,''); const p = d.startsWith('60') ? d : '60'+d.replace(/^0/,''); return `https://wa.me/${p}?text=${encodeURIComponent(t('wa_msg') + ' ' + job.plate)}` })()}
                target="_blank" rel="noreferrer"
                className="text-badge-success hover:text-emerald-700 font-semibold" onClick={e => e.stopPropagation()}>
                {t('card_whatsapp')}
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-hairline">
          <button onClick={() => setExpanded(x => !x)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-mute hover:bg-canvas transition-colors">
            <span>{photos.length} {t('card_photos')}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4">
              {job.notes && (
                <div className="bg-canvas rounded-md p-3 text-sm text-body">
                  <span className="font-semibold text-charcoal text-xs block mb-1">{t('card_notes')}</span>
                  {job.notes}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5" /> {t('card_photos_lbl')} ({photos.length})
                  </p>
                  <button onClick={() => photoRef.current?.click()} disabled={!!uploading}
                    className="flex items-center gap-1.5 text-xs bg-canvas border border-hairline text-charcoal px-3 py-1.5 rounded-full hover:bg-surface-bone disabled:opacity-50 transition-colors font-semibold">
                    <Camera className="w-3.5 h-3.5" />
                    {uploading === 'photo' ? t('uploading') : t('card_add_photo')}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange('photo')} />
                </div>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.url} alt={img.stage} title={img.stage}
                          className="w-full aspect-square object-cover rounded-md cursor-pointer"
                          onClick={() => setLightbox(img.url)} />
                        {img.stage && (
                          <span className="absolute bottom-1 left-1 bg-ink/60 text-white text-xs px-1 rounded truncate max-w-[90%]">{img.stage}</span>
                        )}
                        <button onClick={() => window.confirm(t('delete') + '?') && onDeleteAttachment(job.id, img.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-ash italic">{t('card_no_photos')}</p>}
              </div>

            </div>
          )}
        </div>

        <div className="flex border-t border-hairline">
          <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-mute hover:bg-canvas hover:text-ink transition-colors font-semibold">
            <Edit2 className="w-3.5 h-3.5" /> {t('edit')}
          </button>
          <button onClick={() => setShowReceipt(true)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-mute hover:bg-canvas hover:text-ink transition-colors border-x border-hairline font-semibold">
            <Printer className="w-3.5 h-3.5" /> {t('card_invoice')}
          </button>
          <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-red-500 hover:bg-red-50 transition-colors font-semibold">
            <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
          </button>
        </div>
      </div>
    </>
  )
}
