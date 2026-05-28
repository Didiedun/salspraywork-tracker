import { paymentStatus, PAYMENT_LABEL } from '../constants'

export function PaymentBadge({ job }) {
  const status = paymentStatus(job)
  const styles = {
    unpaid:  'bg-red-50 text-red-600 border border-red-200',
    deposit: 'bg-amber-50 text-amber-700 border border-amber-200',
    paid:    'bg-emerald-50 text-badge-success border border-emerald-200',
  }
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {PAYMENT_LABEL[status]}
    </span>
  )
}

export function TypeBadge({ type }) {
  const isBooking = type === 'booking'
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold border ${
      isBooking
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-canvas text-charcoal border-hairline'
    }`}>
      {isBooking ? 'Booking' : 'Walk-in'}
    </span>
  )
}
