import { useState, useMemo, useEffect } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { X, Banknote, CreditCard, QrCode, Globe, TrendingUp, Printer, Calendar } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useDialogFocus } from '../hooks/useDialogFocus'

const METHOD_META = {
  // Methods are told apart by icon and label; status colours stay reserved for paid/deposit.
  cash:    { labelKey: 'pay_cash',    Icon: Banknote,   color: 'text-ink' },
  duitnow: { labelKey: 'pay_duitnow', Icon: QrCode,     color: 'text-ink' },
  online:  { labelKey: 'pay_online',  Icon: Globe,      color: 'text-ink' },
  card:    { labelKey: 'pay_card',    Icon: CreditCard, color: 'text-ink' },
  other:   { labelKey: 'eod_other',   Icon: TrendingUp, color: 'text-ink' },
}

// Calendar day in the user's time zone. toISOString() gives the UTC day, which
// is still "yesterday" in Malaysia until 8am.
const localDay = (value) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EODReport({ jobs, workshop, onClose }) {
  const { t, lang } = useLang()
  const dialogRef = useDialogFocus(onClose)
  const locale = lang === 'en' ? 'en-MY' : 'ms-MY'
  const todayStr = localDay(Date.now())
  const [date, setDate] = useState(todayStr)
  const [printedAt, setPrintedAt] = useState(() => new Date())

  // Stamp the print time whenever the page is printed (button or Ctrl+P).
  useEffect(() => {
    const stamp = () => flushSync(() => setPrintedAt(new Date()))
    window.addEventListener('beforeprint', stamp)
    return () => window.removeEventListener('beforeprint', stamp)
  }, [])

  const { summary, transactions, grandTotal } = useMemo(() => {
    const relevant = jobs.filter(j => {
      const stamp = j.updated_at || j.created_at
      return stamp && localDay(stamp) === date && (j.paid || Number(j.downpayment) > 0)
    })

    const s = Object.fromEntries(Object.keys(METHOD_META).map(key => [key, { amt: 0, count: 0 }]))
    let total = 0

    const txns = relevant.map(j => {
      const method = METHOD_META[j.payment_method] ? j.payment_method : 'other'
      const amt    = j.paid ? ((Number(j.total_amount) || 0) - (Number(j.discount) || 0)) : (Number(j.downpayment) || 0)
      s[method].amt   += amt
      s[method].count += 1
      total += amt
      return { job: j, method, amt, type: j.paid ? 'paid' : 'deposit' }
    })

    return { summary: s, transactions: txns, grandTotal: total }
  }, [jobs, date])

  const fmt = (v) => `RM ${Number(v).toFixed(2)}`
  const activeMethods = Object.entries(summary).filter(([, v]) => v.count > 0)
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return createPortal(
    <>
      <style>{`
        @page { size: A4 portrait; margin: 12mm 14mm; }
        @media print {
          html, body { background: #fff !important; }
          #root { display: none !important; }
          .eod-screen-overlay { display: none !important; }
          #eod-print-portal { display: block !important; }
          #eod-print-portal, #eod-print-portal * { visibility: visible !important; }
        }
      `}</style>

      {/* Screen modal — hidden in print; the printer gets #eod-print-portal instead */}
      <div className="eod-screen-overlay fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="eod-title"
          className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">

          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-hairline flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 id="eod-title" className="font-display font-bold text-ink">{t('eod_title')}</h3>
              {workshop?.name && <span className="text-xs text-mute truncate">· {workshop.name}</span>}
            </div>
            <button aria-label={t('ui_close')} onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors flex-shrink-0">
              <X className="w-4 h-4 text-ash" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Date picker */}
            <div className="px-5 py-3 border-b border-hairline flex items-center gap-2">
              <Calendar className="w-4 h-4 text-mute flex-shrink-0" />
              <input type="date" value={date} onChange={e => setDate(e.target.value || todayStr)}
                aria-label={t('eod_date_label')}
                max={todayStr}
                className="flex-1 bg-canvas border border-hairline rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>

            <div className="p-5 space-y-5">

              {/* Grand total */}
              <div className="bg-primary rounded-xl p-5 text-white text-center">
                <p className="text-sm opacity-80 mb-1">{t('eod_total_collected')}</p>
                <p className="font-display font-bold text-4xl">{fmt(grandTotal)}</p>
                <p className="text-sm opacity-80 mt-1">{transactions.length} {t('eod_transactions')}</p>
              </div>

              {/* Method breakdown */}
              {activeMethods.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {activeMethods.map(([method, { amt, count }]) => {
                    const { labelKey, Icon, color } = METHOD_META[method]
                    return (
                      <div key={method} className="bg-surface-bone rounded-xl p-4 border border-hairline">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className="text-xs font-semibold text-charcoal">{t(labelKey)}</span>
                        </div>
                        <p className={`font-bold text-lg font-display ${color}`}>{fmt(amt)}</p>
                        <p className="text-xs text-mute mt-0.5">{count} {t('eod_txn_count')}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Transaction list */}
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-ash">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium text-charcoal">{t('eod_no_transactions')}</p>
                  <p className="text-xs mt-1">{t('eod_no_transactions_sub')}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-charcoal uppercase tracking-wide mb-2">{t('eod_breakdown')}</p>
                  <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden">
                    {transactions.map(({ job, method, amt, type }, i) => {
                      const { Icon, color } = METHOD_META[method]
                      return (
                        <div key={job.id}
                          className={`flex items-center gap-3 px-4 py-3 ${i < transactions.length - 1 ? 'border-b border-hairline' : ''}`}>
                          <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="plate text-[13px] mb-1">{job.plate}</p>
                            <p className="text-xs text-mute truncate">{job.owner} · {job.car}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-ink">{fmt(amt)}</p>
                            <p className={`text-xs font-semibold ${type === 'paid' ? 'text-badge-success' : 'text-amber-700'}`}>
                              {type === 'paid' ? t('pay_paid') : t('pay_deposit')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-ash text-center leading-relaxed">{t('eod_note')}</p>
            </div>
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-hairline flex-shrink-0">
            <button onClick={() => window.print()}
              className="w-full bg-primary hover:bg-primary-deep text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
              <Printer className="w-4 h-4" /> {t('rc_print')}
            </button>
          </div>
        </div>
      </div>

      {/* Print-only report — outside #root, shown only when printing */}
      <div id="eod-print-portal" style={{ display: 'none' }}>
        <EODPrint workshop={workshop} dateLabel={dateLabel} printedAt={printedAt.toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          methods={activeMethods} transactions={transactions} grandTotal={grandTotal} fmt={fmt} t={t} />
      </div>
    </>,
    document.body
  )
}

// Plain black-on-white layout: browsers skip background colours when printing,
// so nothing here relies on a fill (plates are bold monospace, not white-on-black chips).
function EODPrint({ workshop, dateLabel, printedAt, methods, transactions, grandTotal, fmt, t }) {
  const cell = 'border-b border-stone py-1.5 px-2 text-left align-top'
  const num  = 'border-b border-stone py-1.5 px-2 text-right align-top tabular-nums whitespace-nowrap'
  return (
    <div className="text-ink text-[10.5pt] leading-snug">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-3 mb-4">
        <div>
          <p className="font-display font-bold text-[18pt] leading-tight">{workshop?.name}</p>
          {workshop?.address && <p className="text-charcoal">{workshop.address}</p>}
          {workshop?.phone && <p className="text-charcoal">{workshop.phone}</p>}
        </div>
        <div className="text-right">
          <p className="font-display font-bold text-[15pt] leading-tight">{t('eod_title')}</p>
          <p>{dateLabel}</p>
        </div>
      </header>

      <div className="flex items-baseline justify-between border-2 border-ink rounded px-4 py-3 mb-5">
        <span className="font-semibold">{t('eod_total_collected')} · {transactions.length} {t('eod_transactions')}</span>
        <span className="font-display font-bold text-[18pt] tabular-nums">{fmt(grandTotal)}</span>
      </div>

      {transactions.length === 0 ? (
        <p className="py-6 text-center">{t('eod_no_transactions')}</p>
      ) : (
        <>
          <p className="font-bold mb-1.5">{t('eod_by_method')}</p>
          <table className="w-full border-collapse mb-5">
            <thead>
              <tr>
                <th className={cell}>{t('pay_method')}</th>
                <th className={num}>{t('eod_col_count')}</th>
                <th className={num}>{t('eod_col_amount')}</th>
              </tr>
            </thead>
            <tbody>
              {methods.map(([method, { amt, count }]) => (
                <tr key={method}>
                  <td className={cell}>{t(METHOD_META[method].labelKey)}</td>
                  <td className={num}>{count}</td>
                  <td className={num}>{fmt(amt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="font-bold mb-1.5">{t('eod_breakdown')}</p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${num} text-left`}>#</th>
                <th className={`${cell} whitespace-nowrap`}>{t('form_plate')}</th>
                <th className={cell}>{t('eod_col_customer')}</th>
                <th className={`${cell} whitespace-nowrap`}>{t('pay_method')}</th>
                <th className={`${cell} whitespace-nowrap`}>{t('eod_col_type')}</th>
                <th className={num}>{t('eod_col_amount')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(({ job, method, amt, type }, i) => (
                <tr key={job.id} className="break-inside-avoid">
                  <td className={`${num} text-left`}>{i + 1}</td>
                  <td className={`${cell} font-mono font-bold whitespace-nowrap`}>{job.plate}</td>
                  <td className={cell}>{job.owner}{job.car && <span className="text-charcoal"> · {job.car}</span>}</td>
                  <td className={`${cell} whitespace-nowrap`}>{t(METHOD_META[method].labelKey)}</td>
                  <td className={`${cell} whitespace-nowrap`}>{type === 'paid' ? t('pay_paid') : t('pay_deposit')}</td>
                  <td className={num}>{fmt(amt)}</td>
                </tr>
              ))}
              {/* In tbody, not tfoot: browsers repeat a tfoot on every printed page */}
              <tr className="break-inside-avoid">
                <td colSpan={5} className="pt-2 px-2 text-right font-bold">{t('eod_total_collected')}</td>
                <td className="pt-2 px-2 text-right font-bold tabular-nums whitespace-nowrap">{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <footer className="mt-6 pt-2 border-t border-stone text-[9pt] text-charcoal flex justify-between gap-6">
        <span>{t('eod_note')}</span>
        <span className="whitespace-nowrap">{t('eod_printed_at', { time: printedAt })}</span>
      </footer>
    </div>
  )
}
