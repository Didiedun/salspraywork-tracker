import { useState, useMemo } from 'react'
import { X, Banknote, CreditCard, QrCode, TrendingUp, Printer, Calendar } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const METHOD_META = {
  cash:    { labelKey: 'pay_cash',    Icon: Banknote,   color: 'text-badge-success' },
  card:    { labelKey: 'pay_card',    Icon: CreditCard, color: 'text-primary'       },
  duitnow: { labelKey: 'pay_duitnow', Icon: QrCode,     color: 'text-amber-600'     },
  other:   { labelKey: 'eod_other',   Icon: TrendingUp, color: 'text-mute'          },
}

export function EODReport({ jobs, workshop, onClose }) {
  const { t } = useLang()
  const todayStr = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(todayStr)

  const { summary, transactions, grandTotal } = useMemo(() => {
    const relevant = jobs.filter(j => {
      const d = (j.updated_at || j.created_at || '').slice(0, 10)
      return d === date && (j.paid || Number(j.downpayment) > 0)
    })

    const s = {
      cash:    { amt: 0, count: 0 },
      card:    { amt: 0, count: 0 },
      duitnow: { amt: 0, count: 0 },
      other:   { amt: 0, count: 0 },
    }
    let total = 0

    const txns = relevant.map(j => {
      const method = ['cash', 'card', 'duitnow'].includes(j.payment_method) ? j.payment_method : 'other'
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

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-hairline flex-shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-ink">{t('eod_title')}</h3>
            {workshop?.name && <span className="text-xs text-mute">· {workshop.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.print()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors text-mute hover:text-ink">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
              <X className="w-4 h-4 text-ash" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Date picker */}
          <div className="px-5 py-3 border-b border-hairline flex items-center gap-2">
            <Calendar className="w-4 h-4 text-mute flex-shrink-0" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              max={todayStr}
              className="flex-1 bg-canvas border border-hairline rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div className="p-5 space-y-5">

            {/* Grand total */}
            <div className="bg-primary rounded-xl p-5 text-white text-center">
              <p className="text-sm opacity-80 mb-1">{t('eod_total_collected')}</p>
              <p className="font-display font-bold text-4xl">{fmt(grandTotal)}</p>
              <p className="text-sm opacity-70 mt-1">{transactions.length} {t('eod_transactions')}</p>
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
                          <p className="text-sm font-bold text-ink font-mono">{job.plate}</p>
                          <p className="text-xs text-mute truncate">{job.owner} · {job.car}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-ink">{fmt(amt)}</p>
                          <p className={`text-xs font-semibold ${type === 'paid' ? 'text-badge-success' : 'text-amber-600'}`}>
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
      </div>
    </div>
  )
}
