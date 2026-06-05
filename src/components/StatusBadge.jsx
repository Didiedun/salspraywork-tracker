import { paymentStatus, PAYMENT_COLOR } from '../constants'
import { useLang } from '../context/LanguageContext'

export function PaymentBadge({ job }) {
  const { t } = useLang()
  const status = paymentStatus(job)
  const styles = {
    unpaid:  'bg-red-50 text-red-600 border border-red-200',
    deposit: 'bg-amber-50 text-amber-700 border border-amber-200',
    paid:    'bg-emerald-50 text-badge-success border border-emerald-200',
  }
  const labels = {
    unpaid:  t('pay_unpaid'),
    deposit: t('pay_deposit'),
    paid:    t('pay_paid'),
  }
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export function TypeBadge({ type }) {
  const { t } = useLang()
  const isBooking = type === 'booking'
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold border ${
      isBooking
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-canvas text-charcoal border-hairline'
    }`}>
      {isBooking ? t('type_booking') : t('type_walkin')}
    </span>
  )
}
