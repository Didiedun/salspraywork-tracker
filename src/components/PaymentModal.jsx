import { useState } from 'react'
import { X, Banknote, CreditCard, QrCode, Globe, DollarSign, Copy, Check, ExternalLink } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const METHODS = [
  { key: 'cash',    labelKey: 'pay_cash',    Icon: Banknote  },
  { key: 'card',    labelKey: 'pay_card',    Icon: CreditCard },
  { key: 'duitnow', labelKey: 'pay_duitnow', Icon: QrCode    },
  { key: 'online',  labelKey: 'pay_online',  Icon: Globe     },
]

export function PaymentModal({ job, onSave, onClose }) {
  const { t } = useLang()
  const { workshop } = useApp()
  const total   = Number(job.total_amount) || 0
  const deposit = Number(job.downpayment)  || 0
  const balance = total - deposit

  const [method,       setMethod]       = useState('cash')
  const [amount,       setAmount]       = useState('')
  const [customerPays, setCustomerPays] = useState('')
  const [saving,       setSaving]       = useState(false)

  // Online payment state
  const [creating,    setCreating]    = useState(false)
  const [paymentUrl,  setPaymentUrl]  = useState('')
  const [copyDone,    setCopyDone]    = useState(false)
  const [onlineError, setOnlineError] = useState('')

  const raw       = parseFloat(amount) || 0
  const collected = Math.min(raw, balance + 0.005)
  const customerPaid = parseFloat(customerPays) || 0
  const change       = customerPaid - collected
  const isFullPay    = collected >= balance - 0.005
  const isPartial    = collected > 0 && !isFullPay
  const isOnline     = method === 'online'

  const fmt = (v) => `RM ${Number(v).toFixed(2)}`

  const handleCollect = async () => {
    if (collected <= 0) return
    setSaving(true)
    try {
      const newDeposit = Math.min(deposit + collected, total)
      await onSave(job.id, {
        downpayment:    newDeposit,
        paid:           isFullPay,
        payment_method: method,
      })
      onClose()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleCreateLink = async () => {
    setCreating(true)
    setOnlineError('')
    try {
      const return_url = workshop?.slug
        ? `${window.location.origin}/w/${workshop.slug}?paid=1`
        : window.location.origin
      const { data, error } = await supabase.functions.invoke('create-bill', {
        body: { job_id: job.id, amount: balance, return_url },
      })
      if (error || !data?.payment_url) {
        throw new Error(data?.error || error?.message || t('pay_online_error'))
      }
      setPaymentUrl(data.payment_url)
    } catch (e) {
      setOnlineError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentUrl)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  const whatsappShare = (url) => {
    const phone = job.phone?.replace(/\D/g, '')
    if (!phone) return
    const num = phone.startsWith('60') ? phone : '60' + phone.replace(/^0/, '')
    const linkPart = url || ''
    const msg = `Hi ${job.owner}, sila lakukan pembayaran baki ${fmt(balance)} untuk kenderaan *${job.plate}* melalui pautan berikut:\n\n${linkPart}\n\nTerima kasih, ${job.workshop_name || 'bengkel'}.`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
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
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(({ key, labelKey, Icon }) => (
                <button key={key} type="button"
                  onClick={() => { setMethod(key); setPaymentUrl(''); setOnlineError('') }}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-[10px] font-semibold transition-all ${
                    method === key
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-hairline bg-canvas text-mute hover:border-primary/30 hover:text-charcoal'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Online payment flow */}
          {isOnline ? (
            <div className="space-y-3">
              {!paymentUrl ? (
                <>
                  <p className="text-xs text-mute leading-relaxed">{t('pay_online_info')}</p>
                  {onlineError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                      {onlineError}
                    </div>
                  )}
                  <button
                    onClick={handleCreateLink}
                    disabled={creating}
                    className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 transition-colors text-sm">
                    <Globe className="w-4 h-4" />
                    {creating ? t('pay_online_creating') : t('pay_online_create')}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-emerald-800">{t('pay_online_link_ready')}</p>
                    <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-charcoal break-all font-mono">
                      {paymentUrl}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold rounded-full py-2.5 hover:bg-emerald-50 transition-colors">
                        {copyDone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyDone ? t('pay_online_copied') : t('pay_online_copy')}
                      </button>
                      <a href={paymentUrl} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold rounded-full py-2.5 hover:bg-emerald-50 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t('pay_online_open')}
                      </a>
                    </div>
                  </div>
                  {job.phone && (
                    <button onClick={() => whatsappShare(paymentUrl)}
                      className="w-full flex items-center justify-center gap-2 bg-badge-success text-white text-xs font-semibold rounded-full py-2.5 hover:bg-emerald-600 transition-colors">
                      {t('pay_wa_notify')}
                    </button>
                  )}
                  <p className="text-[10px] text-mute text-center">{t('pay_online_note')}</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Amount to collect */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal">{t('pay_amount')}</p>
                  <button type="button"
                    onClick={() => setAmount(balance.toFixed(2))}
                    className="text-xs text-primary font-semibold bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-colors">
                    {t('pay_quick_full')}: {fmt(balance)}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-mute pointer-events-none">RM</span>
                  <input
                    autoFocus
                    type="text" inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-canvas border border-hairline rounded-full pl-12 pr-4 py-3 text-ink text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                {collected > 0 && (
                  <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-semibold ${isFullPay ? 'bg-badge-success/10 text-badge-success' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {isFullPay
                      ? `✓ ${t('pay_full_balance')} — ${t('job_marked_paid')}`
                      : `${t('pay_partial')} — ${t('pay_balance')} ${fmt(balance - collected)}`}
                  </div>
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
            </>
          )}
        </div>

        {!isOnline && (
          <div className="px-5 pb-5 pt-3 border-t border-hairline flex-shrink-0">
            <button
              onClick={handleCollect}
              disabled={saving || collected <= 0}
              className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 transition-colors text-sm">
              <DollarSign className="w-4 h-4" />
              {saving ? t('saving') : collected <= 0 ? t('pay_enter_amount') : t('pay_record')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
