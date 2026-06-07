import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { Users, RefreshCw, Copy, Check, Trash2, UserPlus, Pencil, X, Download } from 'lucide-react'

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

const rateKey = (workshopId, memberId) => `payrate_${workshopId}_${memberId}`
const getRate  = (wid, mid) => parseFloat(localStorage.getItem(rateKey(wid, mid))) || 0
const saveRate = (wid, mid, v) => localStorage.setItem(rateKey(wid, mid), v)

function PayrollTab({ workshop, workers }) {
  const { t } = useLang()
  const [month,     setMonth]   = useState(() => new Date().toISOString().slice(0, 7))
  const [jobs,      setJobs]    = useState([])
  const [loading,   setLoading] = useState(false)
  const [rates,     setRates]   = useState(() =>
    Object.fromEntries(workers.map(w => [w.id, getRate(workshop.id, w.id)]))
  )

  useEffect(() => {
    setRates(Object.fromEntries(workers.map(w => [w.id, getRate(workshop.id, w.id)])))
  }, [workers, workshop.id])

  useEffect(() => {
    if (!workshop?.id || !month) return
    setLoading(true)
    const [y, mo] = month.split('-').map(Number)
    // Fetch a 3-month window to catch jobs where date_in differs from created_at
    const bufferStart = new Date(y, mo - 2, 1).toISOString()
    const bufferEnd   = new Date(y, mo + 1, 1).toISOString()
    supabase.from('jobs')
      .select('id, plate, owner, assigned_to, total_amount, date_in, created_at')
      .eq('workshop_id', workshop.id)
      .gte('created_at', bufferStart)
      .lt('created_at', bufferEnd)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        // Attribute each job to the month it actually came in (date_in preferred)
        const inMonth = (data || []).filter(j => {
          const ref = j.date_in ? j.date_in.slice(0, 7) : j.created_at.slice(0, 7)
          return ref === month
        })
        setJobs(inMonth)
        setLoading(false)
      })
  }, [workshop?.id, month])

  const updateRate = (wid, mid, val) => {
    saveRate(wid, mid, val)
    setRates(r => ({ ...r, [mid]: parseFloat(val) || 0 }))
  }

  const workerGroups = useMemo(() => {
    const groups = {}
    workers.forEach(w => {
      const name = w.name || w.email?.split('@')[0] || '?'
      groups[name] = { worker: w, jobs: [] }
    })
    jobs.forEach(j => {
      if (j.assigned_to && groups[j.assigned_to]) {
        groups[j.assigned_to].jobs.push(j)
      }
    })
    return Object.values(groups)
  }, [workers, jobs])

  const unassigned = useMemo(() =>
    jobs.filter(j => !j.assigned_to || !workers.some(w => (w.name || w.email?.split('@')[0]) === j.assigned_to))
  , [jobs, workers])

  const grandTotal = useMemo(() =>
    workerGroups.reduce((sum, { worker, jobs: wjobs }) => sum + wjobs.length * (rates[worker.id] || 0), 0)
  , [workerGroups, rates])

  const exportPayroll = () => {
    const headers = ['Worker', 'Jobs Done', 'Rate (RM/job)', 'Total Pay (RM)']
    const rows = workerGroups.map(({ worker, jobs: wjobs }) => {
      const name = worker.name || worker.email?.split('@')[0] || '?'
      const rate = rates[worker.id] || 0
      return [name, wjobs.length, rate.toFixed(2), (wjobs.length * rate).toFixed(2)]
    })
    rows.push(['UNASSIGNED', unassigned.length, '-', '-'])
    rows.push(['GRAND TOTAL', jobs.length, '-', grandTotal.toFixed(2)])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `payroll_${month}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-charcoal">{t('wk_month')}</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-surface-card border border-hairline rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={exportPayroll}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-hairline bg-canvas hover:bg-surface-bone transition-colors whitespace-nowrap ml-auto">
          <Download className="w-3.5 h-3.5" /> {t('wk_export_pay')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-mute"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : (
        <div className="bg-surface-card border border-hairline rounded-lg overflow-hidden">
          {workerGroups.map(({ worker, jobs: wjobs }, i) => {
            const name  = worker.name || worker.email?.split('@')[0] || '?'
            const rate  = rates[worker.id] || 0
            const total = wjobs.length * rate
            return (
              <div key={worker.id} className={`px-5 py-4 ${i < workerGroups.length - 1 ? 'border-b border-hairline' : ''}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-bone border border-hairline flex items-center justify-center flex-shrink-0">
                      <span className="text-charcoal font-bold text-xs">{name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{name}</p>
                      <p className="text-xs text-mute">{wjobs.length} {t('wk_jobs_done')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-mute">{t('wk_pay_rate')}</span>
                      <div className="flex items-center border border-hairline rounded-full overflow-hidden">
                        <span className="text-xs text-mute px-2">RM</span>
                        <input
                          type="number" inputMode="decimal" min="0" step="1"
                          value={rates[worker.id] || ''}
                          onChange={e => updateRate(workshop.id, worker.id, e.target.value)}
                          placeholder="0"
                          className="w-16 bg-canvas px-2 py-1.5 text-sm text-ink focus:outline-none text-right"
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[70px]">
                      <p className="text-xs text-mute">{t('wk_pay_total')}</p>
                      <p className="text-sm font-bold text-ink">RM {total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                {wjobs.length > 0 && (
                  <div className="ml-10 space-y-1 mt-1">
                    {wjobs.map(j => (
                      <div key={j.id} className="flex items-center gap-2 text-xs text-mute">
                        <span className="font-mono font-semibold text-charcoal">{j.plate}</span>
                        <span className="truncate flex-1">{j.owner}</span>
                        <span className="flex-shrink-0">{(j.date_in || j.created_at || '').slice(0,10)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {unassigned.length > 0 && (
            <div className="px-5 py-4 border-t border-hairline bg-canvas">
              <p className="text-xs text-mute font-semibold">{t('wk_unassigned')} — {unassigned.length} {t('wk_jobs_done')}</p>
              <div className="ml-2 space-y-1 mt-1">
                {unassigned.map(j => (
                  <div key={j.id} className="flex items-center gap-2 text-xs text-mute">
                    <span className="font-mono font-semibold text-charcoal">{j.plate}</span>
                    <span className="truncate flex-1">{j.owner}</span>
                    <span className="flex-shrink-0">{(j.date_in || j.created_at || '').slice(0,10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {jobs.length === 0 && (
            <div className="px-5 py-10 text-center text-mute">
              <p className="text-sm">{t('wk_no_jobs_month')}</p>
            </div>
          )}
        </div>
      )}

      {grandTotal > 0 && (
        <div className="bg-primary rounded-lg p-4 flex items-center justify-between text-white">
          <p className="text-sm opacity-80">{t('wk_payroll_grand')}</p>
          <p className="font-display font-bold text-xl">RM {grandTotal.toFixed(2)}</p>
        </div>
      )}
    </div>
  )
}

export function WorkersPage() {
  const { workshop } = useApp()
  const { t } = useLang()
  const [tab, setTab] = useState('workers')

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

      {/* Tab toggle */}
      <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1 w-fit">
        {[
          { key: 'workers', label: t('wk_tab_workers') },
          { key: 'payroll', label: t('wk_tab_payroll') },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? 'bg-surface-dark text-on-dark' : 'text-mute hover:text-charcoal'
            }`}>{label}</button>
        ))}
      </div>

      {tab === 'payroll' ? (
        <PayrollTab workshop={workshop} workers={workers} />
      ) : (
        <>
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
                            autoFocus type="text" value={editName}
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
        </>
      )}
    </div>
  )
}
