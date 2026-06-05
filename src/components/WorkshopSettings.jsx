import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Settings, Upload, Save, Loader } from 'lucide-react'

export function WorkshopSettings() {
  const { workshop, reloadWorkshop } = useApp()

  const [name, setName]   = useState(workshop?.name  || '')
  const [phone, setPhone] = useState(workshop?.phone || '')
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')
  const fileRef = useRef(null)

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Saiz fail melebihi 2MB.'); return }
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

  const inputCls = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary" />
        </div>
        <h1 className="font-display font-bold text-ink text-xl">Tetapan Bengkel</h1>
      </div>

      {/* Logo */}
      <div className="bg-surface-card border border-hairline rounded-lg p-5 mb-4">
        <h2 className="font-semibold text-ink text-sm mb-4">Logo Bengkel</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden border border-hairline">
            {workshop?.logo_url
              ? <img src={workshop.logo_url} alt="logo" className="w-full h-full object-cover" />
              : <span className="font-display font-bold text-white text-2xl">
                  {workshop?.name?.[0]?.toUpperCase() || 'S'}
                </span>
            }
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 bg-surface-bone hover:bg-canvas border border-hairline text-charcoal font-semibold rounded-full px-4 py-2 text-sm transition-colors disabled:opacity-50">
              {uploading
                ? <Loader className="w-4 h-4 animate-spin" />
                : <Upload className="w-4 h-4" />}
              {uploading ? 'Memuat naik...' : 'Muat Naik Logo'}
            </button>
            <p className="text-xs text-mute mt-1.5">JPG, PNG atau WebP. Maks 2MB.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
        {workshop?.logo_url && (
          <p className="text-xs text-badge-success mt-3">✓ Logo dipaparkan pada portal pelanggan dan resit.</p>
        )}
      </div>

      {/* Details form */}
      <form onSubmit={handleSave} className="bg-surface-card border border-hairline rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-ink text-sm">Maklumat Bengkel</h2>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">Nama Bengkel</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            placeholder="cth: Salspray Legacy" className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-charcoal block mb-1.5">No. Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="cth: 012-3456789" className={inputCls} />
        </div>

        {error && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        )}
        {saved && (
          <p className="text-badge-success text-xs bg-green-50 border border-green-200 rounded-md px-3 py-2">
            Tetapan disimpan berjaya!
          </p>
        )}

        <button type="submit" disabled={saving || !name.trim()}
          className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      {/* Customer link */}
      <div className="bg-surface-bone border border-hairline rounded-lg px-5 py-4 mt-4">
        <p className="text-xs font-semibold text-charcoal mb-1">Link Status Pelanggan</p>
        <p className="text-xs text-mute font-mono break-all">
          {typeof window !== 'undefined' ? window.location.origin : ''}/w/{workshop?.slug}
        </p>
        <p className="text-xs text-mute mt-1">Kongsi link ini supaya pelanggan boleh semak status kenderaan sendiri.</p>
      </div>
    </div>
  )
}
