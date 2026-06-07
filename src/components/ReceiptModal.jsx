import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { paymentStatus, PAYMENT_COLOR } from '../constants'
import { useLang } from '../context/LanguageContext'
import { X, Printer } from 'lucide-react'

function makeInvNo(job) {
  const d = new Date(job.created_at || Date.now())
  return `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${(job.id||'').slice(-4).toUpperCase()}`
}

function InvoiceBody({ job, workshop, t }) {
  const balance  = (Number(job.total_amount) || 0) - (Number(job.downpayment) || 0)
  const fmt      = (v) => v != null ? `RM ${Number(v).toFixed(2)}` : '-'
  const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
  const pStatus  = paymentStatus(job)
  const payLabel = { unpaid: t('pay_unpaid'), deposit: t('pay_deposit'), paid: t('pay_paid') }[pStatus]
  const pColor   = PAYMENT_COLOR[pStatus]
  const invNo    = makeInvNo(job)
  const instagram = workshop?.instagram?.replace(/^@/, '')

  const footerParts = [
    workshop?.phone,
    instagram ? `@${instagram}` : null,
    'digitaldepot.my',
  ].filter(Boolean)

  const S = { /* shared inline styles */
    label: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
    hr:    { border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' },
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', background: 'white', padding: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#ea2804', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {workshop?.logo_url
              ? <img src={workshop.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>{workshop?.name?.[0]?.toUpperCase() || 'D'}</span>
            }
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{workshop?.name || 'Digital Depot'}</p>
            {workshop?.address && <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{workshop.address}</p>}
            <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              {[workshop?.phone, instagram ? `@${instagram}` : null].filter(Boolean).join('  ·  ')}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>INVOIS</p>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', marginTop: 3 }}>{invNo}</p>
          <p style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>{fmtDate(job.date_in || job.created_at)}</p>
          {job.est_completion && (
            <p style={{ fontSize: 12, color: '#ea2804', fontWeight: 600, marginTop: 2 }}>Est: {fmtDate(job.est_completion)}</p>
          )}
        </div>
      </div>

      <hr style={S.hr} />

      {/* Billed to */}
      <div style={{ marginBottom: 20 }}>
        <p style={S.label}>Kepada</p>
        <p style={{ fontSize: 20, fontWeight: 800 }}>{job.owner}</p>
        {job.phone && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>{job.phone}</p>}
      </div>

      <hr style={S.hr} />

      {/* Items table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', paddingBottom: 8, borderBottom: '1px solid #e5e7eb', marginBottom: 12 }}>
          <p style={S.label}>Keterangan</p>
          <p style={{ ...S.label, textAlign: 'right' }}>Amaun</p>
        </div>

        {job.services?.length > 0 ? (
          <>
            {job.services.map((svc, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  {svc.category_name && (
                    <p style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{svc.category_name}</p>
                  )}
                  <p style={{ fontWeight: 500, fontSize: 14 }}>{svc.description}</p>
                  {(parseFloat(svc.qty) || 1) > 1 && (
                    <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                      {svc.qty} × RM {Number(svc.unit_price || 0).toFixed(2)}
                    </p>
                  )}
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, textAlign: 'right' }}>{fmt(svc.amount)}</p>
              </div>
            ))}
            {job.notes && (
              <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 10, fontStyle: 'italic' }}>{job.notes}</p>
            )}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ paddingRight: 24 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Servis Kenderaan — {job.plate}</p>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>
                {job.car}{job.stage ? ` · Peringkat: ${job.stage.toUpperCase()}` : ''}
              </p>
              {job.notes && (
                <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3, fontStyle: 'italic' }}>{job.notes}</p>
              )}
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, textAlign: 'right' }}>{fmt(job.total_amount)}</p>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ width: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: '#6b7280' }}>{t('rc_total')}</span>
            <span style={{ fontWeight: 500 }}>{fmt(job.total_amount)}</span>
          </div>
          {(Number(job.downpayment) || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>{t('rc_deposit')}</span>
              <span style={{ color: '#059669', fontWeight: 500 }}>− {fmt(job.downpayment)}</span>
            </div>
          )}
          <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t('rc_balance')}</span>
            <span style={{ fontWeight: 800, fontSize: 24, color: '#ea2804' }}>{fmt(balance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'white', background: pColor }}>{payLabel}</span>
          </div>
        </div>
      </div>

      <hr style={S.hr} />

      {/* Thank you */}
      <p style={{ fontSize: 13, color: '#374151' }}>
        ❤ {t('rc_thanks')} <strong>{workshop?.name || 'Digital Depot'}</strong>!
      </p>

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>{footerParts.join('  |  ')}</p>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>Page 1 of 1</p>
      </div>
    </div>
  )
}

export function ReceiptModal({ job, workshop, onClose }) {
  const { t } = useLang()

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return createPortal(
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm 15mm; }
        @media print {
          #root { display: none !important; }
          .receipt-screen-overlay { display: none !important; }
          #invoice-print-portal { display: block !important; }
        }
      `}</style>

      {/* Screen modal — hidden in print via .receipt-screen-overlay */}
      <div className="receipt-screen-overlay fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-hairline">

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline flex-shrink-0">
            <p className="font-semibold text-ink text-sm">{t('rc_title')}</p>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
              <X className="w-5 h-5 text-ash" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            <InvoiceBody job={job} workshop={workshop} t={t} />
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-hairline flex-shrink-0">
            <button onClick={() => window.print()}
              className="w-full bg-primary hover:bg-primary-deep text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
              <Printer className="w-4 h-4" /> {t('rc_print')}
            </button>
          </div>
        </div>
      </div>

      {/* Print-only invoice — rendered outside #root via portal, shown only in print */}
      <div id="invoice-print-portal" style={{ display: 'none' }}>
        <InvoiceBody job={job} workshop={workshop} t={t} />
      </div>
    </>,
    document.body
  )
}
