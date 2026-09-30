import { useState } from 'react'
import { X, Save, Plus, Trash2, UserCheck } from 'lucide-react'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useLang } from '../context/LanguageContext'
import { useApp } from '../context/AppContext'
import { useNotify } from '../context/NotifyContext'
import { CatalogPicker } from './CatalogPicker'
import {
  QUOTE_VALID_DAYS, addDays, localDate, cleanItems, lineAmount, quoteSubtotal, quoteNumber, normalisePlate, formatRM,
} from '../lib/quotations'

const digits = (s) => (s || '').replace(/\D/g, '')

export function QuotationForm({ initial, lastNotes = '', jobs = [], onSave, onDelete, onClose }) {
  const dialogRef = useDialogFocus(onClose)
  const { t } = useLang()
  const { workshop } = useApp()
  const { confirm } = useNotify()
  const [showCatalog, setShowCatalog] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr]           = useState('')
  const [form, setForm] = useState(() => initial ? {
    customer_name:  initial.customer_name  || '',
    customer_phone: initial.customer_phone || '',
    plate:          initial.plate          || '',
    car:            initial.car            || '',
    items:          (initial.items || []).map(item => ({ ...item, qty: item.qty ?? 1, unit_price: item.unit_price ?? item.amount ?? '' })),
    discount:       Number(initial.discount) > 0 ? String(initial.discount) : '',
    valid_until:    initial.valid_until    || '',
    notes:          initial.notes          || '',
  } : {
    customer_name: '', customer_phone: '', plate: '', car: '', items: [], discount: '',
    valid_until: addDays(localDate(), QUOTE_VALID_DAYS),
    // Terms and bank details rarely change between quotations.
    notes: lastNotes,
  })

  // A plate or phone number seen on an earlier job fills in that customer's details.
  const findCustomer = ({ plate, customer_phone }) => {
    if (initial) return null
    const p = normalisePlate(plate), d = digits(customer_phone)
    return (p.length >= 4 && jobs.find(j => normalisePlate(j.plate) === p))
      || (d.length >= 8 && jobs.find(j => digits(j.phone) === d))
      || null
  }
  const returning = findCustomer(form)
  const fillBlanks = (next) => {
    const job = findCustomer(next)
    return job ? {
      ...next,
      customer_name:  next.customer_name  || job.owner || '',
      customer_phone: next.customer_phone || job.phone || '',
      car:            next.car            || job.car   || '',
    } : next
  }
  // Any edit clears the last validation message.
  const update = (fn) => { setErr(''); setForm(fn) }
  const set = (key, value) => update(f => (key === 'plate' || key === 'customer_phone') ? fillBlanks({ ...f, [key]: value }) : { ...f, [key]: value })
  const setItem = (i, key, value) => update(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [key]: value } : item) }))
  const removeItem = (i) => update(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const subtotal = quoteSubtotal(form.items.filter(item => (item.description || '').trim()))
  const discount = Math.max(0, parseFloat(form.discount) || 0)
  const total    = Math.max(0, subtotal - discount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const items = cleanItems(form.items)
    if (!form.customer_name.trim() || items.length === 0) { setErr(t('qt_required')); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        customer_name:  form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        plate:          normalisePlate(form.plate) || null,
        car:            form.car.trim() || null,
        items,
        discount,
        valid_until:    form.valid_until || null,
        notes:          form.notes.trim() || null,
      })
    } catch (e) {
      setErr(e.message); setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!(await confirm({ title: t('qt_delete_title', { no: quoteNumber(initial) }), message: t('qt_delete_msg'), confirmLabel: t('delete'), tone: 'danger', icon: Trash2 }))) return
    setDeleting(true); setErr('')
    try { await onDelete() } catch (e) { setErr(e.message); setDeleting(false) }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const labelCls = 'block text-charcoal text-xs font-semibold mb-1.5'
  const Req = () => <span className="text-red-700" aria-hidden="true"> *</span>
  const textField = (key, label, extra = {}) => (
    <div className={extra.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`qt-${key}`} className={labelCls}>{label}{extra.required && <Req />}</label>
      <input id={`qt-${key}`} type={extra.type || 'text'} value={form[key]}
        onChange={e => set(key, extra.upper ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={extra.placeholder} aria-required={extra.required || undefined}
        inputMode={extra.inputMode} autoComplete="off" autoCapitalize={extra.autoCapitalize}
        spellCheck={extra.spellCheck} className={inputCls} />
    </div>
  )

  return (
    <>
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="qt-form-title" className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-xl max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
          <div className="min-w-0">
            <h2 id="qt-form-title" className="font-display font-bold text-ink text-xl">{initial ? t('qt_edit_title') : t('qt_new')}</h2>
            <p className="text-xs text-mute mt-0.5">{t('form_required_hint')}</p>
          </div>
          <button type="button" aria-label={t('ui_close')} onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-5 h-5 text-mute" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 divide-y divide-hairline">

            <section aria-labelledby="qt-sec-customer" className="form-section">
              <h3 id="qt-sec-customer" className="form-section-title">{t('form_sec_vehicle')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {textField('customer_name', t('qt_customer'), { required: true, placeholder: t('form_owner_ph'), autoCapitalize: 'words', wide: true })}
                {textField('customer_phone', t('form_phone'), { type: 'tel', inputMode: 'tel', placeholder: t('form_phone_ph') })}
                {textField('plate', t('form_plate'), { upper: true, placeholder: t('form_plate_ph'), autoCapitalize: 'characters', spellCheck: false })}
                {returning && (
                  <div className="sm:col-span-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3" role="status">
                    <UserCheck className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary">{t('form_returning')}</p>
                      <p className="text-xs text-body truncate">{[returning.owner, returning.car].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                )}
                {textField('car', t('form_car'), { placeholder: t('form_car_ph'), autoCapitalize: 'words', wide: true })}
              </div>
              <p className="-mt-1 text-xs text-mute px-1">{t('qt_vehicle_hint')}</p>
            </section>

            <section aria-labelledby="qt-sec-work" className="form-section">
              <div className="flex items-center justify-between">
                <h3 id="qt-sec-work" className="form-section-title">{t('form_sec_work')}<span className="text-red-700" aria-hidden="true"> *</span></h3>
                <button type="button" onClick={() => setShowCatalog(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {t('form_add_service')}
                </button>
              </div>
              {form.items.length > 0 ? (
                <div className="space-y-2">
                  {form.items.map((item, i) => {
                    const qty = parseFloat(item.qty) || 1
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <input type="text" value={item.description}
                            onChange={e => setItem(i, 'description', e.target.value)}
                            placeholder={t('form_svc_desc_ph')} aria-label={t('form_services')}
                            className="flex-1 min-w-0 bg-canvas border border-hairline rounded-full px-4 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
                          <div className="flex items-center bg-canvas border border-hairline rounded-full px-2.5 py-2.5 gap-1 flex-shrink-0">
                            <span className="text-xs text-mute select-none" aria-hidden="true">×</span>
                            <input type="text" inputMode="decimal" value={item.qty ?? 1} aria-label={t('form_qty')}
                              onChange={e => setItem(i, 'qty', e.target.value)}
                              className="w-7 text-sm text-ink text-center focus:outline-none bg-transparent" />
                          </div>
                          <input type="text" inputMode="decimal" value={item.unit_price ?? ''} aria-label={t('form_unit_price')}
                            onChange={e => setItem(i, 'unit_price', e.target.value)} placeholder="0.00"
                            className="w-20 bg-canvas border border-hairline rounded-full px-3 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors text-right" />
                          <button type="button" onClick={() => removeItem(i)} aria-label={t('delete')}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-mute hover:text-red-700 hover:bg-red-50 transition-colors flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {qty > 1 && <span className="pl-3 text-[11px] text-mute">= {formatRM(lineAmount(item))}</span>}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qt-discount" className={labelCls}>{t('form_discount').replace(/\s*\(RM\)\s*$/, '')}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-mute" aria-hidden="true">RM</span>
                    <input id="qt-discount" type="text" inputMode="decimal" value={form.discount} onChange={e => set('discount', e.target.value)} placeholder="0.00"
                      className="w-full bg-canvas border border-hairline rounded-full pl-11 pr-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
                  </div>
                </div>
              </div>

              <div className="bg-surface-bone border border-hairline rounded-xl px-4 py-3 space-y-1 text-xs" aria-live="polite">
                {discount > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-mute">{t('rc_subtotal')}</span><span>{formatRM(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-mute">{t('rc_discount')}</span><span className="text-badge-success">− {formatRM(discount)}</span></div>
                  </>
                )}
                <div className={`flex justify-between font-bold text-sm ${discount > 0 ? 'border-t border-hairline pt-1.5 mt-1' : ''}`}>
                  <span className="text-charcoal">{t('rc_total')}</span>
                  <span className="text-primary">{formatRM(total)}</span>
                </div>
              </div>
            </section>

            <section aria-labelledby="qt-sec-terms" className="form-section">
              <h3 id="qt-sec-terms" className="form-section-title">{t('qt_sec_terms')}</h3>
              <div>
                <label htmlFor="qt-valid" className={labelCls}>{t('qt_valid_until')}</label>
                <input id="qt-valid" type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors sm:w-1/2" />
                <p className="text-xs text-mute mt-1 px-1">{t('qt_valid_hint')}</p>
              </div>
              <div>
                <label htmlFor="qt-notes" className={labelCls}>{t('qt_notes')}</label>
                <textarea id="qt-notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} placeholder={t('qt_notes_ph')}
                  className="w-full bg-canvas border border-hairline rounded-xl px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors resize-y" />
                {!initial && lastNotes && form.notes === lastNotes && <p className="text-xs text-mute mt-1 px-1">{t('qt_notes_prefilled')}</p>}
              </div>
            </section>

            {initial && onDelete && (
              <section className="form-section">
                <button type="button" onClick={handleDelete} disabled={deleting || saving}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> {deleting ? t('saving') : t('qt_delete')}
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
          update(f => ({ ...f, items: [...f.items, {
            description,
            unit_price: unitPrice,
            qty: 1,
            inventory_item_id: stockInfo?.inventory_item_id || null,
            qty_per_service:   stockInfo?.qty_per_service   || 1,
            category_name:     stockInfo?.category_name     || null,
          }] }))
          setShowCatalog(false)
        }}
      />
    )}
    </>
  )
}
