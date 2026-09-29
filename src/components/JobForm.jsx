import { useDialogFocus } from '../hooks/useDialogFocus'
import { useState, useEffect, useRef } from 'react'
import { X, Save, Plus, Trash2, UserCheck, Package } from 'lucide-react'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import { useNotify } from '../context/NotifyContext'
import { CatalogPicker } from './CatalogPicker'
import { useWorkers } from '../hooks/useWorkers'

function Toggle({ checked, onToggle, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="flex min-h-11 items-center gap-3 text-left select-none" onClick={() => onToggle(!checked)}>
      <span aria-hidden="true"
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${checked ? 'bg-badge-success' : 'bg-stone'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
      <span className="text-sm font-medium text-body">{label}</span>
    </button>
  )
}

const EMPTY = {
  plate: '', owner: '', phone: '', car: '', notes: '',
  customer_email: '',
  total_amount: '', discount: '', downpayment: '', type: 'walk-in',
  stage: 'ready', paid: false, archived: false,
  date_in: '', est_completion: '', next_service_date: '',
  assigned_to: '',
  services: [],
}

export function JobForm({ initial, onSave, onDelete, onClose, title, jobs = [] }) {
  const dialogRef = useDialogFocus(onClose)
  const { confirm } = useNotify()
  const { stages } = useStages()
  const { t } = useLang()
  const { workshop } = useApp()
  const { workers } = useWorkers(workshop?.id)
  const [showCatalog, setShowCatalog] = useState(false)
  const [form, setForm] = useState(initial ? {
    ...EMPTY, ...initial,
    total_amount:      initial.total_amount      ?? '',
    discount:          initial.discount          ?? '',
    downpayment:       initial.downpayment       ?? '',
    customer_email:    initial.customer_email    ?? '',
    date_in:           initial.date_in           ? initial.date_in.slice(0, 10)           : '',
    est_completion:    initial.est_completion    ? initial.est_completion.slice(0, 10)    : '',
    next_service_date: initial.next_service_date ? initial.next_service_date.slice(0, 10) : '',
    assigned_to:       initial.assigned_to       ?? '',
    services: (initial.services || []).map(s => ({
      ...s,
      qty:          s.qty          ?? 1,
      unit_price:   s.unit_price   ?? s.amount ?? '',
      qty_deducted: s.qty_deducted ?? null,
    })),
  } : { ...EMPTY, stage: stages[0]?.value || 'ready' })
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [err, setErr]               = useState('')
  const [returnInfo, setReturnInfo] = useState(null) // { job, by: 'plate'|'phone' }
  const lastFilledPlate             = useRef('')
  const lastFilledPhone             = useRef('')

  useEffect(() => {
    if (initial || !jobs.length) return

    const cleanPlate = form.plate.replace(/\s/g, '').toUpperCase()
    if (cleanPlate.length >= 4) {
      const m = jobs.find(j => j.plate.replace(/\s/g, '').toUpperCase() === cleanPlate)
      if (m) {
        setReturnInfo({ job: m, by: 'plate' })
        if (lastFilledPlate.current !== cleanPlate) {
          lastFilledPlate.current = cleanPlate
          setForm(f => ({
            ...f,
            owner: f.owner || m.owner,
            car:   f.car   || m.car,
            phone: f.phone || m.phone || '',
          }))
        }
        return
      }
    }

    const cleanPhone = form.phone.replace(/\D/g, '')
    if (cleanPhone.length >= 8) {
      const m = jobs.find(j => j.phone && j.phone.replace(/\D/g, '') === cleanPhone)
      if (m) {
        setReturnInfo({ job: m, by: 'phone' })
        if (lastFilledPhone.current !== cleanPhone) {
          lastFilledPhone.current = cleanPhone
          setForm(f => ({
            ...f,
            owner: f.owner || m.owner,
            car:   f.car   || m.car,
          }))
        }
        return
      }
    }

    setReturnInfo(null)
    lastFilledPlate.current = ''
    lastFilledPhone.current = ''
  }, [form.plate, form.phone, jobs, initial])

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
            category_name:      s.category_name       || null,
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
        discount:       form.discount      ? parseFloat(form.discount)      : 0,
        downpayment:    form.downpayment   ? parseFloat(form.downpayment)   : 0,
        type:           form.type,
        stage:          form.stage,
        paid:           form.paid,
        archived:       form.archived,
        date_in:           form.date_in           || null,
        est_completion:    form.est_completion    || null,
        next_service_date: form.next_service_date || null,
        assigned_to:       form.assigned_to       || null,
        services:          cleanServices,
      })
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!(await confirm({ title: t('form_delete_title', { plate: initial.plate }), message: t('form_delete_msg'), confirmLabel: t('delete'), tone: 'danger', icon: Trash2 }))) return
    setDeleting(true); setErr('')
    try {
      await onDelete()
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setDeleting(false) }
  }

  /* input class variants */
  const inputCls  = 'w-full bg-canvas border border-hairline rounded-full px-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const moneyCls  = 'w-full bg-canvas border border-hairline rounded-full pl-11 pr-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const dateCls   = 'w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const selectCls = 'w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const labelCls  = 'block text-charcoal text-xs font-semibold mb-1.5'
  const Req = () => <span className="text-red-700" aria-hidden="true"> *</span>
  const money = (v) => `RM ${v.toFixed(2)}`

  const textField = (key, label, extra = {}) => (
    <div className={extra.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`job-${key}`} className={labelCls}>{label}{extra.required && <Req />}</label>
      <input id={`job-${key}`} type={extra.type || 'text'} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: extra.upper ? e.target.value.toUpperCase() : e.target.value }))}
        placeholder={extra.placeholder} aria-required={extra.required || undefined}
        inputMode={extra.inputMode} autoComplete={extra.autoComplete || 'off'} autoCapitalize={extra.autoCapitalize}
        spellCheck={extra.spellCheck} className={inputCls} />
    </div>
  )
  const moneyField = (key, label, hint) => (
    <div>
      {/* The field already shows the RM prefix, so drop "(RM)" from the label. */}
      <label htmlFor={`job-${key}`} className={labelCls}>{label.replace(/\s*\(RM\)\s*$/, '')}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-mute" aria-hidden="true">RM</span>
        <input id={`job-${key}`} type="text" inputMode="decimal" value={form[key]} onChange={set(key)} placeholder="0.00" className={moneyCls} />
      </div>
      {hint && <p className="text-mute text-xs mt-1 px-1">{hint}</p>}
    </div>
  )

  return (
    <>
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="job-form-title" className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-xl max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
          <div className="min-w-0">
            <h2 id="job-form-title" className="font-display font-bold text-ink text-xl">{title || (initial ? t('form_edit_title') : t('form_new_title'))}</h2>
            <p className="text-xs text-mute mt-0.5">{t('form_required_hint')}</p>
          </div>
          <button type="button" aria-label={t('ui_close')} onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-5 h-5 text-mute" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 divide-y divide-hairline">

            {/* 1 — Vehicle & customer: what the counter asks first */}
            <section aria-labelledby="job-sec-vehicle" className="form-section">
              <h3 id="job-sec-vehicle" className="form-section-title">{t('form_sec_vehicle')}</h3>
              <div className="segmented w-full" role="group" aria-label={t('form_sec_vehicle')}>
                {[['walk-in', t('form_walkin')], ['booking', t('form_booking')]].map(([val, label]) => (
                  <button key={val} type="button" aria-pressed={form.type === val}
                    onClick={() => setForm(f => ({ ...f, type: val }))}
                    className={`segmented-item ${form.type === val ? 'segmented-item-on' : ''}`}>{label}</button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {textField('plate', t('form_plate'), { required: true, upper: true, placeholder: t('form_plate_ph'), autoCapitalize: 'characters', spellCheck: false })}
                {textField('phone', t('form_phone'), { type: 'tel', inputMode: 'tel', placeholder: t('form_phone_ph') })}
                {returnInfo && (
                  <div className="sm:col-span-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3" role="status">
                    <UserCheck className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary">{t('form_returning')}</p>
                      <p className="text-xs text-body truncate">{returnInfo.job.owner} · {returnInfo.job.car}</p>
                    </div>
                    <button type="button" onClick={() => setReturnInfo(null)} aria-label={t('ui_close')} className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:text-ink transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {textField('owner', t('form_owner'), { required: true, placeholder: t('form_owner_ph'), autoCapitalize: 'words' })}
                {textField('car', t('form_car'), { required: true, placeholder: t('form_car_ph'), autoCapitalize: 'words' })}
                {textField('customer_email', t('form_email'), { type: 'email', inputMode: 'email', placeholder: t('form_email_ph'), wide: true })}
              </div>
            </section>

            {/* 2 — Work & price */}
            <section aria-labelledby="job-sec-work" className="form-section">
              <div className="flex items-center justify-between">
                <h3 id="job-sec-work" className="form-section-title">{t('form_sec_work')}</h3>
                <button type="button" onClick={() => setShowCatalog(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {t('form_add_service')}
                </button>
              </div>
              {form.services.length > 0 ? (
                <div className="space-y-2">
                  {form.services.map((svc, i) => {
                    const qty   = parseFloat(svc.qty) || 1
                    const up    = parseFloat(svc.unit_price) || parseFloat(svc.amount) || 0
                    const total = qty * up
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <input type="text" value={svc.description}
                            onChange={e => updateService(i, 'description', e.target.value)}
                            placeholder={t('form_svc_desc_ph')} aria-label={t('form_services')}
                            className="flex-1 min-w-0 bg-canvas border border-hairline rounded-full px-4 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
                          <div className="flex items-center bg-canvas border border-hairline rounded-full px-2.5 py-2.5 gap-1 flex-shrink-0">
                            <span className="text-xs text-mute select-none" aria-hidden="true">×</span>
                            <input type="text" inputMode="decimal" value={svc.qty ?? 1} aria-label={t('form_qty')}
                              onChange={e => updateService(i, 'qty', e.target.value)}
                              className="w-7 text-sm text-ink text-center focus:outline-none bg-transparent" />
                          </div>
                          <input type="text" inputMode="decimal" value={svc.unit_price ?? svc.amount ?? ''} aria-label={t('form_unit_price')}
                            onChange={e => updateService(i, 'unit_price', e.target.value)} placeholder="0.00"
                            className="w-20 bg-canvas border border-hairline rounded-full px-3 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors text-right" />
                          <button type="button" onClick={() => removeService(i)} aria-label={t('delete')}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-mute hover:text-red-700 hover:bg-red-50 transition-colors flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 pl-3">
                          {qty > 1 && <span className="text-[11px] text-mute">= RM {total.toFixed(2)}</span>}
                          {svc.inventory_item_id && (
                            <span className="text-[11px] text-badge-success flex items-center gap-1"><Package className="w-3 h-3" /> {t('form_svc_linked')}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <button type="button" onClick={() => setShowCatalog(true)}
                  className="w-full rounded-xl border border-dashed border-hairline px-4 py-3 text-left text-sm text-mute hover:border-primary hover:text-primary transition-colors">
                  {t('form_services_empty')}
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {moneyField('total_amount', t('form_total'), form.services.length > 0 ? t('form_svc_total_auto') : null)}
                {moneyField('discount', t('form_discount'))}
                {moneyField('downpayment', t('form_deposit'))}
              </div>

              {(() => {
                const total = parseFloat(form.total_amount) || 0
                const disc  = parseFloat(form.discount) || 0
                const dep   = parseFloat(form.downpayment) || 0
                if (total <= 0 && disc <= 0) return null
                const net = total - disc
                const bal = net - dep
                return (
                  <div className="bg-surface-bone border border-hairline rounded-xl px-4 py-3 space-y-1 text-xs">
                    {disc > 0 && (
                      <>
                        <div className="flex justify-between"><span className="text-mute">{t('rc_subtotal')}</span><span>{money(total)}</span></div>
                        <div className="flex justify-between"><span className="text-mute">{t('rc_discount')}</span><span className="text-badge-success">− {money(disc)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between font-semibold"><span className="text-charcoal">{t('form_total')}</span><span>{money(net)}</span></div>
                    {dep > 0 && <div className="flex justify-between"><span className="text-mute">{t('form_deposit')}</span><span className="text-badge-success">− {money(dep)}</span></div>}
                    <div className="flex justify-between font-bold border-t border-hairline pt-1.5 mt-1 text-sm">
                      <span className="text-charcoal">{bal < -0.005 ? t('rc_overpaid') : t('rc_balance')}</span>
                      <span className={bal < -0.005 ? 'text-badge-success' : 'text-primary'}>{money(bal < -0.005 ? -bal : Math.max(bal, 0))}</span>
                    </div>
                  </div>
                )
              })()}

              <Toggle checked={form.paid} onToggle={(val) => setForm(f => ({ ...f, paid: val }))} label={t('form_paid')} />
            </section>

            {/* 3 — Schedule & stage */}
            <section aria-labelledby="job-sec-schedule" className="form-section">
              <h3 id="job-sec-schedule" className="form-section-title">{t('form_sec_schedule')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="job-date_in" className={labelCls}>{t('form_date_in')}</label>
                  <input id="job-date_in" type="date" value={form.date_in} onChange={set('date_in')} className={dateCls} />
                </div>
                <div>
                  <label htmlFor="job-est" className={labelCls}>{t('form_est')}</label>
                  <input id="job-est" type="date" value={form.est_completion} onChange={set('est_completion')} className={dateCls} />
                </div>
              </div>
              {!initial && !form.date_in && <p className="-mt-2 text-xs text-mute px-1">{t('form_date_in_hint')}</p>}
              <div className={`grid gap-3 ${workers.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                <div>
                  <label htmlFor="job-stage" className={labelCls}>{t('form_stage')}</label>
                  <select id="job-stage" value={form.stage} onChange={set('stage')} className={selectCls}>
                    {stages.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {workers.length > 0 && (
                  <div>
                    <label htmlFor="job-assign" className={labelCls}>{t('form_assign')}</label>
                    <select id="job-assign" value={form.assigned_to || ''} onChange={set('assigned_to')} className={selectCls}>
                      <option value="">{t('form_assign_none')}</option>
                      {workers.map(w => {
                        const name = w.name || w.email?.split('@')[0] || '?'
                        return <option key={w.id} value={name}>{name}</option>
                      })}
                    </select>
                  </div>
                )}
              </div>
            </section>

            {/* 4 — Notes and follow-up */}
            <section aria-labelledby="job-sec-more" className="form-section">
              <h3 id="job-sec-more" className="form-section-title">{t('form_sec_more')}</h3>
              <div>
                <label htmlFor="job-notes" className={labelCls}>{t('form_notes')}</label>
                <textarea id="job-notes" value={form.notes} onChange={set('notes')} rows={3} placeholder={t('form_notes_ph')}
                  className="w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors resize-none" />
              </div>
              <div>
                <label htmlFor="job-next" className={labelCls}>{t('form_next_service')}</label>
                <input id="job-next" type="date" value={form.next_service_date || ''} onChange={set('next_service_date')} className={dateCls} />
                <p className="text-xs text-mute mt-1 px-1">{t('form_next_svc_hint')}</p>
              </div>
              {initial && (
                <Toggle checked={form.archived} onToggle={(val) => setForm(f => ({ ...f, archived: val }))} label={t('form_archive')} />
              )}
            </section>

            {initial && onDelete && (
              <section className="form-section">
                <button type="button" onClick={handleDelete} disabled={deleting || saving}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> {deleting ? t('saving') : t('form_delete')}
                </button>
              </section>
            )}
          </div>

          <div className="p-4 border-t border-hairline flex-shrink-0 bg-surface-card rounded-b-2xl">
            {err && <p role="alert" className="mb-3 text-red-700 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</p>}
            <button type="submit" disabled={saving || deleting}
              className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full min-h-12 flex items-center justify-center gap-2 transition-colors text-sm">
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
              category_name:     stockInfo?.category_name     || null,
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
