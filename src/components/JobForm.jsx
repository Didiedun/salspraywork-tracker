import { useState } from 'react'
import { X, Save, Car, User, Phone, FileText, DollarSign, Calendar, Flag, Mail, Plus, Trash2 } from 'lucide-react'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import { CatalogPicker } from './CatalogPicker'

function Toggle({ checked, onToggle, label }) {
  return (
    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onToggle(!checked)}>
      <div role="switch" aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${checked ? 'bg-badge-success' : 'bg-stone'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm font-medium text-body">{label}</span>
    </div>
  )
}

const EMPTY = {
  plate: '', owner: '', phone: '', car: '', notes: '',
  customer_email: '',
  total_amount: '', downpayment: '', type: 'walk-in',
  stage: 'ready', paid: false, archived: false,
  date_in: '', est_completion: '',
  services: [],
}

export function JobForm({ initial, onSave, onClose, title }) {
  const { stages } = useStages()
  const { t } = useLang()
  const { workshop } = useApp()
  const [showCatalog, setShowCatalog] = useState(false)
  const [form, setForm] = useState(initial ? {
    ...EMPTY, ...initial,
    total_amount:   initial.total_amount   ?? '',
    downpayment:    initial.downpayment    ?? '',
    customer_email: initial.customer_email ?? '',
    date_in:        initial.date_in        ? initial.date_in.slice(0, 10)        : '',
    est_completion: initial.est_completion ? initial.est_completion.slice(0, 10) : '',
    services: (initial.services || []).map(s => ({
      ...s,
      qty:          s.qty          ?? 1,
      unit_price:   s.unit_price   ?? s.amount ?? '',
      qty_deducted: s.qty_deducted ?? null,
    })),
  } : { ...EMPTY, stage: stages[0]?.value || 'ready' })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const lineTotal = (s) => (parseFloat(s.unit_price) || parseFloat(s.amount) || 0) * (parseFloat(s.qty) || 1)

  const recalcTotal = (services) =>
    services.reduce((sum, s) => sum + lineTotal(s), 0)

  const removeService = (i) =>
    setForm(f => {
      const services = f.services.filter((_, idx) => idx !== i)
      const total = recalcTotal(services)
      return { ...f, services, total_amount: total > 0 ? String(total.toFixed(2)) : f.total_amount }
    })

  const updateService = (i, key, val) =>
    setForm(f => {
      const services = f.services.map((s, idx) => idx === i ? { ...s, [key]: val } : s)
      const total = recalcTotal(services)
      return { ...f, services, total_amount: total > 0 ? String(total.toFixed(2)) : f.total_amount }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.plate.trim() || !form.owner.trim() || !form.car.trim()) {
      setErr(t('form_required')); return
    }
    setSaving(true); setErr('')
    try {
      const cleanServices = form.services.filter(s => s.description.trim())
        .map(s => {
          const up  = parseFloat(s.unit_price) || parseFloat(s.amount) || 0
          const qty = parseFloat(s.qty) || 1
          return {
            description:        s.description.trim(),
            unit_price:         up,
            qty,
            amount:             up * qty,
            inventory_item_id:  s.inventory_item_id  || null,
            qty_per_service:    s.qty_per_service     || 1,
            stock_deducted:     s.stock_deducted      || false,
            qty_deducted:       s.qty_deducted        ?? null,
          }
        })
      await onSave({
        plate:          form.plate.trim().toUpperCase().replace(/\s+/g, ''),
        owner:          form.owner.trim(),
        phone:          form.phone.trim(),
        customer_email: form.customer_email.trim() || null,
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
        services:       cleanServices,
      })
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  /* input class variants */
  const inputCls  = 'w-full bg-canvas border border-hairline rounded-full px-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const dateCls   = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const selectCls = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const labelCls  = 'flex items-center gap-1.5 text-charcoal text-xs font-semibold mb-1.5'

  return (
    <>
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-lg max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-hairline flex-shrink-0">
          <h2 className="font-display font-bold text-ink text-lg">{title || (initial ? t('form_edit_title') : t('form_new_title'))}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-5 h-5 text-ash" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">

            {/* Walk-in / Booking toggle */}
            <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1">
              {[['walk-in', t('form_walkin')], ['booking', t('form_booking')]].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setForm(f => ({ ...f, type: val }))}
                  className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    form.type === val ? 'bg-surface-dark text-on-dark' : 'text-mute hover:text-charcoal'
                  }`}>{label}</button>
              ))}
            </div>

            {/* Dates — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><Calendar className="w-3.5 h-3.5" /> {t('form_date_in')}</label>
                <input type="date" value={form.date_in} onChange={set('date_in')} className={dateCls} />
              </div>
              <div>
                <label className={labelCls}><Flag className="w-3.5 h-3.5" /> {t('form_est')}</label>
                <input type="date" value={form.est_completion} onChange={set('est_completion')} className={dateCls} />
              </div>
            </div>

            {/* Text fields */}
            {[
              { key: 'plate', label: t('form_plate'), icon: Car,   placeholder: t('form_plate_ph'), upper: true },
              { key: 'owner', label: t('form_owner'), icon: User,  placeholder: t('form_owner_ph') },
              { key: 'phone', label: t('form_phone'), icon: Phone, placeholder: t('form_phone_ph'), type: 'tel' },
              { key: 'customer_email', label: t('form_email'), icon: Mail, placeholder: t('form_email_ph'), type: 'email' },
              { key: 'car',   label: t('form_car'),   icon: Car,   placeholder: t('form_car_ph') },
            ].map(({ key, label, icon: Icon, placeholder, upper, type }) => (
              <div key={key}>
                <label className={labelCls}><Icon className="w-3.5 h-3.5" /> {label}</label>
                <input type={type || 'text'} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: upper ? e.target.value.toUpperCase() : e.target.value }))}
                  placeholder={placeholder}
                  className={inputCls} />
              </div>
            ))}

            {/* Notes */}
            <div>
              <label className={labelCls}><FileText className="w-3.5 h-3.5" /> {t('form_notes')}</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder={t('form_notes_ph')}
                className="w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors resize-none" />
            </div>

            {/* Services / line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}><DollarSign className="w-3.5 h-3.5" /> {t('form_services')}</label>
                <button type="button" onClick={() => setShowCatalog(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-deep transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {t('form_add_service')}
                </button>
              </div>
              {form.services.length > 0 && (
                <div className="space-y-2 mb-2">
                  {form.services.map((svc, i) => {
                    const qty   = parseFloat(svc.qty) || 1
                    const up    = parseFloat(svc.unit_price) || parseFloat(svc.amount) || 0
                    const total = qty * up
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={svc.description}
                            onChange={e => updateService(i, 'description', e.target.value)}
                            placeholder={t('form_svc_desc_ph')}
                            className="flex-1 min-w-0 bg-canvas border border-hairline rounded-full px-4 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors"
                          />
                          <div className="flex items-center bg-canvas border border-hairline rounded-full px-2.5 py-2.5 gap-1 flex-shrink-0">
                            <span className="text-xs text-mute select-none">×</span>
                            <input
                              type="text" inputMode="decimal"
                              value={svc.qty ?? 1}
                              onChange={e => updateService(i, 'qty', e.target.value)}
                              className="w-7 text-sm text-ink text-center focus:outline-none bg-transparent"
                            />
                          </div>
                          <input
                            type="text" inputMode="decimal"
                            value={svc.unit_price ?? svc.amount ?? ''}
                            onChange={e => updateService(i, 'unit_price', e.target.value)}
                            placeholder="0.00"
                            className="w-20 bg-canvas border border-hairline rounded-full px-3 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors text-right"
                          />
                          <button type="button" onClick={() => removeService(i)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-mute hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 pl-3">
                          {qty > 1 && (
                            <span className="text-[11px] text-mute">= RM {total.toFixed(2)}</span>
                          )}
                          {svc.inventory_item_id && (
                            <span className="text-[11px] text-badge-success flex items-center gap-0.5">📦 {t('form_svc_linked')}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Money — total auto-fills from services, deposit manual */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><DollarSign className="w-3.5 h-3.5" /> {t('form_total')}</label>
                <input type="text" inputMode="decimal" value={form.total_amount} onChange={set('total_amount')} placeholder="0.00" className={inputCls} />
                {form.services.length > 0 && (
                  <p className="text-ash text-xs mt-1 px-1">{t('form_svc_total_auto')}</p>
                )}
              </div>
              <div>
                <label className={labelCls}><DollarSign className="w-3.5 h-3.5" /> {t('form_deposit')}</label>
                <input type="text" inputMode="decimal" value={form.downpayment} onChange={set('downpayment')} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            {/* Stage select */}
            <div>
              <label className={labelCls}>{t('form_stage')}</label>
              <select value={form.stage} onChange={set('stage')} className={selectCls}>
                {stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* Toggle switches */}
            <div className="flex items-center gap-6 pt-1">
              <Toggle checked={form.paid} onToggle={(val) => setForm(f => ({ ...f, paid: val }))} label={t('form_paid')} />
              {initial && (
                <Toggle checked={form.archived} onToggle={(val) => setForm(f => ({ ...f, archived: val }))} label={t('form_archive')} />
              )}
            </div>

            {err && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</p>}
          </div>

          <div className="p-4 border-t border-hairline flex-shrink-0 bg-surface-card rounded-b-2xl">
            <button type="submit" disabled={saving}
              className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 transition-colors text-sm">
              <Save className="w-4 h-4" />
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showCatalog && (
      <CatalogPicker
        workshopId={workshop?.id}
        onClose={() => setShowCatalog(false)}
        onSelect={(description, unitPrice, stockInfo) => {
          setForm(f => {
            const services = [...f.services, {
              description,
              unit_price: unitPrice,
              qty: 1,
              inventory_item_id: stockInfo?.inventory_item_id || null,
              qty_per_service:   stockInfo?.qty_per_service   || 1,
              stock_deducted: false,
            }]
            const total = recalcTotal(services)
            return { ...f, services, total_amount: String(total.toFixed(2)) }
          })
          setShowCatalog(false)
        }}
      />
    )}
    </>
  )
}
