import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Users, RefreshCw, Copy, Check, Trash2, RefreshCcw, UserPlus } from 'lucide-react'

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function WorkersPage() {
  const { workshop } = useApp()

  const [workers, setWorkers]   = useState([])
  const [invites, setInvites]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(null)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    if (!workshop) return
    const [{ data: members }, { data: pendingInvites }] = await Promise.all([
      supabase.from('workshop_members')
        .select('*, user:user_id(email)')
        .eq('workshop_id', workshop.id),
      supabase.from('workshop_invites')
        .select('*')
        .eq('workshop_id', workshop.id)
        .is('used_at', null)
        .order('created_at', { ascending: false }),
    ])
    setWorkers(members || [])
    setInvites(pendingInvites || [])
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
    if (!window.confirm(`Keluarkan pekerja ini dari bengkel?`)) return
    await supabase.from('workshop_members').delete().eq('id', member.id)
    setWorkers(prev => prev.filter(w => w.id !== member.id))
  }

  const revokeInvite = async (invite) => {
    await supabase.from('workshop_invites').delete().eq('id', invite.id)
    setInvites(prev => prev.filter(i => i.id !== invite.id))
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
          <h2 className="font-display font-bold text-ink">Senarai Pekerja</h2>
          <span className="text-xs text-mute bg-surface-card border border-hairline px-3 py-1 rounded-full">{workers.length} pekerja</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-mute"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : workers.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-8 text-center">
            <Users className="w-10 h-10 text-ash opacity-40 mx-auto mb-3" />
            <p className="text-charcoal font-semibold">Belum ada pekerja</p>
            <p className="text-mute text-sm mt-1">Jana kod jemputan dan kongsi dengan pekerja anda.</p>
          </div>
        ) : (
          <div className="bg-surface-card rounded-lg border border-hairline overflow-hidden">
            {workers.map((w, i) => (
              <div key={w.id}
                className={`flex items-center gap-4 px-5 py-4 ${i < workers.length - 1 ? 'border-b border-hairline' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-surface-bone border border-hairline flex items-center justify-center flex-shrink-0">
                  <span className="text-charcoal font-bold text-sm">{(w.name || w.user?.email || '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-semibold text-sm">{w.name || 'Tanpa nama'}</p>
                  <p className="text-mute text-xs truncate">{w.user?.email}</p>
                </div>
                <span className="text-xs bg-surface-bone border border-hairline px-2.5 py-1 rounded-full text-charcoal font-medium">
                  {w.role}
                </span>
                <button onClick={() => removeWorker(w)}
                  className="w-8 h-8 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite codes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-ink">Jemputan Aktif</h2>
          <button onClick={generateInvite} disabled={generating}
            className="flex items-center gap-2 bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full px-4 py-2 text-sm transition-colors border-2 border-primary hover:border-primary-deep disabled:border-stone">
            <UserPlus className="w-3.5 h-3.5" />
            {generating ? 'Menjana...' : 'Jana Kod Baru'}
          </button>
        </div>

        {invites.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-6 text-center">
            <p className="text-charcoal text-sm">Tiada jemputan aktif</p>
            <p className="text-mute text-xs mt-1">Jana kod jemputan untuk kongsi dengan pekerja baru.</p>
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
                      Tamat: {new Date(invite.expires_at).toLocaleDateString('ms-MY')}
                    </p>
                  )}
                </div>
                <button onClick={() => copyCode(invite.code)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-hairline bg-canvas hover:bg-surface-bone transition-colors whitespace-nowrap">
                  {copied === invite.code
                    ? <><Check className="w-3.5 h-3.5 text-badge-success" /> Disalin</>
                    : <><Copy className="w-3.5 h-3.5" /> Salin Kod</>
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

        <p className="text-ash text-xs mt-3 px-1">
          Kongsi kod ini dengan pekerja. Mereka perlu daftar akaun dahulu, kemudian masukkan kod semasa log masuk pertama kali.
        </p>
      </div>
    </div>
  )
}
