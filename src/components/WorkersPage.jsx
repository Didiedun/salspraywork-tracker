import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { Users, RefreshCw, Copy, Check, Trash2, UserPlus, Pencil, X } from 'lucide-react'

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function WorkersPage() {
  const { workshop } = useApp()
  const { t } = useLang()

  const [workers, setWorkers]       = useState([])
  const [invites, setInvites]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [copied, setCopied]         = useState(null)
  const [generating, setGenerating] = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [editName, setEditName]     = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = async () => {
    if (!workshop) return
    setLoadError('')
    const [membersResult, invitesResult] = await Promise.all([
      supabase.rpc('get_workshop_members', { workshop_uuid: workshop.id }),
      supabase.from('workshop_invites')
        .select('*')
        .eq('workshop_id', workshop.id)
        .is('used_at', null)
        .order('created_at', { ascending: false }),
    ])
    if (membersResult.error) setLoadError(membersResult.error.message)
    setWorkers(membersResult.data || [])
    setInvites(invitesResult.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [workshop?.id])

  const generateInvite = async () => {
    setGenerating(true)
    try {
      const code = randomCode()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('workshop_invites')
        .insert([{ workshop_id: workshop.id, code, role: 'worker', expires_at: expiresAt }])
        .select().single()
      if (error) throw error
      setInvites(prev => [data, ...prev])
    } catch (err) { alert(err.message) }
    finally { setGenerating(false) }
  }

  const removeWorker = async (member) => {
    if (!window.confirm(t('wk_remove'))) return
    await supabase.from('workshop_members').delete().eq('id', member.id)
    setWorkers(prev => prev.filter(w => w.id !== member.id))
  }

  const revokeInvite = async (invite) => {
    await supabase.from('workshop_invites').delete().eq('id', invite.id)
    setInvites(prev => prev.filter(i => i.id !== invite.id))
  }

  const startEdit = (w) => { setEditingId(w.id); setEditName(w.name || '') }

  const saveWorkerName = async (workerId) => {
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('workshop_members').update({ name: editName.trim() || null }).eq('id', workerId)
      if (error) throw error
      setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, name: editName.trim() || null } : w))
      setEditingId(null)
    } catch (err) { alert(err.message) }
    finally { setSavingEdit(false) }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code); setTimeout(() => setCopied(null), 2000)
  }

  const joinUrl = (code) => `${window.location.origin}/register?invite=${code}`

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
      {/* Workers list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-ink">{t('wk_workers')}</h2>
          <span className="text-xs text-mute bg-surface-card border border-hairline px-3 py-1 rounded-full">{workers.length} {t('wk_worker_count')}</span>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-3 text-xs text-red-700 font-medium">
            Error: {loadError}
          </div>
        )}
        {loading ? (
          <div className="text-center py-8 text-mute"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : workers.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-8 text-center">
            <Users className="w-10 h-10 text-ash opacity-40 mx-auto mb-3" />
            <p className="text-charcoal font-semibold">{t('wk_no_workers')}</p>
            <p className="text-mute text-sm mt-1">{t('wk_no_workers_sub')}</p>
          </div>
        ) : (
          <div className="bg-surface-card rounded-lg border border-hairline overflow-hidden">
            {workers.map((w, i) => (
              <div key={w.id}
                className={`flex items-center gap-3 px-5 py-4 ${i < workers.length - 1 ? 'border-b border-hairline' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-surface-bone border border-hairline flex items-center justify-center flex-shrink-0">
                  <span className="text-charcoal font-bold text-sm">{(w.name || w.email || '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === w.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveWorkerName(w.id); if (e.key === 'Escape') setEditingId(null) }}
                        placeholder={w.email?.split('@')[0]}
                        className="flex-1 bg-canvas border border-hairline rounded-full px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button onClick={() => saveWorkerName(w.id)} disabled={savingEdit}
                        className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="w-7 h-7 rounded-full bg-canvas border border-hairline flex items-center justify-center flex-shrink-0 text-mute hover:text-ink">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group">
                      <p className="text-ink font-semibold text-sm">{w.name || w.email?.split('@')[0] || t('wk_no_name')}</p>
                      <button onClick={() => startEdit(w)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ash hover:text-charcoal">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-mute text-xs truncate mt-0.5">{w.email}</p>
                </div>
                <span className="text-xs bg-surface-bone border border-hairline px-2.5 py-1 rounded-full text-charcoal font-medium flex-shrink-0">
                  {w.role}
                </span>
                {editingId !== w.id && (
                  <button onClick={() => removeWorker(w)}
                    className="w-8 h-8 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite codes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-ink">{t('wk_invites')}</h2>
          <button onClick={generateInvite} disabled={generating}
            className="flex items-center gap-2 bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full px-4 py-2 text-sm transition-colors border-2 border-primary hover:border-primary-deep disabled:border-stone">
            <UserPlus className="w-3.5 h-3.5" />
            {generating ? t('wk_generating') : t('wk_gen_invite')}
          </button>
        </div>

        {invites.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-6 text-center">
            <p className="text-charcoal text-sm">{t('wk_no_invites')}</p>
            <p className="text-mute text-xs mt-1">{t('wk_no_invites_sub')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map(invite => (
              <div key={invite.id}
                className="bg-surface-card border border-hairline rounded-md px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-ink text-lg tracking-widest">{invite.code}</span>
                    <span className="text-xs text-mute bg-surface-bone px-2 py-0.5 rounded-full">{invite.role}</span>
                  </div>
                  {invite.expires_at && (
                    <p className="text-mute text-xs mt-0.5">
                      {t('wk_expires')} {new Date(invite.expires_at).toLocaleDateString('ms-MY')}
                    </p>
                  )}
                </div>
                <button onClick={() => copyCode(invite.code)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-hairline bg-canvas hover:bg-surface-bone transition-colors whitespace-nowrap">
                  {copied === invite.code
                    ? <><Check className="w-3.5 h-3.5 text-badge-success" /> {t('copied')}</>
                    : <><Copy className="w-3.5 h-3.5" /> {t('wk_copy')}</>
                  }
                </button>
                <button onClick={() => revokeInvite(invite)}
                  className="w-8 h-8 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-ash text-xs mt-3 px-1">{t('wk_invite_hint')}</p>
      </div>
    </div>
  )
}
