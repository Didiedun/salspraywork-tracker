import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, Printer, Pencil, Wrench, CheckCircle2 } from 'lucide-react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useLang } from '../context/LanguageContext'
import { WhatsAppIcon } from './icons'
import { QuoteStatus } from './QuoteStatus'
import { cleanItems, quoteSubtotal, quoteTotal, quoteNumber, formatRM } from '../lib/quotations'

const DISPLAY = '"Barlow Semi Condensed", "Arial Narrow", sans-serif'

// The customer-facing document. Inline styles, like the invoice, so the printout
// does not depend on the app's stylesheet.
function QuotationBody({ quote, workshop, t, locale }) {
  const items = cleanItems(quote.items)
  const subtotal = quoteSubtotal(items)
  const discount = Number(quote.discount) || 0
  const fmtDate = (d) => d
    ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'
  const instagram = workshop?.instagram?.replace(/^@/, '')
  const contact = [workshop?.phone, instagram ? `@${instagram}` : null].filter(Boolean)
  const notes = (quote.notes || '').trim()

  const S = {
    label: { fontSize: 11, fontWeight: 700, color: '#616D75', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
    hr:    { border: 'none', borderTop: '1px solid #D7DEE1', margin: '20px 0' },
    row:   { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 },
  }

  return (
    <div className="quote-doc" style={{ fontFamily: 'Archivo, system-ui, -apple-system, sans-serif', color: '#141B1F', background: 'white', padding: '32px' }}>
      <div className="quote-doc-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0B5E78', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {workshop?.logo_url
              ? <img src={workshop.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>{workshop?.name?.[0]?.toUpperCase() || 'D'}</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{workshop?.name || 'Digital Depot'}</p>
            {workshop?.address && <p style={{ color: '#56626A', fontSize: 12, marginTop: 2 }}>{workshop.address}</p>}
            {contact.length > 0 && <p style={{ color: '#56626A', fontSize: 12, marginTop: 2 }}>{contact.join('  ·  ')}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1 }}>{t('qt_doc_title')}</p>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#56626A', marginTop: 3 }}>{quoteNumber(quote)}</p>
          <p style={{ fontSize: 12, color: '#2A3337', marginTop: 3 }}>{fmtDate(quote.created_at)}</p>
          {quote.valid_until && (
            <p style={{ fontSize: 12, color: '#0B5E78', fontWeight: 600, marginTop: 2 }}>{t('qt_doc_valid', { date: fmtDate(quote.valid_until) })}</p>
          )}
        </div>
      </div>

      <hr style={S.hr} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 48px', marginBottom: 20 }}>
        <div>
          <p style={S.label}>{t('qt_doc_to')}</p>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{quote.customer_name}</p>
          {quote.customer_phone && <p style={{ fontSize: 13, color: '#56626A', marginTop: 3 }}>{quote.customer_phone}</p>}
        </div>
        {(quote.plate || quote.car) && (
          <div>
            <p style={S.label}>{t('qt_doc_vehicle')}</p>
            {quote.plate && <p style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: '0.04em' }}>{quote.plate}</p>}
            {quote.car && <p style={{ fontSize: 13, color: '#56626A', marginTop: 3 }}>{quote.car}</p>}
          </div>
        )}
      </div>

      <hr style={S.hr} />

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', paddingBottom: 8, borderBottom: '1px solid #D7DEE1', marginBottom: 12 }}>
          <p style={S.label}>{t('qt_doc_desc')}</p>
          <p style={{ ...S.label, textAlign: 'right' }}>{t('qt_doc_amount')}</p>
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #E8EDEF' }}>
            <div>
              {item.category_name && (
                <p style={{ color: '#616D75', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{item.category_name}</p>
              )}
              <p style={{ fontWeight: 500, fontSize: 14 }}>{item.description}</p>
              {item.qty > 1 && <p style={{ color: '#616D75', fontSize: 11, marginTop: 2 }}>{item.qty} × {formatRM(item.unit_price)}</p>}
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, textAlign: 'right' }}>{formatRM(item.amount)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ width: 260 }}>
          {discount > 0 && (
            <>
              <div style={S.row}><span style={{ color: '#56626A' }}>{t('rc_subtotal')}</span><span style={{ fontWeight: 500 }}>{formatRM(subtotal)}</span></div>
              <div style={S.row}><span style={{ color: '#56626A' }}>{t('rc_discount')}</span><span style={{ color: '#146C45', fontWeight: 500 }}>− {formatRM(discount)}</span></div>
            </>
          )}
          <div style={{ borderTop: '2px solid #D7DEE1', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t('rc_total')}</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: '#0B5E78' }}>{formatRM(quoteTotal(quote))}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div style={{ background: '#F4F6F7', border: '1px solid #E3E8EA', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
          <p style={S.label}>{t('qt_doc_terms')}</p>
          <p style={{ fontSize: 13, color: '#2A3337', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{notes}</p>
        </div>
      )}

      <hr style={S.hr} />
      <p style={{ fontSize: 13, color: '#2A3337' }}>
        {t('rc_thanks')} <strong>{workshop?.name || 'Digital Depot'}</strong>!
      </p>
      <p style={{ fontSize: 12, color: '#56626A', marginTop: 4 }}>{t('qt_doc_not_invoice')}</p>

      <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #D7DEE1' }}>
        <p style={{ fontSize: 11, color: '#616D75' }}>{[...contact, 'digitaldepot.my'].join('  |  ')}</p>
      </div>
    </div>
  )
}

// Preview + actions on screen; only the document itself goes to the printer.
export function QuotationViewer({ quote, workshop, waHref, busy, onClose, onEdit, onWhatsApp, onConvert, onStatus, onDelete }) {
  const { t, lang } = useLang()
  const dialogRef = useDialogFocus(onClose)
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'
  const open = quote.status === 'draft' || quote.status === 'sent'
  const accepted = quote.status === 'accepted'
  const acceptedOn = new Date(quote.updated_at || quote.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const textBtn = 'inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors disabled:opacity-50'

  return createPortal(
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm 15mm; }
        /* Phone preview: title above the workshop details instead of beside them. */
        @media screen and (max-width: 520px) {
          .quote-screen-overlay .quote-doc { padding: 20px !important; }
          .quote-screen-overlay .quote-doc-head { flex-direction: column-reverse; }
          .quote-screen-overlay .quote-doc-head > :last-child { text-align: left !important; }
        }
        @media print {
          html, body { background: #fff !important; }
          #root { display: none !important; }
          .quote-screen-overlay { display: none !important; }
          #quote-print-portal { display: block !important; }
          #quote-print-portal, #quote-print-portal * { visibility: visible !important; }
        }
      `}</style>

      <div className="quote-screen-overlay fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="quote-view-title"
          className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col border border-hairline">

          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-hairline flex-shrink-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id="quote-view-title" className="truncate font-semibold text-ink text-sm">{t('qt_view_title', { no: quoteNumber(quote) })}</h2>
              <QuoteStatus quote={quote} />
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {!accepted && (
                <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
                  <Pencil className="w-4 h-4" aria-hidden="true" /> {t('edit')}
                </button>
              )}
              <button type="button" aria-label={t('ui_close')} onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
                <X className="w-5 h-5 text-mute" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 bg-white" tabIndex={0} aria-label={t('qt_view_title', { no: quoteNumber(quote) })}>
            <QuotationBody quote={quote} workshop={workshop} t={t} locale={locale} />
          </div>

          <div className="px-4 pb-4 pt-3 border-t border-hairline flex-shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a href={waHref} target="_blank" rel="noreferrer" onClick={onWhatsApp}
                className="ui-secondary text-badge-success hover:bg-emerald-50">
                <WhatsAppIcon className="w-4 h-4" /> {t('card_whatsapp')}
              </a>
              <button type="button" onClick={() => window.print()} className="ui-secondary">
                <Printer className="w-4 h-4" /> {t('rc_print')}
              </button>
            </div>
            {open && (
              <button type="button" onClick={onConvert} disabled={busy} className="ui-primary w-full">
                <Wrench className="w-4 h-4" aria-hidden="true" /> {t('qt_to_job')}
              </button>
            )}
            {accepted && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-badge-success">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {t('qt_accepted_note', { date: acceptedOn })}
                </p>
                <Link to="/dashboard" className="text-sm font-semibold text-badge-success underline underline-offset-2">{t('qt_open_dashboard')}</Link>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-1">
              {quote.status === 'draft' && (
                <button type="button" onClick={() => onStatus('sent')} disabled={busy} className={`${textBtn} text-charcoal hover:bg-canvas`}>{t('qt_mark_sent')}</button>
              )}
              {open && (
                <button type="button" onClick={() => onStatus('rejected')} disabled={busy} className={`${textBtn} text-red-700 hover:bg-red-50`}>{t('qt_mark_rejected')}</button>
              )}
              {quote.status === 'rejected' && (
                <button type="button" onClick={() => onStatus('sent')} disabled={busy} className={`${textBtn} text-primary hover:bg-primary/10`}>{t('qt_reopen')}</button>
              )}
              {accepted && (
                <button type="button" onClick={onDelete} disabled={busy} className={`${textBtn} text-red-700 hover:bg-red-50`}>{t('qt_delete')}</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="quote-print-portal" style={{ display: 'none' }}>
        <QuotationBody quote={quote} workshop={workshop} t={t} locale={locale} />
      </div>
    </>,
    document.body
  )
}
