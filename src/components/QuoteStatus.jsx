import { useLang } from '../context/LanguageContext'
import { isExpired } from '../lib/quotations'

const STYLE = {
  draft:    'bg-canvas text-charcoal border-hairline',
  sent:     'bg-primary/10 text-primary border-primary/25',
  accepted: 'bg-emerald-50 text-badge-success border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

// Status pill; an open quotation past its date also gets an "expired" pill
// unless the caller shows expiry itself (showExpired={false}).
export function QuoteStatus({ quote, showExpired = true }) {
  const { t } = useLang()
  const pill = 'inline-block whitespace-nowrap px-3 py-0.5 rounded-full text-xs font-semibold border'
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      <span className={`${pill} ${STYLE[quote.status] || STYLE.draft}`}>{t(`qt_status_${quote.status}`)}</span>
      {showExpired && isExpired(quote) && <span className={`${pill} bg-amber-50 text-amber-800 border-amber-200`}>{t('qt_expired')}</span>}
    </span>
  )
}
