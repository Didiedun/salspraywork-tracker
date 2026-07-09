import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PaymentBadge, TypeBadge } from './StatusBadge'
import { StageBar } from './StageBar'
import { ReceiptModal } from './ReceiptModal'
import { paymentStatus, SPRAY_STAGES } from '../constants'
import { useLang } from '../context/LanguageContext'
import { Search, Car, FileText, Image, Phone, Printer, ArrowLeftRight, X, Wrench, RefreshCw, Globe, Clock } from 'lucide-react'

function timeAgo(dateStr, lang) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 120)  return lang === 'ms' ? 'baru sahaja' : 'just now'
  if (diff < 3600) { const m = Math.floor(diff / 60);   return lang === 'ms' ? `${m} minit lalu`  : `${m} min ago` }
  if (diff < 86400){ const h = Math.floor(diff / 3600); return lang === 'ms' ? `${h} jam lalu`    : `${h}h ago` }
  const d = Math.floor(diff / 86400)
  return lang === 'ms' ? `${d} hari lalu` : `${d}d ago`
}

function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06Z"/>
    </svg>
  )
}

export function CustomerView() {
  const { slug } = useParams()
  const { t, lang, setLang } = useLang()
  const [workshop, setWorkshop]   = useState(null)
  const [wsLoading, setWsLoading] = useState(true)

  const [mode, setMode]             = useState('plate')
  const [query, setQuery]           = useState('')
  const [jobs, setJobs]             = useState([])
  const [activeJob, setActiveJob]   = useState(null)
  const [searched, setSearched]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [lightbox, setLightbox]     = useState(null)
  const [beforeAfter, setBeforeAfter] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [payLoading, setPayLoading]   = useState(false)
  const [payError, setPayError]       = useState('')

  const payOnline = async (jobId) => {
    setPayLoading(true); setPayError('')
    try {
      const { data, error } = await supabase.functions.invoke('create-bill-public', {
        body: { job_id: jobId, return_url: window.location.href },
      })
      if (error || !data?.payment_url) {
        let msg = t('cv_pay_err')
        try { const body = await error?.context?.json?.(); msg = body?.error || msg } catch { /* keep default */ }
        throw new Error(data?.error || msg)
      }
      window.location.href = data.payment_url
    } catch (e) {
      setPayError(e.message)
      setPayLoading(false)
    }
  }

  useEffect(() => {
    if (!slug) { setWsLoading(false); return }
    supabase.from('workshops').select('*').eq('slug', slug).maybeSingle()
      .then(({ data }) => { setWorkshop(data || null); setWsLoading(false) })
  }, [slug])

  const search = async (e) => {
    e.preventDefault()
    if (!workshop) return
    const q = query.trim().toUpperCase().replace(/\s+/g, '')
    if (!q) return
    setLoading(true); setSearched(false); setActiveJob(null); setJobs([])
    if (mode === 'plate') {
      const { data } = await supabase
        .from('jobs').select('*, job_attachments(*)')
        .eq('workshop_id', workshop.id)
        .ilike('plate', q).eq('archived', false)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      setActiveJob(data || null)
    } else {
      const phone = query.trim().replace(/\D/g, '')
      if (!phone) { setSearched(true); setLoading(false); return }
      const { data } = await supabase
        .from('jobs').select('*, job_attachments(*)')
        .eq('workshop_id', workshop.id)
        .ilike('phone', `%${phone}%`)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(20)
      const list = data || []
      setJobs(list)
      if (list.length === 1) setActiveJob(list[0])
    }
    setSearched(true); setLoading(false)
  }

  const job          = activeJob
  const photos         = job?.job_attachments?.filter(a => a.type === 'photo') || []
  const firstPhoto     = photos[0]
  const lastPhoto      = photos[photos.length - 1]
  const hasPhotos      = photos.length > 0
  const hasBeforeAfter = photos.length >= 2

  const wsWaNum = workshop?.phone ? (() => { const d = workshop.phone.replace(/\D/g,''); return d.startsWith('60') ? d : '60'+d.replace(/^0/,'') })() : null
  const formatDate   = (d) => d ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  const formatMoney  = (v) => v != null ? `RM ${Number(v).toFixed(2)}` : '-'
  const balance      = job ? (Number(job.total_amount) || 0) - (Number(job.discount) || 0) - (Number(job.downpayment) || 0) : 0
  const pStatus      = job ? paymentStatus(job) : null

  const paymentBorder = {
    paid:    'border-emerald-200 bg-emerald-50',
    deposit: 'border-amber-200 bg-amber-50',
    unpaid:  'border-red-200 bg-red-50',
  }

  if (wsLoading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-mute animate-spin" />
    </div>
  )

  if (!workshop) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 text-center">
      <Wrench className="w-12 h-12 text-ash mb-4 opacity-40" />
      <p className="font-display font-bold text-ink text-lg">{t('cv_ws_missing')}</p>
      <p className="text-mute text-sm mt-1">{t('cv_ws_gone')}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <div className="bg-canvas border-b border-hairline">
        <div className="max-w-xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
            {workshop.logo_url
              ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
              : <Wrench className="w-5 h-5 text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-ink text-base leading-tight">{workshop.name}</h1>
            <p className="text-mute text-xs">{t('cv_subtitle')}</p>
          </div>
          <button onClick={() => setLang(lang === 'ms' ? 'en' : 'ms')}
            className="flex items-center gap-1.5 text-xs text-mute hover:text-ink border border-hairline rounded-full px-3 py-1.5 hover:bg-surface-bone transition-colors flex-shrink-0">
            <Globe className="w-3.5 h-3.5" /> {t('lang_other')}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-8 space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2 bg-surface-card border border-hairline rounded-full p-1 w-fit">
          {[['plate', t('cv_plate_tab')], ['phone', t('cv_phone_tab')]].map(([m, label]) => (
            <button key={m}
              onClick={() => { setMode(m); setQuery(''); setSearched(false); setActiveJob(null); setJobs([]) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                mode === m
                  ? 'bg-surface-dark text-on-dark'
                  : 'text-mute hover:text-charcoal'
              }`}>{label}</button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            {mode === 'plate'
              ? <Car   className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
              : <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
            }
            <input value={query}
              onChange={e => setQuery(mode === 'plate' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={mode === 'plate' ? t('cv_plate_ph') : t('cv_phone_ph')}
              className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-primary hover:bg-primary-deep disabled:opacity-50 text-white rounded-full px-5 py-3 flex items-center gap-2 font-semibold text-sm transition-colors">
            <Search className="w-4 h-4" />
            {loading ? '...' : t('cv_search')}
          </button>
        </form>

        {/* Multiple results */}
        {searched && mode === 'phone' && jobs.length > 1 && !activeJob && (
          <div className="space-y-2">
            <p className="text-charcoal text-sm font-medium">{jobs.length} {t('cv_multiple')}</p>
            {jobs.map(j => (
              <button key={j.id} onClick={() => setActiveJob(j)}
                className="w-full bg-surface-card hover:bg-surface-bone border border-hairline rounded-md p-4 text-left transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ink font-display font-bold tracking-tight">{j.plate}</p>
                    <p className="text-charcoal text-sm">{j.car}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-mute text-xs">{formatDate(j.date_in || j.created_at)}</p>
                    <p className="text-primary text-xs font-semibold mt-1">{j.stage}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Not found */}
        {searched && !job && (mode === 'plate' || (mode === 'phone' && jobs.length === 0)) && (
          <div className="bg-surface-card border border-hairline rounded-md p-8 text-center">
            <p className="text-charcoal font-semibold mb-1">{t('cv_not_found')}</p>
            <p className="text-mute text-sm">{mode === 'plate' ? t('cv_check_plate') : t('cv_check_phone')}</p>
          </div>
        )}

        {/* Idle state */}
        {!searched && (
          <div className="space-y-4 pt-2">
            <p className="text-center text-charcoal text-sm leading-relaxed">{t('cv_idle_prompt')}</p>
            <div>
              <p className="text-xs font-semibold text-mute uppercase tracking-wide mb-3 px-1">{t('cv_services')}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Ketuk & Tarik',  desc: 'Baiki kemek & kerosakan panel' },
                  { name: 'Dempul',         desc: 'Haluskan badan kereta sebelum cat' },
                  { name: 'Cat Spray',      desc: 'Semburan cat penuh atau bahagian' },
                  { name: 'Polish & Wax',   desc: 'Gilap semula badan kereta' },
                  { name: 'Ceramic Coat',   desc: 'Salutan pelindung badan kereta' },
                  { name: 'Full Duco',      desc: 'Cat semula keseluruhan kereta' },
                ].map(s => (
                  <div key={s.name} className="bg-surface-card border border-hairline rounded-md p-3">
                    <p className="text-ink font-semibold text-sm">{s.name}</p>
                    <p className="text-mute text-xs mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Job detail */}
        {job && (
          <div className="space-y-3">
            <div className="bg-surface-card rounded-lg border border-hairline p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-ink font-display font-bold text-2xl tracking-tight">{job.plate}</p>
                  <p className="text-charcoal text-sm mt-0.5">{job.car}</p>
                </div>
                <TypeBadge type={job.type} />
              </div>
              <div className="bg-canvas rounded-md p-4 border border-hairline">
                <p className="text-mute text-xs mb-3 font-medium">{t('cv_stage_lbl')}</p>
                <StageBar current={job.stage} useLabel stages={Array.isArray(workshop?.stages) && workshop.stages.length > 0 ? workshop.stages : SPRAY_STAGES} />
                {job.updated_at && (
                  <p className="text-mute text-xs mt-2 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {t('cv_updated')} {timeAgo(job.updated_at, lang)}
                  </p>
                )}
              </div>
              {job.est_completion && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                  <p className="text-primary text-xs font-semibold">{t('cv_est')}</p>
                  <p className="text-ink font-bold">{formatDate(job.est_completion)}</p>
                </div>
              )}
            </div>

            <div className="bg-surface-card rounded-lg border border-hairline p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-canvas rounded-md p-3 border border-hairline">
                  <p className="text-mute text-xs mb-1 font-medium">{t('cv_owner')}</p>
                  <p className="text-ink font-semibold">{job.owner}</p>
                </div>
                <div className="bg-canvas rounded-md p-3 border border-hairline">
                  <p className="text-mute text-xs mb-1 font-medium">{t('cv_date_in')}</p>
                  <p className="text-ink font-semibold">{formatDate(job.date_in || job.created_at)}</p>
                </div>
              </div>

              <div className={`rounded-md p-4 border ${paymentBorder[pStatus] || 'border-hairline bg-canvas'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-charcoal text-xs font-semibold">{t('pay_info')}</p>
                  <PaymentBadge job={job} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-charcoal">{t('pay_total')}</span>
                  <span className="text-ink font-semibold">{formatMoney(job.total_amount)}</span>
                </div>
                {Number(job.discount) > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-charcoal">{t('rc_discount')}</span>
                    <span className="text-badge-success font-semibold">- {formatMoney(job.discount)}</span>
                  </div>
                )}
                {job.downpayment > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-charcoal">{t('pay_deposit_paid')}</span>
                    <span className="text-ink font-semibold">- {formatMoney(job.downpayment)}</span>
                  </div>
                )}
                {!job.paid && balance > 0 && (
                  <>
                    <div className="border-t border-hairline my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal font-semibold text-sm">{t('pay_balance')}</span>
                      <span className="text-ink font-display font-bold text-lg">{formatMoney(balance)}</span>
                    </div>
                    {workshop.toyyibpay_secret_set && workshop.toyyibpay_category_code && (
                      <>
                        <button onClick={() => payOnline(job.id)} disabled={payLoading}
                          className="w-full mt-3 flex items-center justify-center gap-2 bg-primary hover:bg-primary-deep disabled:opacity-60 text-white font-semibold rounded-full py-3 transition-colors text-sm">
                          {payLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                          {t('cv_pay_now')} — {formatMoney(balance)}
                        </button>
                        {payError && (
                          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">{payError}</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {job.notes && (
                <div className="bg-canvas rounded-md p-3 border border-hairline">
                  <p className="text-mute text-xs mb-1 flex items-center gap-1 font-medium">
                    <FileText className="w-3 h-3" /> {t('cv_notes_lbl')}
                  </p>
                  <p className="text-charcoal text-sm">{job.notes}</p>
                </div>
              )}
            </div>

            {hasPhotos && (
              <div className="bg-surface-card rounded-lg border border-hairline p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-ink font-semibold flex items-center gap-2 text-sm">
                    <Image className="w-4 h-4 text-primary" /> {t('cv_photos_lbl')} ({photos.length})
                  </p>
                  {hasBeforeAfter && (
                    <button onClick={() => setBeforeAfter(x => !x)}
                      className="flex items-center gap-1.5 text-xs bg-canvas border border-hairline text-charcoal px-3 py-1.5 rounded-full hover:bg-surface-bone transition-colors font-semibold">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      {beforeAfter ? t('cv_grid') : t('cv_ba_toggle')}
                    </button>
                  )}
                </div>
                {beforeAfter && hasBeforeAfter ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-mute text-center mb-1.5 font-medium">{t('cv_before')}</p>
                      <img src={firstPhoto.url} alt="before" className="w-full aspect-square object-cover rounded-md cursor-pointer"
                        onClick={() => setLightbox(firstPhoto.url)} />
                    </div>
                    <div>
                      <p className="text-xs text-mute text-center mb-1.5 font-medium">{t('cv_after')}</p>
                      <img src={lastPhoto.url} alt="after" className="w-full aspect-square object-cover rounded-md cursor-pointer"
                        onClick={() => setLightbox(lastPhoto.url)} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(img => (
                      <div key={img.id} className="relative">
                        <img src={img.url} alt={img.stage} className="w-full aspect-square object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightbox(img.url)} />
                        {img.stage && <span className="absolute bottom-1 left-1 bg-ink/60 text-white text-xs px-1 rounded">{img.stage}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {wsWaNum && (
                <a href={`https://wa.me/${wsWaNum}?text=${encodeURIComponent(t('wa_msg') + ' ' + job.plate)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-badge-success hover:bg-emerald-700 text-white font-semibold rounded-full py-3.5 transition-colors text-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {t('cv_wa')}
                </a>
              )}
              <button onClick={() => setShowReceipt(true)}
                className={`flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-deep text-on-dark font-semibold rounded-full py-3.5 transition-colors text-sm ${!wsWaNum ? 'col-span-2' : ''}`}>
                <Printer className="w-4 h-4" /> {t('cv_receipt')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-surface-deep">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
              {workshop.logo_url
                ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <Wrench className="w-4 h-4 text-white" />
              }
            </div>
            <p className="font-display font-bold text-on-dark text-sm">{workshop.name}</p>
          </div>
          <div className="border-t border-divider-dark pt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {workshop.phone && <p className="text-on-dark-mute text-xs">{workshop.phone}</p>}
              {(workshop.instagram || workshop.tiktok) && (
                <div className="flex items-center gap-2">
                  {workshop.instagram && (
                    <a href={`https://instagram.com/${workshop.instagram}`} target="_blank" rel="noreferrer"
                      className="text-on-dark-mute hover:text-on-dark transition-colors" aria-label="Instagram">
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                  )}
                  {workshop.tiktok && (
                    <a href={`https://www.tiktok.com/@${workshop.tiktok}`} target="_blank" rel="noreferrer"
                      className="text-on-dark-mute hover:text-on-dark transition-colors" aria-label="TikTok">
                      <TikTokIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
            <p className="text-on-dark-mute text-xs">{t('cv_powered')}</p>
          </div>
        </div>
      </footer>

      {lightbox && (
        <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-md" />
          <button className="absolute top-4 right-4 text-white bg-ink/60 hover:bg-ink/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showReceipt && job && (
        <ReceiptModal job={job} workshop={workshop} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  )
}
