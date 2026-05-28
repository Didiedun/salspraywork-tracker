import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { PaymentBadge, TypeBadge } from './StatusBadge'
import { StageBar } from './StageBar'
import { JobForm } from './JobForm'
import { ReceiptModal } from './ReceiptModal'
import { STAGES, STAGE_INDEX, nextStage, prevStage, daysIn, isOverdue } from '../constants'
import {
  Edit2, Trash2, Camera, Receipt, Printer, Image,
  ChevronDown, ChevronUp, Upload, X, ChevronRight, ChevronLeft, Clock
} from 'lucide-react'

export function JobCard({ job, onUpdate, onDelete, onAddAttachment, onDeleteAttachment }) {
  const [expanded, setExpanded]       = useState(false)
  const [editing, setEditing]         = useState(false)
  const [uploading, setUploading]     = useState(null)
  const [lightbox, setLightbox]       = useState(null)
  const [advancing, setAdvancing]     = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const photoRef   = useRef()
  const receiptRef = useRef()

  const photos   = job.job_attachments?.filter(a => a.type === 'photo')   || []
  const receipts = job.job_attachments?.filter(a => a.type === 'receipt') || []

  const stageIdx = STAGE_INDEX[job.stage] ?? 0
  const isFirst  = stageIdx === 0
  const isLast   = stageIdx === STAGES.length - 1
  const overdue  = isOverdue(job)
  const days     = daysIn(job)

  const formatDate  = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  const formatMoney = (v) => v != null ? `RM ${Number(v).toFixed(2)}` : '-'
  const balance     = (Number(job.total_amount) || 0) - (Number(job.downpayment) || 0)

  const advanceStage = async (dir) => {
    setAdvancing(true)
    try {
      const newStage = dir === 'next' ? nextStage(job.stage) : prevStage(job.stage)
      await onUpdate(job.id, { stage: newStage })
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
    if (window.confirm(`Padam kerja ${job.plate}?`)) onDelete(job.id)
  }

  return (
    <>
      {editing && (
        <JobForm title="Edit Kerja" initial={job}
          onSave={(d) => onUpdate(job.id, d)} onClose={() => setEditing(false)} />
      )}
      {showReceipt && (
        <ReceiptModal job={job} onClose={() => setShowReceipt(false)} />
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
        overdue ? 'border-red-200' : 'border-hairline'
      }`}>
        {/* Overdue banner */}
        {overdue && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <p className="text-red-600 text-xs font-semibold">Tertangguh — {days} hari dalam bengkel</p>
          </div>
        )}

        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-ink text-lg tracking-tight">{job.plate}</span>
                <TypeBadge type={job.type} />
                {!overdue && days > 0 && (
                  <span className="text-xs text-mute flex items-center gap-1">
                    <Clock className="w-3 h-3" />{days}h
                  </span>
                )}
              </div>
              <p className="text-charcoal text-sm mt-0.5 truncate">{job.car} — {job.owner}</p>
            </div>
            <PaymentBadge job={job} />
          </div>

          {/* Stage bar */}
          <div className="mt-3">
            <StageBar current={job.stage} />
          </div>

          {/* Quick stage advance */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => advanceStage('prev')}
              disabled={isFirst || advancing}
              className="flex items-center gap-1 text-xs text-mute hover:text-ink disabled:opacity-30 bg-canvas hover:bg-surface-bone border border-hairline px-2.5 py-1.5 rounded-full transition-colors font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Undur
            </button>
            <div className="flex-1 text-center">
              <span className="text-xs font-semibold text-charcoal">
                {STAGES[stageIdx]?.label}
              </span>
            </div>
            <button
              onClick={() => advanceStage('next')}
              disabled={isLast || advancing}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-deep disabled:opacity-30 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-full transition-colors font-semibold"
            >
              Maju <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-mute flex-wrap">
            <span>{formatDate(job.date_in || job.created_at)}</span>
            {job.est_completion && (
              <span className="text-primary font-semibold">Siap: {formatDate(job.est_completion)}</span>
            )}
            {job.total_amount != null && (
              <span className="font-semibold text-charcoal">
                {formatMoney(job.total_amount)}
                {!job.paid && balance > 0 && <span className="text-amber-600"> · Baki {formatMoney(balance)}</span>}
              </span>
            )}
            {job.phone && (
              <a href={`https://wa.me/60${job.phone.replace(/^0/, '')}?text=Salam%2C%20tentang%20kenderaan%20${job.plate}`}
                target="_blank" rel="noreferrer"
                className="text-badge-success hover:text-emerald-700 font-semibold" onClick={e => e.stopPropagation()}>
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Expandable */}
        <div className="border-t border-hairline">
          <button onClick={() => setExpanded(x => !x)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-mute hover:bg-canvas transition-colors">
            <span>{photos.length} gambar · {receipts.length} resit</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4">
              {job.notes && (
                <div className="bg-canvas rounded-md p-3 text-sm text-body">
                  <span className="font-semibold text-charcoal text-xs block mb-1">Nota</span>
                  {job.notes}
                </div>
              )}

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5" /> Gambar ({photos.length})
                  </p>
                  <button onClick={() => photoRef.current?.click()} disabled={!!uploading}
                    className="flex items-center gap-1.5 text-xs bg-canvas border border-hairline text-charcoal px-3 py-1.5 rounded-full hover:bg-surface-bone disabled:opacity-50 transition-colors font-semibold">
                    <Camera className="w-3.5 h-3.5" />
                    {uploading === 'photo' ? 'Muat naik...' : 'Tambah'}
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
                        <button onClick={() => window.confirm('Padam?') && onDeleteAttachment(job.id, img.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-ash italic">Tiada gambar</p>}
              </div>

              {/* Receipts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" /> Resit ({receipts.length})
                  </p>
                  <button onClick={() => receiptRef.current?.click()} disabled={!!uploading}
                    className="flex items-center gap-1.5 text-xs bg-canvas border border-hairline text-charcoal px-3 py-1.5 rounded-full hover:bg-surface-bone disabled:opacity-50 transition-colors font-semibold">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading === 'receipt' ? 'Muat naik...' : 'Muat Naik'}
                  </button>
                  <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange('receipt')} />
                </div>
                {receipts.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {receipts.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-md cursor-pointer" onClick={() => setLightbox(img.url)} />
                        {img.caption && <span className="absolute bottom-1 left-1 bg-ink/60 text-white text-xs px-1 rounded">{img.caption}</span>}
                        <button onClick={() => window.confirm('Padam?') && onDeleteAttachment(job.id, img.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex border-t border-hairline">
          <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-mute hover:bg-canvas hover:text-ink transition-colors font-semibold">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => setShowReceipt(true)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-mute hover:bg-canvas hover:text-ink transition-colors border-x border-hairline font-semibold">
            <Printer className="w-3.5 h-3.5" /> Invois
          </button>
          <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-red-500 hover:bg-red-50 transition-colors font-semibold">
            <Trash2 className="w-3.5 h-3.5" /> Padam
          </button>
        </div>
      </div>
    </>
  )
}
