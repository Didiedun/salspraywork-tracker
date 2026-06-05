import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { SPRAY_STAGES } from '../constants'
import { Settings, Upload, Save, Loader, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

export function WorkshopSettings() {
  const { workshop, reloadWorkshop } = useApp()
  const { t } = useLang()

  const [name, setName]           = useState(workshop?.name  || '')
  const [phone, setPhone]         = useState(workshop?.phone || '')
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
        .update({ name: name.trim(), phone: phone.trim() })
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
