import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Search, X, FileText, Eye, Wrench, RotateCcw, CheckCircle2, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useNotify } from '../context/NotifyContext'
import { useQuotations } from '../hooks/useQuotations'
import { useJobs } from '../hooks/useJobs'
import { useStages } from '../hooks/useStages'
import { usePlanGate } from '../hooks/usePlanGate'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { PageHeader } from './PageHeader'
import { QuotationForm } from './QuotationForm'
import { QuotationViewer } from './QuotationViewer'
import { QuoteStatus } from './QuoteStatus'
import { WhatsAppIcon } from './icons'
import { planStatus, isLimitedTrial, TRIAL_LIMITS } from '../lib/plan'
import {
  QUOTE_STATUSES, quoteNumber, quoteTotal, isExpired, quoteToJob, normalisePlate,
  whatsappText, whatsappLink, formatRM,
} from '../lib/quotations'

const CHIPS = ['all', ...QUOTE_STATUSES]

// Asks for the plate and model when the quotation has none (a job needs both).
function ConvertDialog({ quote, busy, onConfirm, onClose }) {
  const { t } = useLang()
  const ref = useDialogFocus(onClose)
  const [plate, setPlate] = useState(quote.plate || '')
  const [car, setCar]     = useState(quote.car || '')
  const [err, setErr]     = useState('')
  const needsVehicle = !quote.plate || !quote.car
  const hasStock = (quote.items || []).some(item => item.inventory_item_id)
  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'

  const submit = (e) => {
    e.preventDefault()
    if (!normalisePlate(plate) || !car.trim()) { setErr(t('qt_convert_need_vehicle')); return }
    onConfirm({ plate: normalisePlate(plate), car: car.trim() })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <form ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="qt-convert-title" aria-describedby="qt-convert-msg"
        onSubmit={submit} noValidate className="w-full max-w-sm rounded-2xl bg-surface-card p-5 shadow-xl animate-slideUp">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-1">
            <h2 id="qt-convert-title" className="font-display text-lg font-bold leading-tight text-ink">{t('qt_convert_title')}</h2>
            <p id="qt-convert-msg" className="mt-1.5 text-sm leading-relaxed text-charcoal">
              {t('qt_convert_msg', { name: quote.customer_name, total: formatRM(quoteTotal(quote)) })}
            </p>
            {hasStock && <p className="mt-1.5 text-xs text-mute">{t('qt_convert_stock')}</p>}
          </div>
        </div>
        {needsVehicle && (
          <div className="mt-4 space-y-3 rounded-xl bg-canvas p-3">
            <p className="text-xs font-semibold text-charcoal">{t('qt_convert_need_vehicle')}</p>
            <div>
              <label htmlFor="qt-convert-plate" className="block text-charcoal text-xs font-semibold mb-1.5">{t('form_plate')}<span className="text-red-700" aria-hidden="true"> *</span></label>
              <input id="qt-convert-plate" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} aria-required="true"
                placeholder={t('form_plate_ph')} autoCapitalize="characters" spellCheck={false} autoComplete="off" className={`${inputCls} bg-surface-card`} />
            </div>
            <div>
              <label htmlFor="qt-convert-car" className="block text-charcoal text-xs font-semibold mb-1.5">{t('form_car')}<span className="text-red-700" aria-hidden="true"> *</span></label>
              <input id="qt-convert-car" value={car} onChange={e => setCar(e.target.value)} aria-required="true"
                placeholder={t('form_car_ph')} autoCapitalize="words" autoComplete="off" className={`${inputCls} bg-surface-card`} />
            </div>
          </div>
        )}
        {err && <p role="alert" className="mt-3 text-red-700 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="ui-secondary flex-1">{t('cancel')}</button>
          <button type="submit" disabled={busy} className="ui-primary flex-1">{busy ? t('qt_converting') : t('qt_convert_btn')}</button>
        </div>
      </form>
    </div>
  )
}

function QuoteCard({ quote, locale, waHref, onWhatsApp, onView, onConvert, onReopen }) {
  const { t } = useLang()
  const items = quote.items || []
  const open = quote.status === 'draft' || quote.status === 'sent'
  const expired = isExpired(quote)
  const shortDate = (d) => new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const summary = items[0]?.description
    ? items[0].description + (items.length > 1 ? ` ${t('qt_more', { n: items.length - 1 })}` : '')
    : ''

  return (
    <article aria-labelledby={`qt-${quote.id}`} className="job-card border border-hairline">
      <div className="job-card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-mute">{quoteNumber(quote)}</p>
            <h3 id={`qt-${quote.id}`} className="mt-1 truncate font-display text-xl font-bold text-ink sm:text-2xl">{quote.customer_name}</h3>
            {(quote.plate || quote.car) && (
              <p className="mt-1.5 flex min-w-0 items-center gap-2 text-sm text-charcoal">
                {quote.plate && <span className="plate text-[13px] flex-shrink-0">{quote.plate}</span>}
                {quote.car && <span className="truncate">{quote.car}</span>}
              </p>
            )}
          </div>
          <QuoteStatus quote={quote} showExpired={false} />
        </div>

        {summary && <p className="mt-3 truncate text-sm text-body">{summary}</p>}

        <dl className="job-facts sm:grid-cols-2">
          <div><dt>{t('rc_total')}</dt><dd className="font-display text-lg text-primary">{formatRM(quoteTotal(quote))}</dd></div>
          {quote.status === 'accepted' ? (
            <div><dt>{t('qt_status_accepted')}</dt><dd className="flex items-center gap-1 text-badge-success">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> {shortDate(quote.updated_at || quote.created_at)}
            </dd></div>
          ) : quote.valid_until && (
            <div>
              <dt className={expired ? 'font-semibold text-amber-800' : ''}>{expired ? t('qt_expired') : t('qt_valid_until')}</dt>
              <dd className={expired ? 'text-amber-800' : ''}>{shortDate(quote.valid_until)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="job-card-actions flex border-t border-hairline">
        {open && (
          <a href={waHref} target="_blank" rel="noreferrer" onClick={onWhatsApp} className="job-action text-badge-success hover:bg-emerald-50">
            <WhatsAppIcon className="w-4 h-4" /> {t('card_whatsapp')}
          </a>
        )}
        <button type="button" onClick={onView} className="job-action">
          <Eye className="w-4 h-4" aria-hidden="true" /> {t('qt_view')}
        </button>
        {open && (
          <button type="button" onClick={onConvert} className="job-action job-action-primary">
            <Wrench className="w-4 h-4" aria-hidden="true" /> {t('qt_to_job')}
          </button>
        )}
        {quote.status === 'rejected' && (
          <button type="button" onClick={onReopen} className="job-action">
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> {t('qt_reopen')}
          </button>
        )}
      </div>
    </article>
  )
}

export function QuotationsPage() {
  const { workshop } = useApp()
  const { t, lang } = useLang()
  const { toast, confirm } = useNotify()
  const planGate = usePlanGate()
  const { stages } = useStages()
  const { quotes, loading, error, fetchQuotes, addQuote, updateQuote, deleteQuote } = useQuotations(workshop?.id)
  const { jobs, offline, addJob } = useJobs(workshop?.id)
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'

  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [editing, setEditing]       = useState(null)   // 'new' | quotation
  const [viewingId, setViewingId]   = useState(null)
  const [converting, setConverting] = useState(null)
  const [busy, setBusy]             = useState(false)
  const chipRowRef = useRef(null)
  const viewing = quotes.find(q => q.id === viewingId) || null

  // On phones the chip row scrolls sideways; keep the active filter in view.
  useEffect(() => {
    const row = chipRowRef.current
    const chip = row?.querySelector('[aria-pressed="true"]')
    if (!chip || row.scrollWidth <= row.clientWidth) return
    const x = chip.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
    row.scrollTo({ left: x - (row.clientWidth - chip.offsetWidth) / 2 })
  }, [filter])

  const count = (key) => key === 'all' ? quotes.length : quotes.filter(q => q.status === key).length
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return quotes.filter(quote => {
      if (filter !== 'all' && quote.status !== filter) return false
      if (!q) return true
      return (quote.customer_name || '').toLowerCase().includes(q)
        || (quote.plate || '').toLowerCase().includes(q.replace(/\s+/g, ''))
        || (quote.car || '').toLowerCase().includes(q)
        || quoteNumber(quote).toLowerCase().includes(q)
        || (digits.length >= 3 && (quote.customer_phone || '').replace(/\D/g, '').includes(digits))
    })
  }, [quotes, filter, search])

  const formatDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const waHref = (quote) => whatsappLink(quote, whatsappText(quote, { t, workshopName: workshop?.name || '', formatDate }))

  const setStatus = async (quote, status, message) => {
    setBusy(true)
    try {
      await updateQuote(quote.id, { status })
      if (message) toast.success(message)
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }
  // Sending it on WhatsApp is what "sent" means for most workshops.
  const onWhatsApp = (quote) => { if (quote.status === 'draft') setStatus(quote, 'sent', t('qt_sent_toast')) }

  const saveQuote = async (fields) => {
    if (editing === 'new') {
      const created = await addQuote(fields)
      setEditing(null); setViewingId(created.id)
    } else {
      await updateQuote(editing.id, fields)
      setEditing(null)
    }
    toast.success(t('qt_saved'))
  }

  const removeQuote = async (quote) => {
    await deleteQuote(quote.id)
    setEditing(null); setViewingId(null)
    toast.success(t('qt_deleted'))
  }

  // Accepted quotations have no edit form, so they are deleted from the viewer.
  const deleteFromViewer = async (quote) => {
    if (!(await confirm({ title: t('qt_delete_title', { no: quoteNumber(quote) }), message: t('qt_delete_msg'), confirmLabel: t('delete'), tone: 'danger', icon: Trash2 }))) return
    setBusy(true)
    try { await removeQuote(quote) } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }
  const statusToast = (quote, status) =>
    status === 'rejected' ? t('qt_rejected_toast') : quote.status === 'rejected' ? t('qt_reopened_toast') : t('qt_sent_toast')

  const startConvert = (quote) => {
    // Offline, addJob only keeps the job on this device; the quotation would then point at nothing.
    if (offline) { toast.error(t('qt_convert_offline')); return }
    const active = jobs.filter(j => !j.archived).length
    if (planStatus(workshop).state === 'expired') { planGate('plan_expired_block', 'plan_expired_title'); return }
    if (isLimitedTrial(workshop) && active >= TRIAL_LIMITS.jobs) { planGate('plan_limit_jobs'); return }
    setConverting(quote)
  }

  const convert = async (vehicle) => {
    const quote = { ...converting, ...vehicle }
    setBusy(true)
    let job
    try {
      job = await addJob(quoteToJob(quote, { stage: stages[0]?.value || 'ready', note: t('qt_job_note', { no: quoteNumber(quote) }) }))
    } catch (e) {
      toast.error(e.message); setBusy(false); return
    }
    try {
      await updateQuote(quote.id, { status: 'accepted', job_id: job.id, plate: vehicle.plate, car: vehicle.car })
      toast.success(t('qt_converted', { plate: job.plate }))
    } catch (e) {
      toast.error(t('qt_convert_partial', { msg: e.message }))
    }
    setBusy(false); setConverting(null)
  }

  const openNew = () => setEditing('new')
  const filtering = search || filter !== 'all'
  const lastNotes = quotes.find(q => q.notes)?.notes || ''
  const chipLabel = (key) => key === 'all' ? t('qt_chip_all') : t(`qt_status_${key}`)

  return (
    <div className="app-page">
      <PageHeader title={t('nav_quotations')} description={t('qt_sub')}
        actions={<button onClick={openNew} className="ui-primary hidden sm:inline-flex"><Plus className="w-4 h-4" /> {t('qt_new')}</button>} />

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-medium">{t('error_prefix')} {error}</p>
          <button onClick={fetchQuotes} className="mt-3 text-sm text-red-700 font-semibold underline">{t('retry')}</button>
        </div>
      ) : !loading && quotes.length === 0 ? (
        <section className="rounded-2xl border border-hairline bg-surface-card p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" aria-hidden="true" /></div>
          <h2 className="mt-4 font-display text-2xl font-bold text-ink">{t('qt_empty_title')}</h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-charcoal">{t('qt_empty_sub')}</p>
          <button onClick={openNew} className="ui-primary mt-5"><Plus className="w-4 h-4" /> {t('qt_new')}</button>
        </section>
      ) : (
        <section aria-labelledby="quotes-heading" className="space-y-3">
          <h2 id="quotes-heading" className="sr-only">{t('nav_quotations')}</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" aria-hidden="true" />
            <input type="search" aria-label={t('qt_search_ph')} value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('qt_search_ph')} enterKeyHint="search"
              className="w-full min-h-11 bg-surface-card border border-hairline rounded-full pl-11 pr-11 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label={t('dash_search_clear')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-canvas hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div ref={chipRowRef} className="chip-row" role="group" aria-label={t('qt_filter_label')}>
            {CHIPS.map(key => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
                className={`chip ${filter === key ? 'chip-on' : ''}`}>
                {chipLabel(key)} <span className="chip-count">{count(key)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-mute" role="status">{loading ? t('loading') : `${filtered.length} ${t('qt_results')}`}</p>

          {loading ? (
            <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
              {[0, 1].map(item => <div key={item} className="rounded-2xl border border-hairline bg-surface-card p-5 space-y-4">
                <div className="ui-skeleton h-4 w-1/4" /><div className="ui-skeleton h-6 w-1/2" /><div className="ui-skeleton h-10 w-full" />
              </div>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="ui-empty">
              <FileText className="w-10 h-10 mx-auto mb-3 text-ash opacity-40" aria-hidden="true" />
              <p className="font-semibold text-charcoal">{t('qt_no_results')}</p>
              {filtering && <><p className="mt-2 text-sm text-mute">{t('qt_no_results_sub')}</p>
                <button className="ui-secondary mt-5" onClick={() => { setSearch(''); setFilter('all') }}>{t('ui_clear')}</button></>}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map(quote => (
                <QuoteCard key={quote.id} quote={quote} locale={locale} waHref={waHref(quote)}
                  onWhatsApp={() => onWhatsApp(quote)}
                  onView={() => setViewingId(quote.id)}
                  onConvert={() => startConvert(quote)}
                  onReopen={() => setStatus(quote, 'sent', t('qt_reopened_toast'))} />
              ))}
            </div>
          )}
        </section>
      )}

      <button onClick={openNew} className="fab sm:hidden">
        <Plus className="w-5 h-5" aria-hidden="true" /> {t('qt_new')}
      </button>

      {viewing && !editing && (
        <QuotationViewer quote={viewing} workshop={workshop} waHref={waHref(viewing)} busy={busy}
          onClose={() => setViewingId(null)}
          onEdit={() => setEditing(viewing)}
          onWhatsApp={() => onWhatsApp(viewing)}
          onConvert={() => startConvert(viewing)}
          onStatus={(status) => setStatus(viewing, status, statusToast(viewing, status))}
          onDelete={() => deleteFromViewer(viewing)} />
      )}
      {editing && (
        <QuotationForm initial={editing === 'new' ? null : editing} lastNotes={lastNotes} jobs={jobs}
          onSave={saveQuote}
          onDelete={editing === 'new' ? null : () => removeQuote(editing)}
          onClose={() => setEditing(null)} />
      )}
      {converting && (
        <ConvertDialog quote={converting} busy={busy} onConfirm={convert} onClose={() => { if (!busy) setConverting(null) }} />
      )}
    </div>
  )
}
