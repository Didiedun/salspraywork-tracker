import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { ArrowRight, Key } from 'lucide-react'

function toSlug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
}

export function Onboarding() {
  const { createWorkshop, reloadWorkshop, signOut, user } = useApp()
  const { t } = useLang()
  const navigate = useNavigate()

  const [tab, setTab]               = useState('create')
  const [name, setName]             = useState('')
  const [slug, setSlug]             = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const handleNameChange = (e) => {
    setName(e.target.value)
    if (!slugEdited) setSlug(toSlug(e.target.value))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setSaving(true); setError('')
    try {
      await createWorkshop(name.trim(), slug.trim())
      navigate('/dashboard')
    } catch (err) {
      setError(err.message.includes('unique') ? t('ob_slug_dupe') : err.message)
    } finally { setSaving(false) }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setSaving(true); setError('')
    try {
      const { data: invite, error: fetchErr } = await supabase
        .from('workshop_invites')
        .select('*, workshops(*)')
        .eq('code', inviteCode.trim().toUpperCase())
        .is('used_at', null)
        .maybeSingle()
      if (fetchErr || !invite) throw new Error(t('ob_bad_code'))
      const { error: memberErr } = await supabase
        .from('workshop_members')
        .insert([{ workshop_id: invite.workshop_id, user_id: user.id, role: 'worker' }])
      if (memberErr && !memberErr.message.includes('unique')) throw memberErr
      await supabase.from('workshop_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id)
      await reloadWorkshop()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-colors'
  const btnCls   = 'w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm border-2 border-primary hover:border-primary-deep disabled:border-stone'

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="font-display font-bold text-white text-2xl">DD</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-ink">{t('ob_welcome')}</h1>
          <p className="text-mute text-sm mt-1">{t('ob_pick')}</p>
        </div>

        <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1 mb-4">
          {[['create', t('ob_create')], ['join', t('ob_join')]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError('') }}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                tab === key ? 'bg-surface-dark text-on-dark' : 'text-mute hover:text-charcoal'
              }`}>{label}</button>
          ))}
        </div>

        <div className="bg-surface-card rounded-lg border border-hairline p-6">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-charcoal text-xs font-semibold mb-1.5 block">{t('ob_name_lbl')}</label>
                <input type="text" value={name} onChange={handleNameChange} required
                  placeholder={t('ob_name_ph')}
                  className={inputCls} />
              </div>
              <div>
                <label className="text-charcoal text-xs font-semibold mb-1.5 block">{t('ob_url_lbl')}</label>
                <div className="flex items-center border border-hairline rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary bg-canvas">
                  <span className="pl-5 pr-0.5 text-ash text-sm whitespace-nowrap select-none">/w/</span>
                  <input type="text" value={slug} required
                    onChange={e => { setSlug(toSlug(e.target.value)); setSlugEdited(true) }}
                    className="flex-1 bg-transparent py-3 pr-5 text-ink text-sm focus:outline-none" />
                </div>
                <p className="text-ash text-xs mt-1.5 px-1">{t('ob_url_hint')}</p>
              </div>
              {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
              <button type="submit" disabled={saving || !name.trim() || !slug.trim()} className={btnCls}>
                {saving ? t('ob_creating') : <><span>{t('ob_open_btn')}</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <p className="text-charcoal text-sm">{t('ob_inv_sub')}</p>
              <div>
                <label className="flex items-center gap-1.5 text-charcoal text-xs font-semibold mb-1.5">
                  <Key className="w-3.5 h-3.5" /> {t('ob_inv_label')}
                </label>
                <input type="text" value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required placeholder={t('ob_inv_ph')} className={inputCls} />
              </div>
              {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
              <button type="submit" disabled={saving || !inviteCode.trim()} className={btnCls}>
                {saving ? t('ob_joining') : <><span>{t('ob_join_btn')}</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>

        <button onClick={signOut} className="mt-4 mx-auto block text-xs text-mute hover:text-charcoal">
          {t('ob_logout')}
        </button>
      </div>
    </div>
  )
}
