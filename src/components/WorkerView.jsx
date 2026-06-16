import { useState, useMemo, useEffect } from 'react'

function timeAgo(dateStr, lang) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 120)   return lang === 'ms' ? 'baru sahaja' : 'just now'
  if (diff < 3600)  { const m = Math.floor(diff / 60);   return lang === 'ms' ? `${m} minit lalu`  : `${m}m ago` }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return lang === 'ms' ? `${h} jam lalu`    : `${h}h ago` }
  const d = Math.floor(diff / 86400)
  return lang === 'ms' ? `${d} hari lalu` : `${d}d ago`
}
import { useApp } from '../context/AppContext'
import { useJobs } from '../hooks/useJobs'
import { supabase } from '../lib/supabase'
import { StageBar } from './StageBar'
import { PaymentBadge } from './StatusBadge'
import { daysIn, isStale } from '../constants'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { RefreshCw, ChevronRight, ChevronLeft, Search, LogOut, Wrench, Clock, Camera, X, Image, DoorOpen, UserCheck, Pencil, Check, AlertTriangle, Save, FileText } from 'lucide-react'
import { FeedbackWidget } from './FeedbackWidget'
import { PayslipModal } from './PayslipModal'

const MONTH_LABELS_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']

const BANKS = ['Maybank','CIMB','Public Bank','RHB','Hong Leong','AmBank','Bank Islam','BSN','Agro Bank','Lain-lain']

export function WorkerView() {
  const { workshop, signOut, leaveWorkshop, member, updateMemberName, user } = useApp()
  const { jobs, loading, fetchJobs, updateJob, addAttachment } = useJobs(workshop?.id)
  const [search, setSearch]         = useState('')
  const [advancing, setAdvancing]   = useState({})
  const [uploading, setUploading]   = useState({})
  const [lightbox, setLightbox]     = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]   = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved]   = useState(false)
  const { stages, stageMap, lastValue, nextStage, prevStage, isOverdue: checkOverdue } = useStages()
  const { t, lang } = useLang()

  // Self-service HR profile
  const [myProfile,      setMyProfile]      = useState(undefined) // undefined = checking
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm,    setProfileForm]    = useState({ ic_number: '', epf_number: '', socso_number: '', bank_name: '', bank_account: '' })
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [profileSaved,   setProfileSaved]   = useState(false)

  // My payslips (finalised runs only)
  const [payslips,        setPayslips]        = useState([])
  const [selectedPayslip, setSelectedPayslip] = useState(null)

  useEffect(() => {
    if (!user?.id || !workshop?.id) return
    supabase.from('employees')
      .select('id, ic_number, epf_number, socso_number, bank_name, bank_account')
      .eq('user_id', user.id)
      .eq('workshop_id', workshop.id)
      .maybeSingle()
      .then(({ data }) => {
        setMyProfile(data || null)
        if (data) setProfileForm({
          ic_number:    data.ic_number    || '',
          epf_number:   data.epf_number   || '',
          socso_number: data.socso_number || '',
          bank_name:    data.bank_name    || '',
          bank_account: data.bank_account || '',
        })
      })
  }, [user?.id, workshop?.id])

  // Load this worker's finalised payslips (RLS limits rows to their own entries).
  useEffect(() => {
    if (!myProfile?.id) { setPayslips([]); return }
    supabase.from('payroll_entries')
      .select('*, employee:employees(*), run:payroll_runs(*)')
      .eq('employee_id', myProfile.id)
      .then(({ data }) => {
        const finalised = (data || [])
          .filter(e => e.run?.status === 'final')
          .sort((a, b) => (b.run.year - a.run.year) || (b.run.month - a.run.month))
        setPayslips(finalised)
      })
  }, [myProfile?.id])

  const setField = (k, v) => setProfileForm(f => ({ ...f, [k]: v }))

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const payload = {
        ic_number:    profileForm.ic_number.trim()    || null,
        epf_number:   profileForm.epf_number.trim()   || null,
        socso_number: profileForm.socso_number.trim() || null,
        bank_name:    profileForm.bank_name            || null,
        bank_account: profileForm.bank_account.trim() || null,
      }
      if (myProfile) {
        const { error } = await supabase.from('employees').update(payload).eq('id', myProfile.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('employees').insert({
          ...payload,
          user_id:     user.id,
          workshop_id: workshop.id,
          name:        member?.name || user.email?.split('@')[0] || 'Pekerja',
          basic_salary: 0,
          status:      'active',
        }).select('id').single()
        if (error) throw error
        setMyProfile(data)
      }
      setShowProfileForm(false)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (e) { alert(e.message) }
    finally { setSavingProfile(false) }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) { setEditingName(false); return }
    setSavingName(true)
    try {
      await updateMemberName(nameInput.trim())
      setEditingName(false)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } finally { setSavingName(false) }
  }

  const activeJobs = useMemo(() =>
    jobs.filter(j => !j.archived && j.stage !== lastValue)
      .filter(j => {
        if (!search) return true
        const q = search.toLowerCase()
        return j.plate.toLowerCase().includes(q) ||
          j.owner.toLowerCase().includes(q) ||
          (j.car || '').toLowerCase().includes(q)
      }),
    [jobs, search, lastValue]
  )

  const advanceStage = async (job, dir) => {
    setAdvancing(a => ({ ...a, [job.id]: true }))
    try {
      const newStage = dir === 'next' ? nextStage(job.stage) : prevStage(job.stage)
      const { error } = await supabase.rpc('worker_advance_stage', { p_job_id: job.id, p_stage: newStage })
      if (error) throw error
      await fetchJobs()
    } catch (e) {
      alert('Gagal kemaskini: ' + e.message)
    } finally {
      setAdvancing(a => ({ ...a, [job.id]: false }))
    }
  }

  const uploadPhoto = async (job, file) => {
    setUploading(u => ({ ...u, [job.id]: true }))
    try {
      const ext  = file.name.split('.').pop()
      const path = `photos/${job.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
      await addAttachment(job.id, publicUrl, 'photo', '', job.stage)
    } catch (e) { alert('Gagal muat naik: ' + e.message) }
    finally { setUploading(u => ({ ...u, [job.id]: false })) }
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })
    : '-'

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-canvas border-b border-hairline sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-ink text-sm leading-tight truncate">{workshop?.name}</p>
              {editingName ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    autoFocus
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    placeholder={t('wv_name_ph')}
                    className="text-xs bg-canvas border border-hairline rounded-full px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary w-32"
                  />
                  <button onClick={handleSaveName} disabled={savingName}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setNameInput(member?.name || ''); setEditingName(true) }}
                  className="flex items-center gap-1 text-xs text-mute hover:text-charcoal group">
                  <span>{nameSaved ? t('wv_name_saved') : (member?.name || t('wv_edit_name'))}</span>
                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchJobs}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-card border border-hairline text-mute hover:text-ink transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                if (window.confirm(t('wv_leave_confirm'))) {
                  try { await leaveWorkshop() } catch { alert(t('wv_leave_error')) }
                }
              }}
              className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-full transition-colors font-semibold">
              <DoorOpen className="w-3.5 h-3.5" /> {t('wv_leave')}
            </button>
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-charcoal bg-surface-card hover:bg-surface-bone border border-hairline px-3 py-2 rounded-full transition-colors font-semibold">
              <LogOut className="w-3.5 h-3.5" /> {t('nav_logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('wv_active'),      value: jobs.filter(j => !j.archived).length,           color: 'text-primary'  },
            { label: t('wv_in_progress'), value: jobs.filter(j => !j.archived && j.stage !== lastValue && j.stage !== stages[0]?.value).length, color: 'text-amber-600' },
            { label: t('wv_done_today'),  value: jobs.filter(j => {
              if (j.stage !== lastValue) return false
              const d = new Date(j.updated_at || j.created_at)
              return d.toDateString() === new Date().toDateString()
            }).length, color: 'text-badge-success' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-card rounded-md border border-hairline p-3 text-center">
              <p className={`text-xl font-bold font-display ${color}`}>{value}</p>
              <p className="text-charcoal text-xs mt-0.5 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* HR profile banner — shown when no employee record linked */}
        {myProfile === null && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
            <button onClick={() => setShowProfileForm(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-amber-800">{t('wv_profile_title')}</p>
                  <p className="text-xs text-amber-600">{t('wv_profile_sub')}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-amber-500 transition-transform flex-shrink-0 ${showProfileForm ? 'rotate-90' : ''}`} />
            </button>
            {showProfileForm && (
              <div className="border-t border-amber-200 px-4 pb-4 pt-3 space-y-3 bg-white/60">
                <p className="text-xs text-amber-700">{t('wv_profile_hint')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_ic')}</label>
                    <input value={profileForm.ic_number} onChange={e => setField('ic_number', e.target.value)}
                      placeholder="901231-01-1234"
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_epf_no')}</label>
                    <input value={profileForm.epf_number} onChange={e => setField('epf_number', e.target.value)}
                      placeholder="KWSP no."
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_socso_no')}</label>
                    <input value={profileForm.socso_number} onChange={e => setField('socso_number', e.target.value)}
                      placeholder="PERKESO no."
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_bank')}</label>
                    <select value={profileForm.bank_name} onChange={e => setField('bank_name', e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400">
                      <option value="">— {t('pr_emp_bank_ph')} —</option>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_account')}</label>
                    <input value={profileForm.bank_account} onChange={e => setField('bank_account', e.target.value)}
                      placeholder="1234567890"
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400" />
                  </div>
                </div>
                <button onClick={saveProfile} disabled={savingProfile}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors">
                  {savingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingProfile ? t('saving') : t('wv_profile_save')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile saved confirmation */}
        {profileSaved && (
          <div className="bg-badge-success/10 border border-badge-success/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <Check className="w-4 h-4 text-badge-success" />
            <p className="text-sm font-semibold text-badge-success">{t('wv_profile_saved')}</p>
          </div>
        )}

        {/* Completed profile indicator */}
        {myProfile && myProfile.ic_number && (
          <div className="bg-surface-card border border-hairline rounded-lg px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-badge-success" />
              <p className="text-sm font-semibold text-charcoal">{t('wv_profile_complete')}</p>
            </div>
            <button onClick={() => setShowProfileForm(v => !v)}
              className="text-xs text-mute hover:text-charcoal transition-colors flex items-center gap-1">
              <Pencil className="w-3 h-3" /> {t('edit')}
            </button>
          </div>
        )}

        {/* Edit form for already-completed profile */}
        {myProfile && showProfileForm && (
          <div className="bg-surface-card border border-hairline rounded-lg px-4 pb-4 pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_ic')}</label>
                <input value={profileForm.ic_number} onChange={e => setField('ic_number', e.target.value)}
                  placeholder="901231-01-1234"
                  className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_epf_no')}</label>
                <input value={profileForm.epf_number} onChange={e => setField('epf_number', e.target.value)}
                  placeholder="KWSP no."
                  className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_socso_no')}</label>
                <input value={profileForm.socso_number} onChange={e => setField('socso_number', e.target.value)}
                  placeholder="PERKESO no."
                  className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_bank')}</label>
                <select value={profileForm.bank_name} onChange={e => setField('bank_name', e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">— {t('pr_emp_bank_ph')} —</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_account')}</label>
                <input value={profileForm.bank_account} onChange={e => setField('bank_account', e.target.value)}
                  placeholder="1234567890"
                  className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveProfile} disabled={savingProfile}
                className="flex items-center gap-2 bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors">
                {savingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {savingProfile ? t('saving') : t('save')}
              </button>
              <button onClick={() => setShowProfileForm(false)}
                className="flex items-center gap-2 bg-canvas border border-hairline text-charcoal font-semibold rounded-full px-5 py-2.5 text-sm transition-colors hover:bg-surface-bone">
                {t('no')}
              </button>
            </div>
          </div>
        )}

        {/* My payslips */}
        {payslips.length > 0 && (
          <div className="bg-surface-card border border-hairline rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-hairline flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-ink">{t('wv_payslips')}</p>
            </div>
            {payslips.map((ps, i) => (
              <button key={ps.id} onClick={() => setSelectedPayslip(ps)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas transition-colors text-left ${i < payslips.length - 1 ? 'border-b border-hairline' : ''}`}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{MONTH_LABELS_MS[ps.run.month - 1]} {ps.run.year}</p>
                  <p className="text-xs text-mute">{t('wv_net_pay')}: RM {Number(ps.net_salary).toFixed(2)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ash flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('wv_search_ph')}
            className="w-full bg-surface-card border border-hairline rounded-full pl-11 pr-5 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-mute">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
            <p>{t('loading')}</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="text-center py-16 text-ash">
            <p className="font-semibold text-charcoal">{t('wv_no_jobs')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map(job => {
              const overdue   = checkOverdue(job)
              const stale     = !overdue && isStale(job)
              const days      = daysIn(job)
              const stageIdx  = stageMap[job.stage] ?? 0
              const isFirst   = stageIdx === 0
              const isLast    = job.stage === lastValue
              const isBusy    = advancing[job.id]

              return (
                <div key={job.id}
                  className={`bg-surface-card rounded-lg border overflow-hidden ${overdue ? 'border-red-200' : stale ? 'border-amber-200' : 'border-hairline'}`}>
                  {overdue && (
                    <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-red-600 text-xs font-semibold">{t('overdue_label')} — {days} {t('overdue_days')}</p>
                    </div>
                  )}
                  {stale && (
                    <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-amber-700 text-xs font-semibold">{t('stale_label')}</p>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display font-bold text-ink text-lg tracking-tight">{job.plate}</p>
                          {days > 0 && (
                            <span className={`text-xs flex items-center gap-0.5 font-semibold ${overdue ? 'text-red-500' : stale ? 'text-amber-600' : 'text-mute'}`}>
                              <Clock className="w-3 h-3" />{days}{t('days_short')}
                            </span>
                          )}
                        </div>
                        <p className="text-charcoal text-sm">{job.car} — {job.owner}</p>
                        <p className="text-mute text-xs mt-0.5">{t('wv_date_in')} {formatDate(job.date_in || job.created_at)}</p>
                      </div>
                      <PaymentBadge job={job} />
                    </div>

                    <StageBar current={job.stage} stages={stages} />
                    {job.updated_by && (
                      <p className="text-mute text-xs mt-1.5 flex items-center gap-1 flex-wrap">
                        <UserCheck className="w-3 h-3" />
                        {t('card_updated_by')} {job.updated_by.split('@')[0]}
                        {job.updated_at && <span className="text-ash">· {timeAgo(job.updated_at, lang)}</span>}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => advanceStage(job, 'prev')}
                        disabled={isFirst || isBusy}
                        className="flex items-center gap-1 text-xs text-mute hover:text-ink disabled:opacity-30 bg-canvas hover:bg-surface-bone border border-hairline px-2.5 py-1.5 rounded-full transition-colors font-semibold">
                        <ChevronLeft className="w-3.5 h-3.5" /> {t('card_retreat')}
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-xs font-semibold text-charcoal">
                          {isBusy
                            ? <RefreshCw className="w-3 h-3 animate-spin inline" />
                            : stages[stageIdx]?.label
                          }
                        </span>
                      </div>
                      <button
                        onClick={() => advanceStage(job, 'next')}
                        disabled={isLast || isBusy}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-deep disabled:opacity-30 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-full transition-colors font-semibold">
                        {t('card_advance')} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {job.notes && (
                      <div className="mt-3 bg-canvas rounded-md px-3 py-2 border border-hairline">
                        <p className="text-charcoal text-xs">{job.notes}</p>
                      </div>
                    )}

                    {/* Photo upload */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-mute">
                        <Image className="w-3.5 h-3.5" />
                        <span>{(job.job_attachments?.filter(a => a.type === 'photo') || []).length} {t('card_photos')}</span>
                      </div>
                      <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                        uploading[job.id]
                          ? 'bg-canvas border-hairline text-ash'
                          : 'bg-canvas border-hairline text-charcoal hover:bg-surface-bone'
                      }`}>
                        <Camera className="w-3.5 h-3.5" />
                        {uploading[job.id] ? t('uploading') : t('card_add_photo')}
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          disabled={!!uploading[job.id]}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(job, f); e.target.value = '' }} />
                      </label>
                    </div>

                    {/* Photo thumbnails */}
                    {(job.job_attachments?.filter(a => a.type === 'photo') || []).length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {job.job_attachments.filter(a => a.type === 'photo').map(img => (
                          <div key={img.id} className="relative">
                            <img src={img.url} alt={img.stage}
                              className="w-full aspect-square object-cover rounded-md cursor-pointer"
                              onClick={() => setLightbox(img.url)} />
                            {img.stage && (
                              <span className="absolute bottom-0.5 left-0.5 bg-ink/60 text-white text-xs px-1 rounded truncate max-w-[90%] text-[10px]">{img.stage}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FeedbackWidget />

      {selectedPayslip && (
        <PayslipModal
          entry={selectedPayslip}
          run={selectedPayslip.run}
          workshop={workshop}
          onClose={() => setSelectedPayslip(null)}
        />
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-md" />
          <button className="absolute top-4 right-4 text-white bg-ink/60 hover:bg-ink/80 rounded-full w-10 h-10 flex items-center justify-center"
            onClick={() => setLightbox(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
