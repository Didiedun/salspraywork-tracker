import { useState } from 'react'
import { X, Banknote, CreditCard, QrCode, DollarSign } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const METHODS = [
  { key: 'cash',    labelKey: 'pay_cash',    Icon: Banknote },
  { key: 'card',    labelKey: 'pay_card',    Icon: CreditCard },
  { key: 'duitnow', labelKey: 'pay_duitnow', Icon: QrCode },
]

export function PaymentModal({ job, onSave, onClose }) {
  const { t } = useLang()
  const total   = Number(job.total_amount) || 0
  const deposit = Number(job.downpayment)  || 0
  const balance = total - deposit

  const [method,       setMethod]       = useState('cash')
  const [amount,       setAmount]       = useState(balance > 0 ? balance.toFixed(2) : '')
  const [customerPays, setCustomerPays] = useState('')
  const [saving,       setSaving]       = useState(false)

  const collected    = parseFloat(amount)       || 0
  const customerPaid = parseFloat(customerPays) || 0
  const change       = customerPaid - collected
  const isFullPay    = collected >= balance - 0.005   // 0.5 sen tolerance

  const fmt = (v) => `RM ${Number(v).toFixed(2)}`

  const handleCollect = async () => {
    if (collected <= 0) return
    setSaving(true)
    try {
      const newDeposit = deposit + collected
      await onSave(job.id, {
        downpayment:    newDeposit,
        paid:           isFullPay,
        payment_method: method,
      })
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm flex flex-col">

        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-hairline flex-shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-ink">{t('pay_collect')}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">

          {/* Bill summary */}
          <div className="bg-surface-bone rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-charcoal">{job.plate} — {job.owner}</p>
            <div className="flex justify-between text-sm">
              <span className="text-mute">{t('rc_total')}</span>
              <span className="font-medium">{fmt(total)}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-mute">{t('pay_deposit_paid')}</span>
                <span className="text-badge-success font-medium">− {fmt(deposit)}</span>
              </div>
            )}
            <div className="border-t border-hairline pt-2 flex justify-between items-baseline">
              <span className="font-bold text-sm text-charcoal">{t('pay_balance')}</span>
              <span className="font-bold text-primary text-xl">{fmt(balance)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-charcoal mb-2">{t('pay_method')}</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ key, labelKey, Icon }) => (
                <button key={key} type="button"
                  onClick={() => setMethod(key)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    method === key
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-hairline bg-canvas text-mute hover:border-primary/30 hover:text-charcoal'
                  }`}>
                  <Icon className="w-5 h-5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount to collect */}
          <div>
            <p className="text-xs font-semibold text-charcoal mb-2">{t('pay_amount')}</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-mute pointer-events-none">RM</span>
              <input
                type="text" inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-full pl-12 pr-4 py-3 text-ink text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            {collected > 0 && (
              isFullPay
                ? <p className="text-xs text-badge-success mt-1.5 px-1 font-semibold">✓ {t('pay_full_balance')}</p>
                : <p className="text-xs text-amber-600 mt-1.5 px-1">{t('pay_partial')} — {t('pay_balance')} {fmt(balance - collected)}</p>
            )}
          </div>

          {/* Change calculator — cash only */}
          {method === 'cash' && (
            <div>
              <p className="text-xs font-semibold text-charcoal mb-2">{t('pay_customer_pays')}</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-mute pointer-events-none">RM</span>
                <input
                  type="text" inputMode="decimal"
                  value={customerPays}
                  onChange={e => setCustomerPays(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-canvas border border-hairline rounded-full pl-12 pr-4 py-3 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              {customerPaid > 0 && (
                <div className={`mt-2 px-4 py-2.5 rounded-xl text-sm font-bold text-center ${
                  change >= 0 ? 'bg-badge-success/10 text-badge-success' : 'bg-red-50 text-red-600'
                }`}>
                  {change >= 0
                    ? `${t('pay_change')}: RM ${change.toFixed(2)}`
                    : `⚠ ${t('pay_short')} RM ${Math.abs(change).toFixed(2)}`}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-hairline flex-shrink-0">
          <button
            onClick={handleCollect}
            disabled={saving || collected <= 0}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 transition-colors text-sm">
            <DollarSign className="w-4 h-4" />
            {saving ? t('saving') : t('pay_record')}
          </button>
        </div>
      </div>
    </div>
  )
}
