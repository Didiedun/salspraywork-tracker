import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Printer, X, Loader, ChevronLeft, FileText } from 'lucide-react'

const fmt = (v) => `RM ${Number(v || 0).toFixed(2)}`

const BLANK = {
  months: 0, gross: 0, epf_employee: 0, epf_employer: 0,
  socso_employee: 0, socso_employer: 0, eis_employee: 0, eis_employer: 0,
  pcb: 0, other_deductions: 0, net: 0,
}

// Year-end EA (annual remuneration statement) generator. Aggregates every
// FINALISED payroll entry for the workshop in the selected year, per employee.
// This is a summary to assist Borang EA preparation — not the official LHDN form.
export function EAFormModal({ workshopId, workshop, year, onClose }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows]       = useState([]) // [{ employee, ...totals }]
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!workshopId) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('workshop_id', workshopId)
        .eq('year', year)
        .eq('status', 'final')
      const runIds = (runs || []).map(r => r.id)
      if (runIds.length === 0) { if (alive) { setRows([]); setLoading(false) } return }

      const { data: entries } = await supabase
        .from('payroll_entries')
        .select('*, employee:employees(*)')
        .in('payroll_run_id', runIds)

      const byEmp = new Map()
      for (const e of entries || []) {
        if (!e.employee) continue
        const agg = byEmp.get(e.employee.id) || { employee: e.employee, ...BLANK }
        agg.months          += 1
        agg.gross           += Number(e.gross_salary)
        agg.epf_employee    += Number(e.epf_employee)
        agg.epf_employer    += Number(e.epf_employer)
        agg.socso_employee  += Number(e.socso_employee)
        agg.socso_employer  += Number(e.socso_employer)
        agg.eis_employee    += Number(e.eis_employee)
        agg.eis_employer    += Number(e.eis_employer)
        agg.pcb             += Number(e.pcb)
        agg.other_deductions+= Number(e.other_deductions)
        agg.net             += Number(e.net_salary)
        byEmp.set(e.employee.id, agg)
      }
      const list = [...byEmp.values()].sort((a, b) => a.employee.name.localeCompare(b.employee.name))
      if (alive) { setRows(list); setLoading(false) }
    })()
    return () => { alive = false }
  }, [workshopId, year])

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline print:hidden">
          <div className="flex items-center gap-2">
            {selected && (
              <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
                <ChevronLeft className="w-4 h-4 text-ash" />
              </button>
            )}
            <h3 className="font-display font-bold text-ink text-sm">Penyata EA {year}</h3>
          </div>
          <div className="flex gap-2">
            {selected && (
              <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-full hover:bg-primary-deep transition-colors">
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
              <X className="w-4 h-4 text-ash" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center"><Loader className="w-5 h-5 animate-spin text-mute mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <FileText className="w-9 h-9 text-ash opacity-30 mx-auto mb-3" />
            <p className="text-charcoal font-semibold text-sm">Tiada gaji dimuktamadkan untuk {year}</p>
            <p className="text-mute text-xs mt-1">Muktamadkan slip gaji bulanan dahulu untuk menjana Penyata EA.</p>
          </div>
        ) : !selected ? (
          <div className="overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-mute px-1">{rows.length} pekerja · pilih untuk lihat & cetak penyata</p>
            {rows.map(r => (
              <button key={r.employee.id} onClick={() => setSelected(r)}
                className="w-full flex items-center gap-3 bg-surface-card border border-hairline rounded-lg px-4 py-3 hover:bg-canvas transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary text-sm">{r.employee.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{r.employee.name}</p>
                  <p className="text-xs text-mute">{r.months} bulan · {fmt(r.gross)} kasar</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-ash rotate-180 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="printable p-6 overflow-y-auto space-y-4 text-sm">
            <div className="text-center border-b border-hairline pb-4">
              {workshop?.logo_url && <img src={workshop.logo_url} alt="logo" className="w-12 h-12 object-cover rounded-lg mx-auto mb-2" />}
              <p className="font-display font-bold text-ink text-base">{workshop?.name}</p>
              {workshop?.address && <p className="text-xs text-mute">{workshop.address}</p>}
              <p className="text-primary font-bold mt-1">PENYATA SARAAN EA</p>
              <p className="text-xs text-charcoal font-semibold mt-0.5">Tahun {year}</p>
            </div>

            <div className="bg-surface-bone rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-mute">Nama</span><span className="font-semibold text-ink">{selected.employee.name}</span></div>
              {selected.employee.position && <div className="flex justify-between"><span className="text-mute">Jawatan</span><span className="font-semibold">{selected.employee.position}</span></div>}
              {selected.employee.ic_number && <div className="flex justify-between"><span className="text-mute">No. IC</span><span className="font-mono">{selected.employee.ic_number}</span></div>}
              {selected.employee.epf_number && <div className="flex justify-between"><span className="text-mute">No. KWSP</span><span className="font-mono">{selected.employee.epf_number}</span></div>}
              {selected.employee.socso_number && <div className="flex justify-between"><span className="text-mute">No. PERKESO</span><span className="font-mono">{selected.employee.socso_number}</span></div>}
              <div className="flex justify-between"><span className="text-mute">Bulan dibayar</span><span className="font-semibold">{selected.months}</span></div>
            </div>

            <div>
              <p className="text-xs font-bold text-charcoal mb-2 uppercase tracking-wide">B. Pendapatan Penggajian Kasar</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold"><span>Jumlah Gaji Kasar Setahun</span><span>{fmt(selected.gross)}</span></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-charcoal mb-2 uppercase tracking-wide">Potongan Pekerja (Setahun)</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>KWSP</span><span className="text-red-600">− {fmt(selected.epf_employee)}</span></div>
                <div className="flex justify-between"><span>PERKESO</span><span className="text-red-600">− {fmt(selected.socso_employee)}</span></div>
                <div className="flex justify-between"><span>EIS/SIP</span><span className="text-red-600">− {fmt(selected.eis_employee)}</span></div>
                <div className="flex justify-between"><span>PCB / Cukai Pendapatan (MTD)</span><span className="text-red-600">− {fmt(selected.pcb)}</span></div>
                {selected.other_deductions > 0 && <div className="flex justify-between"><span>Potongan Lain</span><span className="text-red-600">− {fmt(selected.other_deductions)}</span></div>}
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
              <span className="font-bold text-charcoal">JUMLAH BERSIH SETAHUN</span>
              <span className="font-display font-bold text-primary text-lg">{fmt(selected.net)}</span>
            </div>

            <div>
              <p className="text-xs font-bold text-charcoal mb-2 uppercase tracking-wide">Caruman Majikan (Setahun)</p>
              <div className="space-y-1 text-xs text-mute">
                <div className="flex justify-between"><span>KWSP</span><span>{fmt(selected.epf_employer)}</span></div>
                <div className="flex justify-between"><span>PERKESO</span><span>{fmt(selected.socso_employer)}</span></div>
                <div className="flex justify-between"><span>EIS/SIP</span><span>{fmt(selected.eis_employer)}</span></div>
              </div>
            </div>

            <p className="text-[10px] text-ash text-center border-t border-hairline pt-3">
              Ringkasan untuk membantu penyediaan Borang EA (CP8A). Sahkan dengan akaun rasmi sebelum penyerahan LHDN. {workshop?.name} · {year}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
