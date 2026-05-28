export const ADMIN_PASSWORD = 'salspray2025'
export const OVERDUE_DAYS = 7

export const STAGES = [
  { value: 'ready',    label: 'Menunggu', short: 'Ready'  },
  { value: 'ketuk',   label: 'Ketuk',    short: 'Ketuk'  },
  { value: 'dempul',  label: 'Dempul',   short: 'Dempul' },
  { value: 'painting',label: 'Cat',      short: 'Cat'    },
  { value: 'polish',  label: 'Polish',   short: 'Polish' },
  { value: 'siap',    label: 'Siap',     short: 'Siap'   },
]

export const STAGE_LABEL  = Object.fromEntries(STAGES.map(s => [s.value, s.label]))
export const STAGE_INDEX  = Object.fromEntries(STAGES.map((s, i) => [s.value, i]))
export const STAGE_VALUES = STAGES.map(s => s.value)

export function nextStage(current) {
  const i = STAGE_INDEX[current] ?? 0
  return STAGE_VALUES[Math.min(i + 1, STAGE_VALUES.length - 1)]
}
export function prevStage(current) {
  const i = STAGE_INDEX[current] ?? 0
  return STAGE_VALUES[Math.max(i - 1, 0)]
}

export function paymentStatus(job) {
  if (job.paid) return 'paid'
  if (job.downpayment > 0) return 'deposit'
  return 'unpaid'
}

export const PAYMENT_LABEL = { unpaid: 'Belum Bayar', deposit: 'Deposit Diterima', paid: 'Lunas' }
export const PAYMENT_COLOR = { unpaid: '#e22718', deposit: '#f4b400', paid: '#0fa336' }

export function daysIn(job) {
  const from = new Date(job.date_in || job.created_at)
  const now  = new Date()
  return Math.floor((now - from) / 86400000)
}

export function isOverdue(job) {
  return !job.archived && job.stage !== 'siap' && daysIn(job) >= OVERDUE_DAYS
}
