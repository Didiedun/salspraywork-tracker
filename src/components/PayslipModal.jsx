import { Printer, X } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const fmt = (v) => `RM ${Number(v || 0).toFixed(2)}`
const MONTH_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']
const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Amount in words (Malay) ──────────────────────────────────────────────────
const ONES = ['', 'satu','dua','tiga','empat','lima','enam','tujuh','lapan','sembilan']
function threeDigits(n) {
  const out = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h > 0) out.push(h === 1 ? 'seratus' : `${ONES[h]} ratus`)
  if (r > 0) {
    if (r < 10) out.push(ONES[r])
    else if (r === 10) out.push('sepuluh')
    else if (r === 11) out.push('sebelas')
    else if (r < 20) out.push(`${ONES[r - 10]} belas`)
    else {
      const t = Math.floor(r / 10), u = r % 10
      out.push(`${ONES[t]} puluh${u > 0 ? ` ${ONES[u]}` : ''}`)
    }
  }
  return out.join(' ')
}
function numWords(n) {
  if (n === 0) return 'kosong'
  const juta = Math.floor(n / 1000000)
  const ribu = Math.floor((n % 1000000) / 1000)
  const baki = n % 1000
  const parts = []
  if (juta > 0) parts.push(juta === 1 ? 'sejuta' : `${threeDigits(juta)} juta`)
  if (ribu > 0) parts.push(ribu === 1 ? 'seribu' : `${threeDigits(ribu)} ribu`)
  if (baki > 0) parts.push(threeDigits(baki))
  return parts.join(' ')
}
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())
function ringgitInWords(amount) {
  const ringgit = Math.floor(Number(amount) || 0)
  const sen = Math.round(((Number(amount) || 0) - ringgit) * 100)
  let s = `Ringgit ${titleCase(numWords(ringgit))}`
  if (sen > 0) s += ` dan ${titleCase(numWords(sen))} Sen`
  return `${s} Sahaja`
}

// Shared payslip — used by the owner (PayrollPage) and by workers (WorkerView).
export function PayslipModal({ entry, run, workshop, onClose }) {
  const { lang } = useLang()
  const months = lang === 'ms' ? MONTH_MS : MONTH_EN
  const emp = entry.employee
  const period = `${months[run.month - 1]} ${run.year}`

  const earnings = [
    { label: 'Gaji Asas / Basic Pay', amount: Number(entry.basic_salary) },
    ...(Number(entry.allowances) > 0 ? [{ label: 'Elaun / Allowance', amount: Number(entry.allowances) }] : []),
  ]
  const deductions = [
    ...(Number(entry.epf_employee)    > 0 ? [{ label: 'KWSP / EPF',            amount: Number(entry.epf_employee) }]    : []),
    ...(Number(entry.socso_employee)  > 0 ? [{ label: 'PERKESO / SOCSO',       amount: Number(entry.socso_employee) }]  : []),
    ...(Number(entry.eis_employee)    > 0 ? [{ label: 'EIS / SIP',             amount: Number(entry.eis_employee) }]    : []),
    ...(Number(entry.pcb)             > 0 ? [{ label: 'PCB / Cukai',           amount: Number(entry.pcb) }]             : []),
    ...(Number(entry.other_deductions)> 0 ? [{ label: 'Potongan Lain / Other', amount: Number(entry.other_deductions) }]: []),
  ]
  const totalEarnings   = Number(entry.gross_salary)
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  const totalErContr    = Number(entry.epf_employer) + Number(entry.socso_employer) + Number(entry.eis_employer)

  const Row = ({ label, amount, strong }) => (
    <div className={`flex justify-between gap-3 py-1 ${strong ? 'font-bold border-t border-hairline mt-1 pt-1.5' : ''}`}>
      <span className={strong ? 'text-charcoal' : 'text-mute'}>{label}</span>
      <span className="tabular-nums">{fmt(amount)}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline print:hidden">
          <h3 className="font-display font-bold text-ink text-sm">Slip Gaji — {period}</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-full hover:bg-primary-deep transition-colors">
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
              <X className="w-4 h-4 text-ash" />
            </button>
          </div>
        </div>

        <div className="printable p-6 overflow-y-auto text-sm">
          {/* Company header */}
          <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-4">
            <div className="flex items-center gap-3">
              {workshop?.logo_url && (
                <img src={workshop.logo_url} alt="logo" className="w-12 h-12 object-cover rounded-lg" />
              )}
              <div>
                <p className="font-display font-bold text-ink text-lg leading-tight">{workshop?.name}</p>
                {workshop?.address && <p className="text-xs text-mute mt-0.5 max-w-[240px]">{workshop.address}</p>}
                {workshop?.phone && <p className="text-xs text-mute">{workshop.phone}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-ink text-xl tracking-tight">SLIP GAJI</p>
              <p className="text-xs text-mute uppercase tracking-widest">Payslip</p>
            </div>
          </div>

          {/* Meta — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs mb-5">
            <div className="space-y-1">
              {emp.start_date && <div className="flex justify-between gap-3"><span className="text-mute">Tarikh Mula Kerja</span><span className="font-semibold text-ink">{emp.start_date}</span></div>}
              <div className="flex justify-between gap-3"><span className="text-mute">Tempoh Gaji</span><span className="font-semibold text-ink">{period}</span></div>
              {emp.employment_type && <div className="flex justify-between gap-3"><span className="text-mute">Jenis</span><span className="font-semibold text-ink">{emp.employment_type === 'part_time' ? 'Separuh Masa' : 'Sepenuh Masa'}</span></div>}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between gap-3"><span className="text-mute">Nama Pekerja</span><span className="font-semibold text-ink">{emp.name}</span></div>
              {emp.position && <div className="flex justify-between gap-3"><span className="text-mute">Jawatan</span><span className="font-semibold text-ink">{emp.position}</span></div>}
              {emp.ic_number && <div className="flex justify-between gap-3"><span className="text-mute">No. IC</span><span className="font-mono">{emp.ic_number}</span></div>}
              {emp.epf_number && <div className="flex justify-between gap-3"><span className="text-mute">No. KWSP</span><span className="font-mono">{emp.epf_number}</span></div>}
              {emp.socso_number && <div className="flex justify-between gap-3"><span className="text-mute">No. PERKESO</span><span className="font-mono">{emp.socso_number}</span></div>}
            </div>
          </div>

          {/* Earnings + Deductions — two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div>
              <div className="flex justify-between bg-surface-bone px-2 py-1.5 rounded font-bold text-charcoal uppercase tracking-wide text-[11px]">
                <span>Pendapatan / Earnings</span><span>Amaun</span>
              </div>
              <div className="px-2">
                {earnings.map((e, i) => <Row key={i} label={e.label} amount={e.amount} />)}
                <Row label="Jumlah Pendapatan" amount={totalEarnings} strong />
              </div>
            </div>
            <div>
              <div className="flex justify-between bg-surface-bone px-2 py-1.5 rounded font-bold text-charcoal uppercase tracking-wide text-[11px]">
                <span>Potongan / Deductions</span><span>Amaun</span>
              </div>
              <div className="px-2">
                {deductions.length > 0
                  ? deductions.map((d, i) => <Row key={i} label={d.label} amount={d.amount} />)
                  : <div className="py-1 text-mute">—</div>}
                <Row label="Jumlah Potongan" amount={totalDeductions} strong />
              </div>
            </div>
          </div>

          {/* Net pay */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mt-5 flex justify-between items-center">
            <span className="font-bold text-charcoal">GAJI BERSIH / NET PAY</span>
            <span className="font-display font-bold text-primary text-2xl tabular-nums">{fmt(entry.net_salary)}</span>
          </div>
          <p className="text-xs text-mute italic mt-1.5 px-1">{ringgitInWords(entry.net_salary)}</p>

          {/* Employer contributions (info) */}
          {totalErContr > 0 && (
            <div className="mt-4 text-[11px] text-mute border-t border-hairline pt-3">
              <span className="font-semibold">Caruman Majikan / Employer Contributions: </span>
              KWSP {fmt(entry.epf_employer)} · PERKESO {fmt(entry.socso_employer)} · EIS {fmt(entry.eis_employer)}
              <span className="font-semibold"> · Jumlah {fmt(totalErContr)}</span>
            </div>
          )}

          {emp.bank_name && emp.bank_account && (
            <p className="text-[11px] text-mute mt-2">Dibayar ke / Paid to: <span className="font-semibold text-ink">{emp.bank_name} — {emp.bank_account}</span></p>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-10">
            {['Tandatangan Majikan / Employer', 'Tandatangan Pekerja / Employee'].map((s) => (
              <div key={s} className="text-center">
                <div className="border-t border-ink/40 mb-1" />
                <span className="text-[11px] text-mute">{s}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-ash text-center border-t border-hairline pt-3 mt-6">
            Slip gaji ini dijana oleh sistem · This is a system generated payslip · {workshop?.name} · {period}
          </p>
        </div>
      </div>
    </div>
  )
}
