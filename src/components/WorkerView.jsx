import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useJobs } from '../hooks/useJobs'
import { supabase } from '../lib/supabase'
import { uploadJobFile } from '../lib/storage'
import { StageBar } from './StageBar'
import { PaymentBadge } from './StatusBadge'
import { Lightbox } from './Lightbox'
import { daysIn, isStale } from '../constants'
import { useStages } from '../hooks/useStages'
import { useLang } from '../context/LanguageContext'
import { LegalBanner } from './LegalBanner'
import { useNotify } from '../context/NotifyContext'
import {
  RefreshCw, ChevronRight, ChevronLeft, Search, LogOut, Wrench, Clock, Camera, DoorOpen, UserCheck,
  Pencil, Check, X, AlertTriangle, Save, FileText, CheckCircle2, Loader, MessageSquarePlus, ShieldCheck,
} from 'lucide-react'
import { FeedbackWidget, openFeedback } from './FeedbackWidget'
import { PayslipModal } from './PayslipModal'

function timeAgo(dateStr, lang) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 120)   return lang === 'ms' ? 'baru sahaja' : 'just now'
  if (diff < 3600)  { const m = Math.floor(diff / 60);   return lang === 'ms' ? `${m} minit lalu`  : `${m}m ago` }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return lang === 'ms' ? `${h} jam lalu`    : `${h}h ago` }
  const d = Math.floor(diff / 86400)
  return lang === 'ms' ? `${d} hari lalu` : `${d}d ago`
}

const MONTH_LABELS_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']
const MONTH_LABELS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const BANKS = ['Maybank','CIMB','Public Bank','RHB','Hong Leong','AmBank','Bank Islam','BSN','Agro Bank','Lain-lain']

export function WorkerView() {
  const { workshop, signOut, leaveWorkshop, member, updateMemberName, user } = useApp()
  const { jobs, loading, fetchJobs, addAttachment } = useJobs(workshop?.id)
  const [search, setSearch]           = useState('')
  const [advancing, setAdvancing]     = useState({})
  const [uploading, setUploading]     = useState({})
  const [lightbox, setLightbox]       = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [savingName, setSavingName]   = useState(false)
  const { stages, stageMap, lastValue, nextStage, prevStage, isOverdue: checkOverdue } = useStages()
  const { t, lang } = useLang()
  const { toast, confirm } = useNotify()

  // Self-service HR profile
  const [myProfile,       setMyProfile]       = useState(undefined) // undefined = checking
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm,     setProfileForm]     = useState({ ic_number: '', epf_number: '', socso_number: '', bank_name: '', bank_account: '' })
  const [savingProfile,   setSavingProfile]   = useState(false)

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
        setMyProfile(p => ({ ...p, ...payload }))
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
        setMyProfile({ ...data, ...payload })
      }
      setShowProfileForm(false)
      toast.success(t('wv_profile_saved'))
    } catch (e) { toast.error(e.message) }
    finally { setSavingProfile(false) }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) { setEditingName(false); return }
    setSavingName(true)
    try {
      await updateMemberName(nameInput.trim())
      setEditingName(false)
      toast.success(t('wv_name_saved'))
    } catch (e) { toast.error(e.message) }
    finally { setSavingName(false) }
  }

  const leave = async () => {
    if (!(await confirm({ title: t('wv_leave_title', { name: workshop?.name || '' }), message: t('wv_leave_hint'), confirmLabel: t('wv_leave'), tone: 'danger', icon: DoorOpen }))) return
    try { await leaveWorkshop() } catch { toast.error(t('wv_leave_error')) }
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
      toast.error(`${t('update_failed')}: ${e.message}`)
    } finally {
      setAdvancing(a => ({ ...a, [job.id]: false }))
    }
  }

  const uploadPhoto = async (job, file) => {
    setUploading(u => ({ ...u, [job.id]: true }))
    try {
      await uploadJobFile(supabase.storage.from('attachments'), job, file, 'photo', addAttachment)
    } catch (e) { toast.error(`${t('upload_failed')}: ${e.message}`) }
    finally { setUploading(u => ({ ...u, [job.id]: false })) }
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString(lang === 'en' ? 'en-MY' : 'ms-MY', { day: '2-digit', month: 'short' })
    : '-'

  const months = lang === 'ms' ? MONTH_LABELS_MS : MONTH_LABELS_EN
  const inProgress = jobs.filter(j => !j.archived && j.stage !== lastValue && j.stage !== stages[0]?.value).length
  const doneToday = jobs.filter(j => {
    if (j.stage !== lastValue) return false
    const d = new Date(j.updated_at || j.created_at)
    return d.toDateString() === new Date().toDateString()
  }).length

  const fieldCls = 'w-full bg-canvas border border-hairline rounded-xl px-3 py-2.5 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const profileFields = (
    <div className="grid grid-cols-2 gap-3">
      {[
        { key: 'ic_number',    label: t('pr_emp_ic'),       ph: '901231-01-1234', wide: true },
        { key: 'epf_number',   label: t('pr_emp_epf_no'),   ph: 'KWSP no.' },
        { key: 'socso_number', label: t('pr_emp_socso_no'), ph: 'PERKESO no.' },
      ].map(f => (
        <div key={f.key} className={f.wide ? 'col-span-2 sm:col-span-1' : ''}>
          <label htmlFor={`wv-${f.key}`} className="text-xs font-semibold text-charcoal block mb-1">{f.label}</label>
          <input id={`wv-${f.key}`} value={profileForm[f.key]} onChange={e => setField(f.key, e.target.value)} placeholder={f.ph} className={fieldCls} />
        </div>
      ))}
      <div>
        <label htmlFor="wv-bank" className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_bank')}</label>
        <select id="wv-bank" value={profileForm.bank_name} onChange={e => setField('bank_name', e.target.value)} className={fieldCls}>
          <option value="">— {t('pr_emp_bank_ph')} —</option>
          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="wv-account" className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_account')}</label>
        <input id="wv-account" inputMode="numeric" value={profileForm.bank_account} onChange={e => setField('bank_account', e.target.value)} placeholder="1234567890" className={fieldCls} />
      </div>
    </div>
  )
  const profileActions = (
    <div className="flex gap-2">
      <button onClick={saveProfile} disabled={savingProfile}
        className="flex min-h-11 items-center gap-2 bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full px-5 text-sm transition-colors">
        {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {savingProfile ? t('saving') : t('wv_profile_save')}
      </button>
      {myProfile && (
        <button onClick={() => setShowProfileForm(false)}
          className="min-h-11 rounded-full border border-hairline bg-surface-card px-5 text-sm font-semibold text-charcoal hover:bg-surface-bone transition-colors">
          {t('cancel')}
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="bg-canvas/95 backdrop-blur-sm border-b border-hairline sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
              {workshop?.logo_url ? <img src={workshop.logo_url} alt="" className="w-full h-full object-cover" /> : <Wrench className="w-4 h-4 text-white" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-ink text-base leading-tight truncate">{workshop?.name}</p>
              <p className="text-xs text-mute">{t('wv_title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchJobs} aria-label={t('wv_refresh')} title={t('wv_refresh')}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-surface-card border border-hairline text-charcoal hover:text-ink transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={signOut} aria-label={t('nav_logout')}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-sm text-charcoal bg-surface-card hover:bg-surface-bone border border-hairline sm:px-4 rounded-full transition-colors font-semibold">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">{t('nav_logout')}</span>
            </button>
          </div>
        </div>
      </header>
      <LegalBanner />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-16">
        {/* Greeting — the name can always be edited, not only on hover */}
        <section>
          {editingName ? (
            <form onSubmit={e => { e.preventDefault(); handleSaveName() }} className="flex items-center gap-2">
              <label htmlFor="wv-name" className="sr-only">{t('wv_your_name')}</label>
              <input id="wv-name" autoFocus type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setEditingName(false) }} placeholder={t('wv_name_ph')} autoComplete="name"
                className="min-w-0 flex-1 bg-surface-card border border-hairline rounded-full px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <button type="submit" disabled={savingName} aria-label={t('save')}
                className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50">
                {savingName ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => setEditingName(false)} aria-label={t('cancel')}
                className="w-11 h-11 rounded-full border border-hairline bg-surface-card text-charcoal flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-ink text-3xl leading-tight">
                {member?.name ? t('wv_hello', { name: member.name }) : t('wv_hello_anon')}
              </h1>
              <button onClick={() => { setNameInput(member?.name || ''); setEditingName(true) }} aria-label={t('wv_edit_name')} title={t('wv_edit_name')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-mute hover:text-ink hover:bg-surface-bone transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-sm text-mute mt-1">{t('wv_hello_sub')}</p>
        </section>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('wv_active'),      value: jobs.filter(j => !j.archived).length, color: 'text-primary'  },
            { label: t('wv_in_progress'), value: inProgress, color: 'text-amber-700' },
            { label: t('wv_done_today'),  value: doneToday,  color: 'text-badge-success' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-card rounded-2xl border border-hairline p-3 sm:p-4">
              <p className={`text-2xl font-bold font-display leading-none ${color}`}>{value}</p>
              <p className="text-charcoal text-xs mt-1.5 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* HR profile: prompt when missing, compact status when complete */}
        {myProfile === null && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
            <button onClick={() => setShowProfileForm(v => !v)} aria-expanded={showProfileForm}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-100/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t('wv_profile_title')}</p>
                  <p className="text-xs text-amber-700">{t('wv_profile_sub')}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-amber-700 transition-transform flex-shrink-0 ${showProfileForm ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>
            {showProfileForm && (
              <div className="border-t border-amber-200 px-4 pb-4 pt-3 space-y-3 bg-surface-card">
                <p className="text-xs text-charcoal">{t('wv_profile_hint')}</p>
                {profileFields}
                {profileActions}
              </div>
            )}
          </div>
        )}
        {myProfile && (
          <div className="bg-surface-card border border-hairline rounded-2xl">
            <div className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-badge-success" aria-hidden="true" />
                <p className="text-sm font-semibold text-charcoal">{t('wv_profile_complete')}</p>
              </div>
              {!showProfileForm && (
                <button onClick={() => setShowProfileForm(true)}
                  className="flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> {t('edit')}
                </button>
              )}
            </div>
            {showProfileForm && <div className="border-t border-hairline px-4 pb-4 pt-3 space-y-3">{profileFields}{profileActions}</div>}
          </div>
        )}

        {payslips.length > 0 && (
          <section aria-labelledby="wv-payslips" className="bg-surface-card border border-hairline rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-hairline flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
              <h2 id="wv-payslips" className="text-sm font-semibold text-ink">{t('wv_payslips')}</h2>
            </div>
            {payslips.map((ps, i) => (
              <button key={ps.id} onClick={() => setSelectedPayslip(ps)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas transition-colors text-left ${i < payslips.length - 1 ? 'border-b border-hairline' : ''}`}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{months[ps.run.month - 1]} {ps.run.year}</p>
                  <p className="text-xs text-mute">{t('wv_net_pay')}: RM {Number(ps.net_salary).toFixed(2)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-mute flex-shrink-0" aria-hidden="true" />
              </button>
            ))}
          </section>
        )}

        <section aria-labelledby="wv-jobs" className="space-y-3 pt-1">
          <div className="flex items-end justify-between gap-3">
            <h2 id="wv-jobs" className="font-display font-bold text-ink text-xl">{t('wv_jobs_heading')}</h2>
            <p className="text-xs text-mute" role="status">{activeJobs.length} {t('ui_results')}</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ash w-4 h-4" aria-hidden="true" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} aria-label={t('wv_search_ph')}
              placeholder={t('wv_search_ph')} enterKeyHint="search"
              className="w-full min-h-11 bg-surface-card border border-hairline rounded-full pl-11 pr-5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
          </div>

          {loading ? (
            <div role="status" className="space-y-3">
              {[0, 1].map(i => <div key={i} aria-hidden="true" className="rounded-2xl border border-hairline bg-surface-card p-5 space-y-4">
                <div className="ui-skeleton h-6 w-1/3" /><div className="ui-skeleton h-4 w-2/3" /><div className="ui-skeleton h-11 w-full" />
              </div>)}
              <span className="sr-only">{t('loading')}</span>
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="ui-empty">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-ash opacity-40" aria-hidden="true" />
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
                const nextLabel = stages[Math.min(stageIdx + 1, stages.length - 1)]?.label
                const prevLabel = stages[Math.max(stageIdx - 1, 0)]?.label
                const photos    = job.job_attachments?.filter(a => a.type === 'photo') || []

                return (
                  <article key={job.id} aria-labelledby={`wv-job-${job.id}`}
                    className={`job-card border ${overdue ? 'border-red-200' : stale ? 'border-amber-200' : 'border-hairline'}`}>
                    {(overdue || stale) && (
                      <p className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold ${
                        overdue ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        {overdue ? `${t('overdue_label')} — ${days} ${t('overdue_days')}` : t('stale_label')}
                      </p>
                    )}
                    <div className="job-card-body">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 id={`wv-job-${job.id}`} className="plate text-xl">{job.plate}</h3>
                          <p className="text-charcoal text-sm mt-2 truncate">{job.car} · {job.owner}</p>
                          <p className="text-mute text-xs mt-0.5">{t('wv_date_in')} {formatDate(job.date_in || job.created_at)}{days > 0 && ` · ${t('card_days', { n: days })}`}</p>
                        </div>
                        <PaymentBadge job={job} />
                      </div>

                      <div className="mt-4"><StageBar current={job.stage} stages={stages} /></div>
                      {job.updated_by && (
                        <p className="text-mute text-xs mt-3 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{t('card_updated_by')} {job.updated_by.split('@')[0]}{job.updated_at && ` · ${timeAgo(job.updated_at, lang)}`}</span>
                        </p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button onClick={() => advanceStage(job, 'prev')} disabled={isFirst || isBusy}
                          aria-label={t('card_retreat_to', { stage: prevLabel })} title={t('card_retreat_to', { stage: prevLabel })}
                          className="flex min-h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-hairline bg-canvas text-charcoal transition-colors hover:bg-surface-bone disabled:opacity-40">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        {isLast ? (
                          <p className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-badge-success">
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {t('card_ready_pickup')}
                          </p>
                        ) : (
                          <button onClick={() => advanceStage(job, 'next')} disabled={isBusy}
                            className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-60">
                            {isBusy && <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />}
                            {t('card_advance_to', { stage: nextLabel })} <ChevronRight className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {job.notes && (
                        <div className="mt-3 bg-canvas rounded-xl px-3 py-2.5">
                          <p className="text-xs font-semibold text-charcoal">{t('card_notes')}</p>
                          <p className="text-sm text-body mt-0.5">{job.notes}</p>
                        </div>
                      )}

                      {photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-4 gap-1.5">
                          {photos.map(img => (
                            <button key={img.id} type="button" onClick={() => setLightbox(img)} className="relative block"
                              aria-label={`${t('card_photos_lbl')}: ${img.stage || job.plate}`}>
                              <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                              {img.stage && (
                                <span className="absolute bottom-0.5 left-0.5 bg-ink/70 text-white px-1 rounded truncate max-w-[90%] text-[10px]">{img.stage}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="job-card-actions flex border-t border-hairline">
                      <label className={`job-action cursor-pointer ${uploading[job.id] ? 'opacity-60' : ''}`}>
                        {uploading[job.id] ? <Loader className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
                        {uploading[job.id] ? t('uploading') : t('wv_take_photo')}
                        <span className="font-normal text-mute">({photos.length})</span>
                        <input type="file" accept="image/*" capture="environment" className="sr-only"
                          disabled={!!uploading[job.id]}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(job, f); e.target.value = '' }} />
                      </label>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Account: rare actions live here, out of the way of daily work */}
        <section aria-labelledby="wv-account" className="rounded-2xl border border-hairline bg-surface-card divide-y divide-hairline">
          <h2 id="wv-account" className="px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-mute">{t('wv_account')}</h2>
          <button onClick={openFeedback} className="flex w-full min-h-12 items-center gap-3 px-4 text-sm font-semibold text-charcoal hover:bg-canvas transition-colors">
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" /> {t('nav_feedback')}
          </button>
          <button onClick={signOut} className="flex w-full min-h-12 items-center gap-3 px-4 text-sm font-semibold text-charcoal hover:bg-canvas transition-colors">
            <LogOut className="w-4 h-4" aria-hidden="true" /> {t('nav_logout')}
          </button>
          <Link to="/privasi" className="flex w-full min-h-12 items-center gap-3 px-4 text-sm font-semibold text-charcoal hover:bg-canvas transition-colors">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> {t('legal_privacy')} · {t('legal_terms')}
          </Link>
          <button onClick={leave} className="flex w-full min-h-12 items-center gap-3 px-4 text-left text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors">
            <DoorOpen className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{t('wv_leave')}<span className="block text-xs font-normal text-mute">{t('wv_leave_hint')}</span></span>
          </button>
        </section>
      </main>

      <FeedbackWidget />

      {selectedPayslip && (
        <PayslipModal
          entry={selectedPayslip}
          run={selectedPayslip.run}
          workshop={workshop}
          onClose={() => setSelectedPayslip(null)}
        />
      )}

      {lightbox && <Lightbox src={lightbox.url} alt={lightbox.stage || ''} onClose={() => setLightbox(null)} />}
    </div>
  )
}
