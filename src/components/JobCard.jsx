import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PaymentBadge, TypeBadge } from './StatusBadge'
import { StageBar } from './StageBar'
import { JobForm } from './JobForm'
import { ReceiptModal } from './ReceiptModal'
import { CustomerHistoryModal } from './CustomerHistoryModal'
import { PaymentModal } from './PaymentModal'
import { RefundModal } from './RefundModal'
import { Lightbox } from './Lightbox'
import { WhatsAppIcon } from './icons'
import { daysIn, isStale } from '../constants'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import { useNotify } from '../context/NotifyContext'
import {
  Edit2, Camera, Printer, ChevronDown, X, ChevronRight, ChevronLeft, Clock, UserCheck, Mail,
  Loader, Banknote, CheckCircle2, History,
} from 'lucide-react'

function EmailToast({ job, workshop, t, onClose }) {
  const statusUrl = workshop?.slug ? `${window.location.origin}/w/${workshop.slug}` : ''
  const body = `Hi ${job.owner},\n\n${t('email_body_stage')}: ${job.stage.toUpperCase()}\n\n${statusUrl ? `Semak status: ${statusUrl}\n\n` : ''}${workshop?.name || 'Workshop'}`
  const href = `mailto:${job.customer_email}?subject=${encodeURIComponent(t('email_subject') + ' — ' + job.plate)}&body=${encodeURIComponent(body)}`
  return (
    <div role="status" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 bg-surface-dark text-on-dark rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 text-sm w-[calc(100vw-2rem)] max-w-sm sm:bottom-6">
      <Mail className="w-4 h-4 flex-shrink-0 opacity-70" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs">{t('email_prompt')}</p>
        <p className="text-on-dark/70 text-xs truncate">{job.customer_email}</p>
      </div>
      <a href={href} onClick={onClose} target="_blank" rel="noreferrer"
        className="flex-shrink-0 text-xs font-semibold bg-white text-ink hover:bg-canvas px-3 py-2 rounded-full transition-colors whitespace-nowrap">
        {t('email_send')}
      </a>
      <button onClick={onClose} aria-label={t('ui_close')} className="flex h-8 w-8 items-center justify-center rounded-full text-on-dark/70 hover:text-on-dark transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function timeAgo(dateStr, lang) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 120)   return lang === 'ms' ? 'baru sahaja' : 'just now'
  if (diff < 3600)  { const m = Math.floor(diff / 60);   return lang === 'ms' ? `${m} minit lalu`  : `${m}m ago` }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return lang === 'ms' ? `${h} jam lalu`    : `${h}h ago` }
  const d = Math.floor(diff / 86400)
  return lang === 'ms' ? `${d} hari lalu` : `${d}d ago`
}

export function JobCard({ job, visitCount = 1, onUpdate, onRefresh, onDelete, onAddAttachment, onDeleteAttachment }) {
  const [expanded, setExpanded]       = useState(false)
  const [editing, setEditing]         = useState(false)
  const [uploading, setUploading]     = useState(null)
  const [lightbox, setLightbox]       = useState(null)
  const [advancing, setAdvancing]     = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showRefund, setShowRefund]   = useState(false)
  const [emailPrompt, setEmailPrompt] = useState(false)
  const photoRef = useRef()

  const { stages, stageMap, lastValue, nextStage, prevStage, isOverdue: checkOverdue } = useStages()
  const { t, lang } = useLang()
  const { workshop } = useApp()
  const { toast, confirm } = useNotify()

  const photos = job.job_attachments?.filter(a => a.type === 'photo') || []

  const stageIdx = stageMap[job.stage] ?? 0
  const isFirst  = stageIdx === 0
  const isLast   = job.stage === lastValue
  const overdue  = checkOverdue(job)
  const stale    = !overdue && !isLast && isStale(job)
  const days     = daysIn(job)
  const nextLabel = stages[Math.min(stageIdx + 1, stages.length - 1)]?.label
  const prevLabel = stages[Math.max(stageIdx - 1, 0)]?.label

  // Year only when it isn't this year — keeps facts on one line.
  const formatDate  = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    const opts = { day: '2-digit', month: 'short', ...(date.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }) }
    return date.toLocaleDateString(lang === 'en' ? 'en-MY' : 'ms-MY', opts)
  }
  const formatMoney = (v) => v != null ? `RM ${Number(v).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
  const balance     = (Number(job.total_amount) || 0) - (Number(job.discount) || 0) - (Number(job.downpayment) || 0)
  const owes        = !job.paid && balance > 0

  const waHref = (() => {
    if (!job.phone) return null
    const d = job.phone.replace(/\D/g, ''); const p = d.startsWith('60') ? d : '60' + d.replace(/^0/, '')
    const msg = isLast
      ? `${t('wa_msg_ready')} (${job.plate})` + (owes ? ` — ${t('pay_balance')}: RM ${balance.toFixed(2)}` : '')
      : t('wa_msg') + ' ' + job.plate
    return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`
  })()

  const advanceStage = async (dir) => {
    setAdvancing(true)
    try {
      const newStage = dir === 'next' ? nextStage(job.stage) : prevStage(job.stage)
      await onUpdate(job.id, { stage: newStage, updated_at: new Date().toISOString() })
      if (dir === 'next' && job.customer_email) setEmailPrompt(true)
    } catch (e) {
      toast.error(e.message)
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
    } catch (e) { toast.error(`${t('upload_failed')}: ${e.message}`) }
    finally { setUploading(null) }
  }

  const handleFileChange = (type) => (e) => {
    const file = e.target.files?.[0]; if (file) uploadFile(file, type); e.target.value = ''
  }

  const deletePhoto = async (img) => {
    if (!(await confirm({ title: t('photo_delete_title'), message: t('confirm_irreversible'), confirmLabel: t('delete'), tone: 'danger' }))) return
    try { await onDeleteAttachment(job.id, img.id) } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      {editing && (
        <JobForm initial={job}
          onSave={(d) => onUpdate(job.id, d)}
          onDelete={() => onDelete(job.id)}
          onClose={() => setEditing(false)} />
      )}
      {showReceipt && <ReceiptModal job={job} workshop={workshop} onClose={() => setShowReceipt(false)} />}
      {showHistory && <CustomerHistoryModal plate={job.plate} onClose={() => setShowHistory(false)} />}
      {showPayment && <PaymentModal job={job} onSave={onUpdate} onRefresh={() => onRefresh?.(job.id)} onClose={() => setShowPayment(false)} />}
      {showRefund && <RefundModal job={job} onSave={onUpdate} onClose={() => setShowRefund(false)} />}
      {emailPrompt && <EmailToast job={job} workshop={workshop} t={t} onClose={() => setEmailPrompt(false)} />}
      {lightbox && <Lightbox src={lightbox.url} alt={lightbox.stage || job.plate} onClose={() => setLightbox(null)} />}

      <article aria-labelledby={`job-${job.id}`} className={`job-card border ${
        overdue ? 'border-red-200' : stale ? 'border-amber-200' : 'border-hairline'
      }`}>
        {(overdue || stale) && (
          <p className={`flex items-center gap-2 border-b px-5 py-2 text-xs font-semibold ${
            overdue ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'
          }`}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            {overdue ? `${t('overdue_label')} — ${days} ${t('card_overdue')}` : t('stale_label')}
          </p>
        )}

        <div className="job-card-body">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id={`job-${job.id}`} className="plate text-xl sm:text-2xl">{job.plate}</h3>
                <TypeBadge type={job.type} />
                {visitCount > 1 && (
                  <button onClick={() => setShowHistory(true)} title={t('hist_title')}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold hover:bg-primary/15 transition-colors">
                    <History className="w-3 h-3" aria-hidden="true" /> {t('card_visits', { n: visitCount })}
                  </button>
                )}
              </div>
              <p className="text-charcoal text-sm mt-2 truncate">{job.car} · {job.owner}</p>
            </div>
            <PaymentBadge job={job} />
          </div>

          <div className="mt-4">
            <StageBar current={job.stage} stages={stages} />
          </div>

          <dl className="job-facts">
            <div>
              <dt>{t('card_fact_in')}</dt>
              <dd>{formatDate(job.date_in || job.created_at)}{days > 0 && <span className="font-normal text-mute"> · {t('card_days', { n: days })}</span>}</dd>
            </div>
            {job.est_completion && (
              <div><dt>{t('card_fact_est')}</dt><dd className="text-primary">{formatDate(job.est_completion)}</dd></div>
            )}
            {job.total_amount != null && (
              <div><dt>{t('card_fact_total')}</dt><dd>{formatMoney(job.total_amount)}</dd></div>
            )}
            {owes && (
              <div><dt>{t('card_fact_balance')}</dt><dd>
                <button onClick={() => setShowPayment(true)} className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800">{formatMoney(balance)}</button>
              </dd></div>
            )}
            {balance < -0.005 && (
              <div><dt>{t('rc_overpaid')}</dt><dd>
                <button onClick={() => setShowRefund(true)} className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800">{formatMoney(-balance)}</button>
              </dd></div>
            )}
          </dl>

          {job.updated_by && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-mute">
              <UserCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{t('card_updated_by')} {job.updated_by.split('@')[0]}{job.updated_at && ` · ${timeAgo(job.updated_at, lang)}`}</span>
            </p>
          )}

          <div className="stage-controls mt-4 flex gap-2">
            <button onClick={() => advanceStage('prev')} disabled={isFirst || advancing}
              aria-label={t('card_retreat_to', { stage: prevLabel })} title={t('card_retreat_to', { stage: prevLabel })}
              className="flex min-h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-hairline bg-canvas text-charcoal transition-colors hover:bg-surface-bone disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {isLast ? (
              <p className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-badge-success">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {t('card_ready_pickup')}
              </p>
            ) : (
              <button onClick={() => advanceStage('next')} disabled={advancing}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60">
                {advancing && <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {t('card_advance_to', { stage: nextLabel })} <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-hairline">
          <button aria-expanded={expanded} onClick={() => setExpanded(x => !x)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-mute hover:bg-canvas hover:text-charcoal transition-colors">
            <span>{t('card_details_toggle', { n: photos.length })}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {expanded && (
            <div className="px-5 pb-5 space-y-4">
              {job.notes && (
                <div className="bg-canvas rounded-xl p-3 text-sm text-body">
                  <span className="font-semibold text-charcoal text-xs block mb-1">{t('card_notes')}</span>
                  {job.notes}
                </div>
              )}

              {job.services?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-charcoal mb-1.5">{t('form_services')}</p>
                  <ul className="divide-y divide-hairline rounded-xl border border-hairline text-sm">
                    {job.services.map((s, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2">
                        <span className="min-w-0 text-body">{s.description}{(parseFloat(s.qty) || 1) > 1 && <span className="text-mute"> × {s.qty}</span>}</span>
                        <span className="flex-shrink-0 font-semibold text-ink">{formatMoney(s.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal">{t('card_photos_lbl')} ({photos.length})</p>
                  <button onClick={() => photoRef.current?.click()} disabled={!!uploading}
                    className="flex min-h-9 items-center gap-1.5 text-xs bg-canvas border border-hairline text-charcoal px-3 rounded-full hover:bg-surface-bone disabled:opacity-50 transition-colors font-semibold">
                    {uploading === 'photo' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {uploading === 'photo' ? t('uploading') : t('card_add_photo')}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange('photo')} />
                </div>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(img => (
                      <div key={img.id} className="relative">
                        <button type="button" onClick={() => setLightbox(img)} className="block w-full" aria-label={`${t('card_photos_lbl')}: ${img.stage || job.plate}`}>
                          <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                        </button>
                        {img.stage && (
                          <span className="pointer-events-none absolute bottom-1 left-1 bg-ink/70 text-white text-[10px] px-1 rounded truncate max-w-[90%]">{img.stage}</span>
                        )}
                        <button onClick={() => deletePhoto(img)} aria-label={t('photo_delete_title')}
                          className="absolute top-1 right-1 bg-ink/70 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-mute">{t('card_no_photos')}</p>}
              </div>

              {owes && (
                <button onClick={() => setShowReceipt(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Printer className="w-3.5 h-3.5" /> {t('card_view_invoice')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="job-card-actions flex border-t border-hairline">
          {waHref && (
            <a href={waHref} target="_blank" rel="noreferrer" className="job-action text-badge-success hover:bg-emerald-50">
              <WhatsAppIcon className="w-4 h-4" /> {t('card_whatsapp')}
            </a>
          )}
          {owes ? (
            <button onClick={() => setShowPayment(true)} className="job-action job-action-primary">
              <Banknote className="w-4 h-4" /> {t('pay_collect')}
            </button>
          ) : (
            <button onClick={() => setShowReceipt(true)} className="job-action">
              <Printer className="w-4 h-4" /> {t('card_invoice')}
            </button>
          )}
          <button onClick={() => setEditing(true)} className="job-action">
            <Edit2 className="w-4 h-4" /> {t('edit')}
          </button>
        </div>
      </article>
    </>
  )
}
