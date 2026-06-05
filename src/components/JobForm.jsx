import { useState } from 'react'
import { X, Save, Car, User, Phone, FileText, DollarSign, Calendar, Flag } from 'lucide-react'
import { useStages } from '../hooks/useStages'

const EMPTY = {
  plate: '', owner: '', phone: '', car: '', notes: '',
  total_amount: '', downpayment: '', type: 'walk-in',
  stage: 'ready', paid: false, archived: false,
  date_in: '', est_completion: '',
}

export function JobForm({ initial, onSave, onClose, title }) {
  const { stages } = useStages()
  const [form, setForm] = useState(initial ? {
    ...EMPTY, ...initial,
    total_amount:   initial.total_amount   ?? '',
    downpayment:    initial.downpayment    ?? '',
    date_in:        initial.date_in        ? initial.date_in.slice(0, 10)        : '',
    est_completion: initial.est_completion ? initial.est_completion.slice(0, 10) : '',
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set      = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setCheck = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.plate.trim() || !form.owner.trim() || !form.car.trim()) {
      setErr('Sila isi plat, nama & model kenderaan.'); return
    }
    setSaving(true); setErr('')
    try {
      await onSave({
        plate:          form.plate.trim().toUpperCase().replace(/\s+/g, ''),
        owner:          form.owner.trim(),
        phone:          form.phone.trim(),
        car:            form.car.trim(),
        notes:          form.notes.trim(),
        total_amount:   form.total_amount  ? parseFloat(form.total_amount)  : null,
        downpayment:    form.downpayment   ? parseFloat(form.downpayment)   : 0,
        type:           form.type,
        stage:          form.stage,
        paid:           form.paid,
        archived:       form.archived,
        date_in:        form.date_in        || null,
        est_completion: form.est_completion || null,
      })
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const labelCls = 'flex items-center gap-1.5 text-charcoal text-xs font-semibold mb-1.5'

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface-card rounded-lg border border-hairline w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Sticky header */}
        <div className="flex items-center justify-between p-5 border-b border-hairline flex-shrink-0">
          <h2 className="font-display font-bold text-ink text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-canvas transition-colors">
            <X className="w-5 h-5 text-ash" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Type toggle */}
          <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1">
            {[['walk-in', 'Walk-in'], ['booking', 'Booking']].map(([val, label]) => (
              <button key={val} type="button"
                onClick={() => setForm(f => ({ ...f, type: val }))}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                  form.type === val
                    ? 'bg-surface-dark text-on-dark'
                    : 'text-mute hover:text-charcoal'
                }`}>{label}</button>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}><Calendar className="w-3.5 h-3.5" /> Tarikh Masuk</label>
              <input type="date" value={form.date_in} onChange={set('date_in')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><Flag className="w-3.5 h-3.5" /> Dijangka Siap</label>
              <input type="date" value={form.est_completion} onChange={set('est_completion')} className={inputCls} />
            </div>
          </div>

          {[
            { key: 'plate', label: 'No. Plat',       icon: Car,   placeholder: 'cth: WXX 1234',        upper: true },
            { key: 'owner', label: 'Nama Pemilik',    icon: User,  placeholder: 'Nama penuh' },
            { key: 'phone', label: 'No. Telefon',     icon: Phone, placeholder: '01X-XXXXXXX', type: 'tel' },
            { key: 'car',   label: 'Model Kenderaan', icon: Car,   placeholder: 'cth: Perodua Myvi 2022' },
          ].map(({ key, label, icon: Icon, placeholder, upper, type }) => (
            <div key={key}>
              <label className={labelCls}><Icon className="w-3.5 h-3.5" /> {label}</label>
              <input type={type || 'text'} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: upper ? e.target.value.toUpperCase() : e.target.value }))}
                placeholder={placeholder}
                className={inputCls} />
            </div>
          ))}

          <div>
            <label className={labelCls}><FileText className="w-3.5 h-3.5" /> Nota (warna cat, bahagian, dll)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Masukkan nota..."
              className="w-full bg-canvas border border-hairline rounded-md px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}><DollarSign className="w-3.5 h-3.5" /> Jumlah (RM)</label>
              <input type="number" value={form.total_amount} onChange={set('total_amount')} step="0.01" min="0" placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><DollarSign className="w-3.5 h-3.5" /> Deposit (RM)</label>
              <input type="number" value={form.downpayment} onChange={set('downpayment')} step="0.01" min="0" placeholder="0.00" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Peringkat Kerja</label>
            <select value={form.stage} onChange={set('stage')}
              className="w-full bg-canvas border border-hairline rounded-full px-5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm">
              {stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paid} onChange={setCheck('paid')} className="w-4 h-4 accent-badge-success" />
              <span className="text-sm font-medium text-body">Lunas</span>
            </label>
            {initial && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.archived} onChange={setCheck('archived')} className="w-4 h-4 accent-ash" />
                <span className="text-sm font-medium text-body">Arkib</span>
              </label>
            )}
          </div>

          {err && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</p>}
        </div>

        {/* Sticky save button — always visible */}
        <div className="p-4 border-t border-hairline flex-shrink-0 bg-surface-card">
          <button type="submit" disabled={saving}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm border-2 border-primary hover:border-primary-deep disabled:border-stone">
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
