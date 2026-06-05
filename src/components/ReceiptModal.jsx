import { useEffect } from 'react'
import { paymentStatus, PAYMENT_COLOR } from '../constants'
import { useLang } from '../context/LanguageContext'
import { X, Printer } from 'lucide-react'

function invNo(job) {
  const d = new Date(job.created_at || Date.now())
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  return `INV-${ymd}-${(job.id || '').slice(-4).toUpperCase()}`
}

export function ReceiptModal({ job, workshop, onClose }) {
  const { t } = useLang()
  const balance  = (Number(job.total_amount) || 0) - (Number(job.downpayment) || 0)
  const fmt      = (v) => v != null ? `RM ${Number(v).toFixed(2)}` : '-'
  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
  const pStatus  = paymentStatus(job)
  const payLabel = { unpaid: t('pay_unpaid'), deposit: t('pay_deposit'), paid: t('pay_paid') }[pStatus]
  const pColor   = PAYMENT_COLOR[pStatus]

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-root, #receipt-print-root * { visibility: visible; }
          #receipt-print-root { position: fixed; top: 0; left: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="receipt-print-root"
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-hairline">

          {/* Modal header — hidden on print */}
          <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-hairline flex-shrink-0">
            <p className="font-semibold text-ink text-sm">{t('rc_title')}</p>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
              <X className="w-5 h-5 text-ash" />
            </button>
          </div>

          {/* Invoice body — scrollable */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* From — workshop */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                {workshop?.logo_url
                  ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-xl">{workshop?.name?.[0]?.toUpperCase() || 'D'}</span>
                }
              </div>
              <div>
                <p className="font-display font-bold text-ink text-base leading-tight">{workshop?.name || 'Digital Depot'}</p>
                {workshop?.phone && <p className="text-mute text-xs mt-0.5">{workshop.phone}</p>}
              </div>
            </div>

            {/* Invoice meta */}
            <div className="bg-canvas rounded-xl border border-hairline px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-mute font-medium uppercase tracking-wide mb-0.5">Invoice No.</p>
                <p className="font-mono font-bold text-ink text-sm">{invNo(job)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-mute font-medium uppercase tracking-wide mb-0.5">Tarikh</p>
                <p className="font-semibold text-ink text-sm">{fmtDate(job.date_in || job.created_at)}</p>
              </div>
            </div>

            {/* Billed to */}
            <div>
              <p className="text-[10px] font-bold text-mute uppercase tracking-widest mb-2">Dihantar Kepada</p>
              <div className="bg-canvas rounded-xl border border-hairline px-4 py-3 space-y-1">
                <p className="font-semibold text-ink">{job.owner}</p>
                {job.phone && <p className="text-mute text-sm">{job.phone}</p>}
              </div>
            </div>

            {/* Vehicle */}
            <div>
              <p className="text-[10px] font-bold text-mute uppercase tracking-widest mb-2">Kenderaan</p>
              <div className="bg-canvas rounded-xl border border-hairline overflow-hidden">
                <div className="bg-primary px-4 py-3 text-center">
                  <p className="text-white font-display font-bold text-2xl tracking-[0.2em]">{job.plate}</p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-mute">{t('rc_model')}</span>
                    <span className="font-semibold text-ink">{job.car}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">{t('rc_stage')}</span>
                    <span className="font-semibold text-ink uppercase text-xs tracking-wide">{job.stage}</span>
                  </div>
                  {job.est_completion && (
                    <div className="flex justify-between">
                      <span className="text-mute">{t('rc_est')}</span>
                      <span className="font-semibold text-primary text-xs">{fmtDate(job.est_completion)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {job.notes && (
              <div>
                <p className="text-[10px] font-bold text-mute uppercase tracking-widest mb-2">{t('rc_notes')}</p>
                <div className="bg-canvas rounded-xl border border-hairline px-4 py-3">
                  <p className="text-charcoal text-sm leading-relaxed">{job.notes}</p>
                </div>
              </div>
            )}

            {/* Payment summary */}
            <div>
              <p className="text-[10px] font-bold text-mute uppercase tracking-widest mb-2">Ringkasan Bayaran</p>
              <div className="bg-canvas rounded-xl border border-hairline overflow-hidden">
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal">{t('rc_total')}</span>
                    <span className="font-semibold text-ink">{fmt(job.total_amount)}</span>
                  </div>
                  {(Number(job.downpayment) || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>{t('rc_deposit')}</span>
                      <span className="font-semibold">- {fmt(job.downpayment)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-hairline px-4 py-3 flex justify-between items-center">
                  <span className="font-bold text-ink">{t('rc_balance')}</span>
                  <span className="font-display font-bold text-2xl text-primary">{fmt(balance)}</span>
                </div>
                <div className="border-t border-hairline px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-mute font-medium">{t('rc_payment')}</span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: pColor }}>{payLabel}</span>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center pt-1 pb-2 border-t border-hairline">
              <p className="text-mute text-xs">{t('rc_thanks')} <strong>{workshop?.name || 'Digital Depot'}</strong></p>
              <p className="text-mute text-xs mt-0.5 font-mono">digitaldepot.my</p>
            </div>

          </div>

          {/* Print button — hidden on print */}
          <div className="no-print px-5 pb-5 pt-3 border-t border-hairline flex-shrink-0">
            <button onClick={() => window.print()}
              className="w-full bg-primary hover:bg-primary-deep text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
              <Printer className="w-4 h-4" /> {t('rc_print')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
