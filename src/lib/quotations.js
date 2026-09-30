// Quotation (sebut harga) rules shared by the page, the printout and the tests.
// Line items use the same shape as jobs.services so an accepted quote becomes a job as-is.

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected']
export const QUOTE_VALID_DAYS = 14

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }

// Calendar date in the user's time zone as YYYY-MM-DD (toISOString() would give the UTC day).
export function localDate(value = Date.now()) {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return localDate(new Date(y, m - 1, d + days))
}

export function lineAmount(item) {
  const qty = num(item.qty) || 1
  return round2(num(item.unit_price) * qty)
}

export function quoteSubtotal(items = []) {
  return round2(items.reduce((sum, item) => sum + lineAmount(item), 0))
}

// Lines without a description are not part of the quotation (see cleanItems).
export function quoteTotal(quote) {
  return Math.max(0, round2(quoteSubtotal(cleanItems(quote.items)) - num(quote.discount)))
}

// Same scheme as the invoice number (INV-YYYYMMDD-XXXX).
export function quoteNumber(quote) {
  const d = new Date(quote.created_at || Date.now())
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `SH-${ymd}-${(quote.id || '').slice(-4).toUpperCase()}`
}

export function isExpired(quote, today = localDate()) {
  return !!quote.valid_until && (quote.status === 'draft' || quote.status === 'sent') && quote.valid_until < today
}

// Drops empty lines and stores each line like a job service line.
export function cleanItems(items = []) {
  return items
    .filter(item => (item.description || '').trim())
    .map(item => {
      const qty = num(item.qty) || 1
      const unit = round2(num(item.unit_price))
      return {
        description:       item.description.trim(),
        qty,
        unit_price:        unit,
        amount:            round2(unit * qty),
        inventory_item_id: item.inventory_item_id || null,
        qty_per_service:   item.qty_per_service || 1,
        category_name:     item.category_name || null,
      }
    })
}

// Plates are stored like the job form stores them: upper case, no spaces.
export const normalisePlate = (plate) => (plate || '').trim().toUpperCase().replace(/\s+/g, '')

// The job an accepted quotation turns into.
export function quoteToJob(quote, { stage, today = localDate(), note = '' } = {}) {
  const services = cleanItems(quote.items).map(item => ({ ...item, stock_deducted: false, qty_deducted: null }))
  return {
    plate:             normalisePlate(quote.plate),
    owner:             (quote.customer_name || '').trim(),
    phone:             (quote.customer_phone || '').trim(),
    customer_email:    null,
    car:               (quote.car || '').trim(),
    notes:             [note, (quote.notes || '').trim()].filter(Boolean).join('\n'),
    total_amount:      quoteSubtotal(services),
    discount:          round2(num(quote.discount)),
    downpayment:       0,
    type:              'booking',
    stage,
    paid:              false,
    archived:          false,
    date_in:           today,
    est_completion:    null,
    next_service_date: null,
    assigned_to:       null,
    services,
  }
}

// Malaysian numbers for wa.me: 012-345 6789 -> 60123456789.
export function waNumber(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return null
  return digits.startsWith('60') ? digits : '60' + digits.replace(/^0/, '')
}

// Non-breaking space so "RM" never ends up on a different line from the amount.
export const formatRM = (v) =>
  `RM\u00a0${(Number(v) || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Plain-text quotation for WhatsApp, written by the workshop to the customer.
// *text* is bold in WhatsApp.
export function whatsappText(quote, { t, workshopName = '', formatDate = (d) => d }) {
  const items = cleanItems(quote.items)
  const vehicle = [normalisePlate(quote.plate), (quote.car || '').trim()].filter(Boolean).join(' · ')
  const name = (quote.customer_name || '').trim()
  const discount = num(quote.discount)
  const notes = (quote.notes || '').trim()
  const lines = [t('qt_wa_intro', { name: name ? ` ${name}` : '', workshop: workshopName, no: quoteNumber(quote) })]
  if (vehicle) lines.push(t('qt_wa_vehicle', { vehicle }))
  lines.push('')
  for (const item of items) {
    lines.push(`• ${item.description}${item.qty > 1 ? ` × ${item.qty}` : ''} — ${formatRM(item.amount)}`)
  }
  lines.push('')
  if (discount > 0) lines.push(t('qt_wa_discount', { amount: formatRM(discount) }))
  lines.push(`*${t('qt_wa_total', { total: formatRM(quoteTotal(quote)) })}*`)
  if (quote.valid_until) lines.push(t('qt_wa_valid', { date: formatDate(quote.valid_until) }))
  if (notes) lines.push('', notes)
  lines.push('', t('qt_wa_reply'))
  return lines.join('\n')
}

export function whatsappLink(quote, text) {
  const number = waNumber(quote.customer_phone)
  // No number: WhatsApp asks which chat to send it to.
  return `https://wa.me/${number || ''}?text=${encodeURIComponent(text)}`
}
