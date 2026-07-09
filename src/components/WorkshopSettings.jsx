import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { SPRAY_STAGES } from '../constants'
import { planStatus, planPrices } from '../lib/plan'
import { Settings, Upload, Save, Loader, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Globe, Zap } from 'lucide-react'

function BillingCard() {
  const { workshop } = useApp()
  const { t, lang } = useLang()
  const [paying, setPaying] = useState('') // '' | 'monthly' | 'annual'
  const [error,  setError]  = useState('')

  const status = planStatus(workshop)
  const prices = planPrices(workshop)

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' })

  const badge = status.state === 'pro'
    ? { cls: 'bg-badge-success/10 text-badge-success', label: t('st_bill_pro_until', { date: fmtDate(status.until) }) }
    : status.state === 'trial'
      ? { cls: 'bg-amber-50 text-amber-700', label: status.daysLeft === null ? t('st_bill_trial_left', { days: '—' }) : t('st_bill_trial_left', { days: status.daysLeft }) }
      : { cls: 'bg-red-50 text-red-600', label: t('st_bill_expired') }

  const handlePay = async (interval) => {
    setPaying(interval); setError('')
    try {
      const { data, error: err } = await supabase.functions.invoke('create-subscription-bill', {
        body: { interval, return_url: `${window.location.origin}/settings?sub=pending` },
      })
      if (err || !data?.payment_url) throw new Error(data?.error || err?.message || t('st_bill_error'))
      window.location.href = data.payment_url
    } catch (e) {
      setError(e.message)
      setPaying('')
    }
  }

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-ink text-sm">{t('st_bill_title')}</h2>
            <p className="text-xs text-mute">{t('st_bill_sub')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {workshop?.early_bird && (
        <p className="text-xs text-badge-success font-semibold">{t('st_bill_eb_note')}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {[['monthly', prices.monthly, t('st_bill_monthly')], ['annual', prices.annual, t('st_bill_annual')]].map(([key, price, label]) => (
          <button key={key} type="button" onClick={() => handlePay(key)} disabled={!!paying}
            className="flex flex-col items-center gap-0.5 py-3 rounded-xl border-2 border-hairline hover:border-primary bg-canvas text-charcoal transition-all disabled:opacity-50">
            <span className="text-xs font-semibold">{label}</span>
            <span className="font-display font-bold text-lg text-ink">
              {paying === key ? <Loader className="w-4 h-4 animate-spin inline" /> : `RM ${price}`}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      <p className="text-[10px] text-mute">{t('st_bill_note')}</p>
    </div>
  )
}

function PaymentGatewayCard() {
  const { workshop, reloadWorkshop } = useApp()
  const { t } = useLang()

  // The secret is never sent to the client; the field is write-only. It stays
  // blank on load and is only submitted when the owner types a new key.
  const [secretKey,  setSecretKey]  = useState('')
  const [catCode,    setCatCode]    = useState(workshop?.toyyibpay_category_code  || '')
  const [sandbox,    setSandbox]    = useState(workshop?.toyyibpay_sandbox !== false)
  const [showKey,    setShowKey]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')

  const secretSet    = !!workshop?.toyyibpay_secret_set
  const isConfigured = secretSet && !!workshop?.toyyibpay_category_code

  const handleSave = async () => {
    if (!catCode.trim()) { setError('Category Code diperlukan.'); return }
    // Secret only required the first time; afterwards a blank field keeps the existing key.
    if (!secretSet && !secretKey.trim()) { setError('Secret Key dan Category Code diperlukan.'); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      const { error: err } = await supabase.rpc('set_toyyibpay_secret', {
        p_workshop_id: workshop.id,
        p_secret:      secretKey.trim() || null,
        p_category:    catCode.trim(),
        p_sandbox:     sandbox,
      })
      if (err) throw err
      setSecretKey('')
      await reloadWorkshop()
      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'

  return (
    <div className="bg-surface-card border border-hairline rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-ink text-sm">{t('st_gw_title')}</h2>
            <p className="text-xs text-mute">{t('st_gw_sub')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isConfigured ? 'bg-badge-success/10 text-badge-success' : 'bg-surface-bone text-mute'}`}>
          {isConfigured ? t('st_gw_configured') : t('st_gw_not_set')}
        </span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-1">
        <p className="text-xs text-blue-800">{t('st_gw_hint')}</p>
        <a href="https://toyyibpay.com" target="_blank" rel="noreferrer"
          className="text-xs font-semibold text-blue-700 underline hover:text-blue-900">
          {t('st_gw_register')}
        </a>
      </div>

      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_gw_key')}</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={secretKey}
            onChange={e => setSecretKey(e.target.value)}
            placeholder={secretSet ? '•••••••••• (tersimpan)' : t('st_gw_key_ph')}
            className={inputCls + ' pr-12'}
          />
          <button type="button" onClick={() => setShowKey(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ash hover:text-charcoal transition-colors">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {secretSet && (
          <p className="text-xs text-mute mt-1.5">Kunci sudah disimpan. Biarkan kosong untuk kekalkan, atau taip kunci baharu untuk gantikan.</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_gw_cat')}</label>
        <input value={catCode} onChange={e => setCatCode(e.target.value)}
          placeholder={t('st_gw_cat_ph')} className={inputCls} />
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <div className="relative flex-shrink-0 mt-0.5">
          <input type="checkbox" className="sr-only" checked={sandbox} onChange={e => setSandbox(e.target.checked)} />
          <div className={`w-9 h-5 rounded-full transition-colors ${sandbox ? 'bg-amber-400' : 'bg-stone'}`} />
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sandbox ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{t('st_gw_sandbox')}</p>
          <p className="text-xs text-mute">{t('st_gw_sandbox_sub')}</p>
          {!sandbox && (
            <p className="text-xs text-amber-600 font-semibold mt-1">⚠ Mod Sebenar — bayaran akan diproses.</p>
          )}
        </div>
      </label>

      {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      {saved  && <p className="text-badge-success text-xs bg-green-50 border border-green-200 rounded-md px-3 py-2">{t('st_gw_saved')}</p>}

      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
        {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? t('saving') : t('st_gw_save')}
      </button>
    </div>
  )
}

export function WorkshopSettings() {
  const { workshop, reloadWorkshop } = useApp()
  const { t } = useLang()

  const [name, setName]           = useState(workshop?.name      || '')
  const [phone, setPhone]         = useState(workshop?.phone     || '')
  const [address, setAddress]     = useState(workshop?.address   || '')
  const [instagram, setInstagram] = useState(workshop?.instagram || '')
  const [tiktok, setTiktok]       = useState(workshop?.tiktok     || '')
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const fileRef = useRef(null)

  const initStages = () => {
    const ws = workshop?.stages
    return Array.isArray(ws) && ws.length > 0 ? ws : SPRAY_STAGES
  }
  const [stages, setStages]             = useState(initStages)
  const [stagesSaving, setStagesSaving] = useState(false)
  const [stagesSaved, setStagesSaved]   = useState(false)
  const [stagesError, setStagesError]   = useState('')

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError(t('st_logo_size')); return }
    setUploading(true); setError('')
    try {
      const ext  = file.name.split('.').pop()
      const path = `logos/${workshop.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('attachments').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage
        .from('attachments').getPublicUrl(path)
      const { error: dbErr } = await supabase
        .from('workshops').update({ logo_url: publicUrl }).eq('id', workshop.id)
      if (dbErr) throw dbErr
      await reloadWorkshop()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      const { error: err } = await supabase
        .from('workshops')
        .update({ name: name.trim(), phone: phone.trim(), address: address.trim() || null, instagram: instagram.trim().replace(/^@/, '') || null, tiktok: tiktok.trim().replace(/^@/, '') || null })
        .eq('id', workshop.id)
      if (err) throw err
      await reloadWorkshop()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateLabel = (i, label) =>
    setStages(prev => prev.map((s, idx) => idx === i ? { ...s, label } : s))

  const updateShort = (i, short) =>
    setStages(prev => prev.map((s, idx) => idx === i ? { ...s, short } : s))

  const moveUp = (i) => {
    if (i === 0) return
    setStages(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a })
  }

  const moveDown = (i) => {
    setStages(prev => {
      if (i === prev.length - 1) return prev
      const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a
    })
  }

  const addStage = () => {
    setStages(prev => {
      const num  = prev.length
      const newS = { value: `step_${Date.now()}`, label: `Langkah ${num}`, short: `L${num}` }
      return [...prev.slice(0, -1), newS, prev[prev.length - 1]]
    })
  }

  const removeStage = (i) => {
    setStages(prev => prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i))
  }

  const saveStages = async () => {
    const bad = stages.some(s => !s.label.trim() || !s.short.trim())
    if (bad) { setStagesError(t('st_stages_err')); return }
    setStagesSaving(true); setStagesError(''); setStagesSaved(false)
    try {
      const { error: err } = await supabase
        .from('workshops').update({ stages }).eq('id', workshop.id)
      if (err) throw err
      await reloadWorkshop()
      setStagesSaved(true)
      setTimeout(() => setStagesSaved(false), 3000)
    } catch (err) {
      setStagesError(err.message)
    } finally {
      setStagesSaving(false)
    }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary" />
        </div>
        <h1 className="font-display font-bold text-ink text-xl">{t('st_title')}</h1>
      </div>

      {/* Logo */}
      <div className="bg-surface-card border border-hairline rounded-lg p-5">
        <h2 className="font-semibold text-ink text-sm mb-4">{t('st_logo')}</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden border border-hairline">
            {workshop?.logo_url
              ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
              : <span className="font-display font-bold text-white text-2xl">
                  {workshop?.name?.[0]?.toUpperCase() || 'D'}
                </span>
            }
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 bg-surface-bone hover:bg-canvas border border-hairline text-charcoal font-semibold rounded-full px-4 py-2 text-sm transition-colors disabled:opacity-50">
              {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? t('uploading') : t('st_logo_btn')}
            </button>
            <p className="text-xs text-mute mt-1.5">{t('st_logo_hint')}</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
        {workshop?.logo_url && <p className="text-xs text-badge-success mt-3">{t('st_logo_ok')}</p>}
        {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-3">{error}</p>}
      </div>

      {/* Details */}
      <form onSubmit={handleSave} className="bg-surface-card border border-hairline rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-ink text-sm">{t('st_details')}</h2>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            placeholder={t('st_name_ph')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_phone')}</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder={t('st_phone_ph')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_address')}</label>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder={t('st_address_ph')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_instagram')}</label>
          <input value={instagram} onChange={e => setInstagram(e.target.value)}
            placeholder={t('st_instagram_ph')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">{t('st_tiktok')}</label>
          <input value={tiktok} onChange={e => setTiktok(e.target.value)}
            placeholder={t('st_tiktok_ph')} className={inputCls} />
        </div>

        {saved && <p className="text-badge-success text-xs bg-green-50 border border-green-200 rounded-md px-3 py-2">{t('st_saved')}</p>}

        <button type="submit" disabled={saving || !name.trim()}
          className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('saving') : t('st_save')}
        </button>
      </form>

      {/* Stage editor */}
      <div className="bg-surface-card border border-hairline rounded-lg p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-ink text-sm">{t('st_stages')}</h2>
          <p className="text-xs text-mute mt-0.5">{t('st_stages_sub')}</p>
        </div>

        <div className="space-y-2 mb-4">
          {stages.map((s, i) => {
            const isFirst = i === 0
            const isLast  = i === stages.length - 1
            const canDelete = !isFirst && !isLast && stages.length > 2
            return (
              <div key={s.value} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs text-mute font-bold flex-shrink-0">{i + 1}</span>
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button type="button" onClick={() => moveUp(i)} disabled={isFirst}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-bone disabled:opacity-20 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5 text-charcoal" />
                  </button>
                  <button type="button" onClick={() => moveDown(i)} disabled={isLast}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-bone disabled:opacity-20 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5 text-charcoal" />
                  </button>
                </div>
                <input value={s.label} onChange={e => updateLabel(i, e.target.value)}
                  placeholder={t('st_stage_ph')}
                  className="flex-1 bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-w-0" />
                <input value={s.short} onChange={e => updateShort(i, e.target.value.slice(0, 8))}
                  placeholder={t('st_short_ph')}
                  className="w-20 bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors flex-shrink-0" />
                <button type="button" onClick={() => removeStage(i)} disabled={!canDelete}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 disabled:opacity-20 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addStage}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-hairline hover:border-primary text-mute hover:text-primary rounded-lg py-2.5 text-sm font-semibold transition-colors mb-4">
          <Plus className="w-4 h-4" /> {t('st_add_stage')}
        </button>

        {stagesError && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{stagesError}</p>}
        {stagesSaved && <p className="text-badge-success text-xs bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">{t('st_stages_saved')}</p>}

        <button type="button" onClick={saveStages} disabled={stagesSaving}
          className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
          {stagesSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {stagesSaving ? t('saving') : t('st_stages_save')}
        </button>
      </div>

      {/* Subscription */}
      <BillingCard />

      {/* Payment gateway */}
      <PaymentGatewayCard />

      {/* Customer link */}
      <div className="bg-surface-bone border border-hairline rounded-lg px-5 py-4">
        <p className="text-xs font-semibold text-charcoal mb-1">{t('st_link')}</p>
        <p className="text-xs text-mute font-mono break-all">
          {typeof window !== 'undefined' ? window.location.origin : ''}/w/{workshop?.slug}
        </p>
        <p className="text-xs text-mute mt-1">{t('st_link_hint')}</p>
      </div>
    </div>
  )
}
