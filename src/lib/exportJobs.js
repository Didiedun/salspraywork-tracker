// Every job of a workshop as one CSV file: the owner's own copy of their records, and
// what they need to answer a customer's request for their data.

const HEADERS = {
  ms: ['Tarikh masuk', 'No. plat', 'Kenderaan', 'Pemilik', 'Telefon', 'Emel', 'Peringkat', 'Jumlah (RM)', 'Diskaun (RM)',
    'Deposit (RM)', 'Dibayar', 'Kaedah bayaran', 'Servis', 'Nota', 'Dijangka siap', 'Servis seterusnya', 'Diarkib', 'Dicipta', 'Dikemas kini'],
  en: ['Date in', 'Plate', 'Vehicle', 'Owner', 'Phone', 'Email', 'Stage', 'Total (RM)', 'Discount (RM)',
    'Deposit (RM)', 'Paid', 'Payment method', 'Services', 'Notes', 'Est. completion', 'Next service', 'Archived', 'Created', 'Updated'],
}

// One quoted CSV cell. Text that a spreadsheet would run as a formula (=…, @…, or +/-
// followed by anything other than a number or phone number) gets a leading apostrophe.
export function csvCell(value) {
  if (value === null || value === undefined) return '""'
  let s = String(value)
  if (typeof value === 'string' && (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s().-]*$/.test(s)))) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

const money = (v) => (Number(v) || 0).toFixed(2)

export function servicesText(services) {
  if (!Array.isArray(services)) return ''
  return services
    .filter(s => s && String(s.description || '').trim())
    .map(s => `${String(s.description).trim()}${Number(s.qty) > 1 ? ` × ${Number(s.qty)}` : ''} (RM ${money(s.amount ?? (Number(s.qty) || 1) * (Number(s.unit_price) || 0))})`)
    .join('; ')
}

export function jobsToCsv(jobs, { lang = 'ms', stageLabel = (v) => v } = {}) {
  const [yes, no] = lang === 'en' ? ['Yes', 'No'] : ['Ya', 'Tidak']
  const rows = jobs.map(j => [
    j.date_in, j.plate, j.car, j.owner, j.phone, j.customer_email, j.stage ? stageLabel(j.stage) : '',
    money(j.total_amount), money(j.discount), money(j.downpayment), j.paid ? yes : no, j.payment_method,
    servicesText(j.services), j.notes, j.est_completion, j.next_service_date, j.archived ? yes : no, j.created_at, j.updated_at,
  ])
  return '﻿' + [HEADERS[lang === 'en' ? 'en' : 'ms'], ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
}

// All of a workshop's jobs, archived ones included, a page at a time (the API returns
// at most 1,000 rows per request).
export async function fetchAllJobs(client, workshopId, pageSize = 1000) {
  const all = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from('jobs').select('*').eq('workshop_id', workshopId)
      .order('created_at', { ascending: true }).range(from, from + pageSize - 1)
    if (error) throw error
    all.push(...(data || []))
    if (!data || data.length < pageSize) return all
  }
}
