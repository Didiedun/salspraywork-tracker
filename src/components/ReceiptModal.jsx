import { useEffect } from 'react'
import { paymentStatus, PAYMENT_COLOR } from '../constants'
import { useLang } from '../context/LanguageContext'
import { X, Printer } from 'lucide-react'

export function ReceiptModal({ job, workshop, onClose }) {
  const { t } = useLang()
  const balance = (Number(job.total_amount) || 0) - (Number(job.downpayment) || 0)
  const fmt     = (v) => v != null ? `RM ${Number(v).toFixed(2)}` : '-'
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
  const pStatus = paymentStatus(job)
  const payLabels = { unpaid: t('pay_unpaid'), deposit: t('pay_deposit'), paid: t('pay_paid') }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const rows = [
    [t('rc_plate'),   <span className="font-bold tracking-widest text-primary">{job.plate}</span>],
    [t('rc_model'),   job.car],
    [t('rc_owner'),   job.owner],
    [t('rc_phone'),   job.phone || '-'],
    [t('rc_date_in'), fmtDate(job.date_in || job.created_at)],
    job.est_completion && [t('rc_est'), <strong>{fmtDate(job.est_completion)}</strong>],
    [t('rc_stage'),   job.stage?.toUpperCase() || 'READY'],
    [t('rc_notes'),   job.notes || '-'],
    [t('rc_total'),   fmt(job.total_amount)],
    [t('rc_deposit'), fmt(job.downpayment)],
    [t('rc_balance'), <span className="text-xl font-bold text-primary">{fmt(balance)}</span>],
    [t('rc_payment'), (
      <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold text-white"
        style={{ background: PAYMENT_COLOR[pStatus] }}>
        {payLabels[pStatus]}
      </span>
    )],
  ].filter(Boolean)

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#receipt-print-root) { display: none !important; }
          #receipt-print-root { position: fixed; inset: 0; z-index: 9999; background: white; }
          .no-print { display: none !important; }
          .receipt-card { box-shadow: none !important; border: none !important; background: white !important; }
        }
      `}</style>

      <div id="receipt-print-root" className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="receipt-card bg-surface-card rounded-lg w-full max-w-sm overflow-hidden border border-hairline shadow-lg">
          <div className="no-print flex items-center justify-between px-5 py-4 border-b border-hairline">
            <p className="font-display font-bold text-ink">{t('rc_title')}</p>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-canvas transition-colors">
              <X className="w-4 h-4 text-ash" />
            </button>
          </div>

          <div className="p-5">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-white text-2xl mx-auto mb-3 overflow-hidden">
                {workshop?.logo_url
                  ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
                  : (workshop?.name?.[0]?.toUpperCase() || 'D')
                }
              </div>
              <p className="font-display font-bold text-ink text-lg">{workshop?.name || 'Digital Depot'}</p>
              {workshop?.phone && <p className="text-ash text-xs mt-0.5">{workshop.phone}</p>}
            </div>

            <div className="bg-primary rounded-md py-3 text-center mb-4">
              <p className="text-white font-display font-bold text-2xl tracking-[0.2em]">{job.plate}</p>
            </div>

            <table className="w-full text-sm">
              <tbody>
                {rows.map(([label, value], i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-3 text-ash text-xs font-medium whitespace-nowrap w-1/3">{label}</td>
                    <td className="py-2 text-ink font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-center text-ash text-xs mt-4 pt-4 border-t border-hairline">
              {t('rc_thanks')} {workshop?.name || 'Digital Depot'}<br />
              {new Date().toLocaleString('ms-MY')}
            </p>
          </div>

          <div className="no-print px-5 pb-5">
            <button
              onClick={() => window.print()}
              className="w-full bg-primary hover:bg-primary-deep text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Printer className="w-4 h-4" /> {t('rc_print')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
