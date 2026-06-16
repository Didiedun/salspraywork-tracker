import { Printer, X } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

const fmt = (v) => `RM ${Number(v || 0).toFixed(2)}`
const MONTH_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']
const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Shared payslip — used by the owner (PayrollPage) and by workers (WorkerView).
export function PayslipModal({ entry, run, workshop, onClose }) {
  const { lang } = useLang()
  const months = lang === 'ms' ? MONTH_MS : MONTH_EN
  const emp = entry.employee
  const period = `${months[run.month - 1]} ${run.year}`
  const totalEmpDed = Number(entry.epf_employee) + Number(entry.socso_employee) + Number(entry.eis_employee) + Number(entry.pcb) + Number(entry.other_deductions)
  const totalErContr = Number(entry.epf_employer) + Number(entry.socso_employer) + Number(entry.eis_employer)

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
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

        <div className="printable p-6 overflow-y-auto space-y-4 text-sm">
          {/* Header */}
          <div className="text-center border-b border-hairline pb-4">
            {workshop?.logo_url && (
              <img src={workshop.logo_url} alt="logo" className="w-12 h-12 object-cover rounded-lg mx-auto mb-2" />
            )}
            <p className="font-display font-bold text-ink text-base">{workshop?.name}</p>
            {workshop?.address && <p className="text-xs text-mute">{workshop.address}</p>}
            <p className="text-primary font-bold mt-1">SLIP GAJI / PAYSLIP</p>
            <p className="text-xs text-charcoal font-semibold mt-0.5">{period}</p>
          </div>

          {/* Employee info */}
          <div className="bg-surface-bone rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-mute">Nama</span><span className="font-semibold text-ink">{emp.name}</span></div>
            {emp.position && <div className="flex justify-between"><span className="text-mute">Jawatan</span><span className="font-semibold">{emp.position}</span></div>}
            {emp.ic_number && <div className="flex justify-between"><span className="text-mute">No. IC</span><span className="font-mono">{emp.ic_number}</span></div>}
            {emp.epf_number && <div className="flex justify-between"><span className="text-mute">No. KWSP</span><span className="font-mono">{emp.epf_number}</span></div>}
            {emp.socso_number && <div className="flex justify-between"><span className="text-mute">No. PERKESO</span><span className="font-mono">{emp.socso_number}</span></div>}
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-bold text-charcoal mb-2 uppercase tracking-wide">Pendapatan</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span>Gaji Asas</span><span>{fmt(entry.basic_salary)}</span></div>
              {Number(entry.allowances) > 0 && <div className="flex justify-between"><span>Elaun</span><span>{fmt(entry.allowances)}</span></div>}
              <div className="flex justify-between font-bold border-t border-hairline pt-1 mt-1">
                <span>Jumlah Kasar</span><span>{fmt(entry.gross_salary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-bold text-charcoal mb-2 uppercase tracking-wide">Potongan Pekerja</p>
            <div className="space-y-1 text-xs">
              {Number(entry.epf_employee) > 0    && <div className="flex justify-between"><span>KWSP (11%)</span><span className="text-red-600">− {fmt(entry.epf_employee)}</span></div>}
              {Number(entry.socso_employee) > 0  && <div className="flex justify-between"><span>PERKESO (0.5%)</span><span className="text-red-600">− {fmt(entry.socso_employee)}</span></div>}
              {Number(entry.eis_employee) > 0    && <div className="flex justify-between"><span>EIS/SIP (0.2%)</span><span className="text-red-600">− {fmt(entry.eis_employee)}</span></div>}
              {Number(entry.pcb) > 0             && <div className="flex justify-between"><span>PCB/Cukai Pendapatan</span><span className="text-red-600">− {fmt(entry.pcb)}</span></div>}
              {Number(entry.other_deductions) > 0 && <div className="flex justify-between"><span>Potongan Lain</span><span className="text-red-600">− {fmt(entry.other_deductions)}</span></div>}
              <div className="flex justify-between font-bold border-t border-hairline pt-1 mt-1">
                <span>Jumlah Potongan</span><span className="text-red-600">− {fmt(totalEmpDed)}</span>
              </div>
            </div>
          </div>

          {/* Net */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-charcoal">GAJI BERSIH</span>
            <span className="font-display font-bold text-primary text-xl">{fmt(entry.net_salary)}</span>
          </div>

          {/* Employer contributions */}
          <div>
            <p className="text-xs font-bold text-charcoal mb-2 uppercase tracking-wide">Caruman Majikan (Maklumat)</p>
            <div className="space-y-1 text-xs">
              {Number(entry.epf_employer) > 0    && <div className="flex justify-between text-mute"><span>KWSP (13%/12%)</span><span>{fmt(entry.epf_employer)}</span></div>}
              {Number(entry.socso_employer) > 0  && <div className="flex justify-between text-mute"><span>PERKESO (1.75%)</span><span>{fmt(entry.socso_employer)}</span></div>}
              {Number(entry.eis_employer) > 0    && <div className="flex justify-between text-mute"><span>EIS/SIP (0.2%)</span><span>{fmt(entry.eis_employer)}</span></div>}
              <div className="flex justify-between text-mute font-semibold border-t border-hairline pt-1 mt-1">
                <span>Jumlah Caruman Majikan</span><span>{fmt(totalErContr)}</span>
              </div>
            </div>
          </div>

          {emp.bank_name && emp.bank_account && (
            <div className="bg-surface-bone rounded-lg p-3 text-xs">
              <p className="text-mute">Dibayar ke: <span className="font-semibold text-ink">{emp.bank_name} — {emp.bank_account}</span></p>
            </div>
          )}

          <p className="text-[10px] text-ash text-center border-t border-hairline pt-3">
            Dokumen ini dijana secara automatik oleh Digital Depot. {workshop?.name} · {period}
          </p>
        </div>
      </div>
    </div>
  )
}
