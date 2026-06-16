import { useState } from 'react'
import { X, Undo2, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

const METHODS = [
  ['cash', 'Tunai'], ['card', 'Kad'], ['duitnow', 'DuitNow'], ['online', 'Online'],
]

// Issue a refund for an overpaid job: log it in `refunds` and reduce the job's
// recorded amount paid so the overpayment resolves. Not a P&L expense.
export function RefundModal({ job, onSave, onClose }) {
  const total    = Number(job.total_amount) || 0
  const discount = Number(job.discount) || 0
  const net      = total - discount
  const deposit  = Number(job.downpayment) || 0
  const overpaid = Math.max(deposit - net, 0)

  const [amount, setAmount] = useState(overpaid > 0 ? overpaid.toFixed(2) : '')
  const [method, setMethod] = useState('cash')
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const fmt = (v) => `RM ${Number(v).toFixed(2)}`
  const amt = parseFloat(amount) || 0

  const handleRefund = async () => {
    if (amt <= 0) { setError('Masukkan jumlah bayar balik.'); return }
    if (amt > deposit + 0.005) { setError('Jumlah melebihi bayaran yang diterima.'); return }
    setSaving(true); setError('')
    try {
      const { error: insErr } = await supabase.from('refunds').insert({
        workshop_id: job.workshop_id,
        job_id: job.id,
        amount: amt,
        method,
        notes: notes.trim() || null,
      })
      if (insErr) throw insErr
      // Correct the recorded amount paid so the overpayment clears.
      await onSave(job.id, { downpayment: Math.max(deposit - amt, 0) })
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-4 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm'

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Undo2 className="w-4 h-4 text-amber-600" />
            <h3 className="font-display font-bold text-ink">Bayar Balik / Refund</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="bg-surface-bone rounded-xl p-4 space-y-1.5 text-sm">
            <p className="text-xs font-bold text-charcoal">{job.plate} — {job.owner}</p>
            <div className="flex justify-between"><span className="text-mute">Jumlah perlu dibayar</span><span className="font-medium">{fmt(net)}</span></div>
            <div className="flex justify-between"><span className="text-mute">Telah dibayar</span><span className="font-medium">{fmt(deposit)}</span></div>
            <div className="flex justify-between border-t border-hairline pt-1.5 font-bold">
              <span className="text-charcoal">Bayaran berlebih</span>
              <span className="text-amber-600">{fmt(overpaid)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">Jumlah Bayar Balik (RM)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mute pointer-events-none font-medium">RM</span>
              <input autoFocus type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" className={inputCls + ' pl-12 font-bold'} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">Cara Bayaran Balik</label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setMethod(key)}
                  className={`py-2 rounded-xl border-2 text-[11px] font-semibold transition-all ${
                    method === key ? 'border-primary bg-primary/5 text-primary' : 'border-hairline bg-canvas text-mute hover:text-charcoal'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">Nota (pilihan)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="cth: diskaun selepas bayaran" className={inputCls} />
          </div>

          {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-hairline">
          <button onClick={handleRefund} disabled={saving || amt <= 0}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
            {saving ? 'Menyimpan…' : `Rekod Bayar Balik ${amt > 0 ? fmt(amt) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
