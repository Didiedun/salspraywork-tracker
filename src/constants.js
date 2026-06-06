export const OVERDUE_DAYS = 7

/* Legacy spray/body shop stages — kept for backward compat with existing job data */
export const SPRAY_STAGES = [
  { value: 'ready',    label: 'Terima',       short: 'Terima'  },
  { value: 'ketuk',    label: 'Ketuk & Tarik', short: 'Ketuk'   },
  { value: 'dempul',   label: 'Dempul',        short: 'Dempul'  },
  { value: 'painting', label: 'Cat Spray',     short: 'Cat'     },
  { value: 'polish',   label: 'Polish',        short: 'Polish'  },
  { value: 'siap',     label: 'Siap',          short: 'Siap'    },
]

/* Generic default for new workshops — owners rename these in Settings */
export const DEFAULT_STAGES = [
  { value: 'terima',  label: 'Terima',       short: 'Terima'  },
  { value: 'step2',   label: 'Langkah 2',    short: 'L2'      },
  { value: 'step3',   label: 'Langkah 3',    short: 'L3'      },
  { value: 'step4',   label: 'Langkah 4',    short: 'L4'      },
  { value: 'step5',   label: 'Semakan',      short: 'Semak'   },
  { value: 'siap',    label: 'Selesai',      short: 'Siap'    },
]

/* Backward compat alias */
export const STAGES      = SPRAY_STAGES
export const STAGE_LABEL = Object.fromEntries(SPRAY_STAGES.map(s => [s.value, s.label]))
export const STAGE_INDEX = Object.fromEntries(SPRAY_STAGES.map((s, i) => [s.value, i]))
export const STAGE_VALUES = SPRAY_STAGES.map(s => s.value)

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

export const STALE_DAYS = 2

export function isStale(job) {
  if (job.archived) return false
  const last = new Date(job.updated_at || job.created_at)
  return Math.floor((Date.now() - last) / 86400000) >= STALE_DAYS
}
