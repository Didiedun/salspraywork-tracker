import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useEmployees } from '../hooks/useEmployees'
import { usePayroll } from '../hooks/usePayroll'
import { supabase } from '../lib/supabase'
import { calcEntry } from '../lib/payroll'
import { PayslipModal } from './PayslipModal'
import { EAFormModal } from './EAFormModal'
import {
  Users, Plus, Pencil, Trash2, Save, X, Loader, AlertTriangle,
  ChevronLeft, ChevronRight, Printer, Download, Lock, RotateCcw,
  Copy, Check, UserPlus, FileText,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (v) => `RM ${Number(v || 0).toFixed(2)}`
const fmtCompact = (v) => Number(v || 0).toFixed(2)

const MONTH_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']
const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const BANKS = ['Maybank','CIMB','Public Bank','RHB','Hong Leong','AmBank','Bank Islam','BSN','Agro Bank','Lain-lain']

const SQL = `-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  user_id text,
  name text NOT NULL,
  ic_number text,
  phone text,
  position text,
  basic_salary numeric(10,2) NOT NULL DEFAULT 0,
  epf_number text,
  socso_number text,
  bank_name text,
  bank_account text,
  is_epf boolean DEFAULT true,
  is_socso boolean DEFAULT true,
  is_eis boolean DEFAULT true,
  employment_type text DEFAULT 'full_time',
  start_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_employees" ON employees
  FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
DO $$ BEGIN
  CREATE POLICY "workers_self_profile" ON employees
    FOR ALL USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL,
  status text DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workshop_id, year, month)
);
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_payroll_runs" ON payroll_runs
  FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary numeric(10,2) DEFAULT 0,
  allowances numeric(10,2) DEFAULT 0,
  pcb numeric(10,2) DEFAULT 0,
  other_deductions numeric(10,2) DEFAULT 0,
  gross_salary numeric(10,2) DEFAULT 0,
  epf_employee numeric(10,2) DEFAULT 0,
  epf_employer numeric(10,2) DEFAULT 0,
  socso_employee numeric(10,2) DEFAULT 0,
  socso_employer numeric(10,2) DEFAULT 0,
  eis_employee numeric(10,2) DEFAULT 0,
  eis_employer numeric(10,2) DEFAULT 0,
  net_salary numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_payroll_entries" ON payroll_entries
  FOR ALL USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())));`

// ─── Employee modal ───────────────────────────────────────────────────────────
function EmployeeModal({ initial, onSave, onClose }) {
  const { t } = useLang()
  const blank = {
    name: '', ic_number: '', phone: '', position: '', basic_salary: '',
    epf_number: '', socso_number: '', bank_name: '', bank_account: '',
    is_epf: true, is_socso: true, is_eis: true,
    employment_type: 'full_time', start_date: '',
  }
  const [form, setForm]   = useState(initial ? { ...blank, ...initial } : blank)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = 'w-full bg-canvas border border-hairline rounded-lg px-3 py-2.5 text-ink text-sm placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  // Live statutory breakdown so the owner sees take-home + employer cost as they type.
  const salaryNum = Number(form.basic_salary) || 0
  const preview = calcEntry(salaryNum, 0, 0, 0, form.is_epf, form.is_socso, form.is_eis)
  const employerCost = salaryNum + preview.epf_employer + preview.socso_employer + preview.eis_employer

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t('pr_emp_name_req')); return }
    if (!form.basic_salary || Number(form.basic_salary) <= 0) { setError(t('pr_emp_salary_req')); return }
    setSaving(true); setError('')
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        basic_salary: Number(form.basic_salary),
        ic_number: form.ic_number.trim() || null,
        phone: form.phone.trim() || null,
        position: form.position.trim() || null,
        epf_number: form.epf_number.trim() || null,
        socso_number: form.socso_number.trim() || null,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account.trim() || null,
        start_date: form.start_date || null,
      })
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-10 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-hairline flex-shrink-0">
          <h3 className="font-display font-bold text-ink">{initial ? t('pr_edit_emp') : t('pr_add_emp')}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_name')} *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('pr_emp_name_ph')} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_ic')}</label>
              <input value={form.ic_number} onChange={e => set('ic_number', e.target.value)} placeholder="901231-01-1234" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_phone')}</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="012-3456789" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_position')}</label>
              <input value={form.position} onChange={e => set('position', e.target.value)} placeholder={t('pr_emp_position_ph')} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_salary')} *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-mute">RM</span>
                <input type="number" min="0" step="0.01" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)}
                  placeholder="1500.00" className={inputCls + ' pl-9'} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_epf_no')}</label>
              <input value={form.epf_number} onChange={e => set('epf_number', e.target.value)} placeholder="EPF/KWS number" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_socso_no')}</label>
              <input value={form.socso_number} onChange={e => set('socso_number', e.target.value)} placeholder="SOCSO/PERKESO number" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_bank')}</label>
              <select value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={inputCls}>
                <option value="">— {t('pr_emp_bank_ph')} —</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_account')}</label>
              <input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="1234567890" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_start')}</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">{t('pr_emp_type')}</label>
              <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className={inputCls}>
                <option value="full_time">{t('pr_emp_full')}</option>
                <option value="part_time">{t('pr_emp_part')}</option>
              </select>
            </div>
          </div>

          <div className="border-t border-hairline pt-4 space-y-2">
            <p className="text-xs font-semibold text-charcoal mb-2">{t('pr_emp_contrib')}</p>
            {[
              { key: 'is_epf',   label: `EPF/KWSP (11% + 13%)` },
              { key: 'is_socso', label: `SOCSO/PERKESO (0.5% + 1.75%)` },
              { key: 'is_eis',   label: `EIS/SIP (0.2% + 0.2%)` },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={form[key]} onChange={e => set(key, e.target.checked)} />
                  <div className={`w-8 h-4 rounded-full transition-colors ${form[key] ? 'bg-primary' : 'bg-stone'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-xs text-ink">{label}</span>
              </label>
            ))}
          </div>

          {/* Live auto-calculation preview */}
          {salaryNum > 0 && (
            <div className="border-t border-hairline pt-4">
              <p className="text-xs font-semibold text-charcoal mb-2">{t('pr_preview_title')}</p>
              <div className="bg-surface-bone rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-mute">{t('pr_basic')}</span><span className="font-semibold text-ink">{fmt(salaryNum)}</span></div>
                {preview.epf_employee > 0   && <div className="flex justify-between"><span className="text-mute">KWSP (11%)</span><span className="text-red-600">− {fmt(preview.epf_employee)}</span></div>}
                {preview.socso_employee > 0 && <div className="flex justify-between"><span className="text-mute">PERKESO (0.5%)</span><span className="text-red-600">− {fmt(preview.socso_employee)}</span></div>}
                {preview.eis_employee > 0   && <div className="flex justify-between"><span className="text-mute">EIS (0.2%)</span><span className="text-red-600">− {fmt(preview.eis_employee)}</span></div>}
                <div className="flex justify-between font-bold border-t border-hairline pt-1.5 mt-1">
                  <span className="text-charcoal">{t('pr_net')}</span><span className="text-primary">{fmt(preview.net_salary)}</span>
                </div>
                <div className="flex justify-between text-mute pt-1">
                  <span>{t('pr_employer_cost')}</span><span className="font-semibold">{fmt(employerCost)}</span>
                </div>
              </div>
              <p className="text-[10px] text-ash mt-1.5">{t('pr_preview_note')}</p>
            </div>
          )}

          {error && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-hairline flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Employees tab (unified: staff profiles + invite) ────────────────────────
function EmployeesTab({ workshopId }) {
  const { t } = useLang()
  const { employees, loading, needsMigration, addEmployee, updateEmployee, deactivateEmployee } = useEmployees(workshopId)
  const [modal,      setModal]      = useState(null)
  const [invites,    setInvites]    = useState([])
  const [generating, setGenerating] = useState(false)
  const [copied,     setCopied]     = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [salaryEdit, setSalaryEdit] = useState(null)
  const [salaryVal,  setSalaryVal]  = useState('')
  const [savingSal,  setSavingSal]  = useState(false)
  const [members,    setMembers]    = useState([])
  const [addingMem,  setAddingMem]  = useState(null) // member user_id being added

  useEffect(() => {
    if (!workshopId) return
    supabase.from('workshop_invites').select('*')
      .eq('workshop_id', workshopId).is('used_at', null).order('created_at', { ascending: false })
      .then(({ data }) => setInvites(data || []))
    // Load members with app accounts (workers only)
    supabase.from('workshop_members').select('user_id, name, role')
      .eq('workshop_id', workshopId).eq('role', 'worker')
      .then(({ data }) => setMembers(data || []))
  }, [workshopId])

  const generateInvite = async () => {
    setGenerating(true)
    try {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const exp  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase.from('workshop_invites')
        .insert([{ workshop_id: workshopId, code, role: 'worker', expires_at: exp }])
        .select().single()
      if (error) throw error
      setInvites(prev => [data, ...prev])
    } catch (e) { alert(e.message) }
    finally { setGenerating(false) }
  }

  const revokeInvite = async (id) => {
    await supabase.from('workshop_invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code); setTimeout(() => setCopied(null), 2000)
  }

  const addMemberAsEmployee = async (member) => {
    setAddingMem(member.user_id)
    try {
      await addEmployee({
        name: member.name || t('wk_no_name'),
        user_id: member.user_id,
        basic_salary: 0,
        is_epf: true, is_socso: true, is_eis: true,
        employment_type: 'full_time', status: 'active',
      })
    } catch (e) { alert(e.message) }
    finally { setAddingMem(null) }
  }

  const saveSalary = async (emp) => {
    const val = parseFloat(salaryVal)
    if (isNaN(val) || val < 0) return
    setSavingSal(true)
    try {
      await updateEmployee(emp.id, { basic_salary: val })
      setSalaryEdit(null)
    } catch (e) { alert(e.message) }
    finally { setSavingSal(false) }
  }

  if (loading) return <div className="py-12 text-center"><Loader className="w-5 h-5 animate-spin text-mute mx-auto" /></div>

  if (needsMigration) return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{t('pr_migrate_title')}</p>
          <p className="text-xs text-amber-700 mt-0.5">{t('pr_migrate_sub')}</p>
        </div>
      </div>
      <pre className="bg-surface-dark text-on-dark text-xs rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{SQL}</pre>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Invite card */}
      <div className="bg-surface-card border border-hairline rounded-lg overflow-hidden">
        <button onClick={() => setShowInvite(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-canvas transition-colors">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">{t('pr_invite_title')}</p>
              <p className="text-xs text-mute">{t('pr_invite_sub')}</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-ash transition-transform ${showInvite ? 'rotate-90' : ''}`} />
        </button>

        {showInvite && (
          <div className="border-t border-hairline px-4 pb-4 pt-3 space-y-3">
            <p className="text-xs text-mute">{t('pr_invite_how')}</p>
            <button onClick={generateInvite} disabled={generating}
              className="flex items-center gap-2 bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full px-4 py-2 text-sm transition-colors">
              {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {generating ? t('wk_generating') : t('wk_gen_invite')}
            </button>
            {invites.length > 0 && (
              <div className="space-y-2">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 bg-surface-bone rounded-lg px-3 py-2">
                    <span className="font-mono font-bold text-ink tracking-widest flex-1">{inv.code}</span>
                    {inv.expires_at && (
                      <span className="text-xs text-mute">{t('wk_expires')} {new Date(inv.expires_at).toLocaleDateString('ms-MY')}</span>
                    )}
                    <button onClick={() => copyCode(inv.code)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-hairline bg-canvas hover:bg-white transition-colors">
                      {copied === inv.code ? <><Check className="w-3 h-3 text-badge-success" /> {t('copied')}</> : <><Copy className="w-3 h-3" /> {t('copy')}</>}
                    </button>
                    <button onClick={() => revokeInvite(inv.id)}
                      className="w-7 h-7 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workers with app accounts not yet in payroll */}
      {(() => {
        const linkedIds = new Set(employees.map(e => e.user_id).filter(Boolean))
        const unlinked = members.filter(m => !linkedIds.has(m.user_id))
        if (unlinked.length === 0) return null
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-blue-200">
              <p className="text-xs font-semibold text-blue-800">{t('pr_unlinked_title')}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t('pr_unlinked_sub')}</p>
            </div>
            {unlinked.map((m, i) => (
              <div key={m.user_id}
                className={`flex items-center gap-3 px-4 py-3 ${i < unlinked.length - 1 ? 'border-b border-blue-200' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-blue-600 text-sm">{(m.name || '?')[0].toUpperCase()}</span>
                </div>
                <p className="flex-1 text-sm font-semibold text-ink">{m.name || t('wk_no_name')}</p>
                <button onClick={() => addMemberAsEmployee(m)} disabled={addingMem === m.user_id}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-stone text-white transition-colors flex-shrink-0">
                  {addingMem === m.user_id ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {t('pr_add_to_payroll')}
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Staff list */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-mute">{employees.length} {t('pr_emp_count')}</p>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-surface-card hover:bg-canvas border border-hairline text-charcoal font-semibold rounded-full px-3 py-1.5 text-sm transition-colors">
          <Plus className="w-3.5 h-3.5" /> {t('pr_add_manual')}
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="bg-surface-card border border-hairline rounded-lg p-10 text-center">
          <Users className="w-10 h-10 text-ash opacity-30 mx-auto mb-3" />
          <p className="text-charcoal font-semibold">{t('pr_no_emp')}</p>
          <p className="text-mute text-sm mt-1">{t('pr_no_emp_sub')}</p>
        </div>
      ) : (
        <div className="bg-surface-card rounded-lg border border-hairline overflow-hidden">
          {employees.map((emp, i) => {
            const noSalary = !Number(emp.basic_salary)
            return (
              <div key={emp.id}
                className={`px-4 py-3.5 ${i < employees.length - 1 ? 'border-b border-hairline' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-primary text-sm">{emp.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-ink text-sm">{emp.name}</p>
                      {emp.user_id && (
                        <span className="text-[10px] bg-primary/8 text-primary px-1.5 py-0.5 rounded-full font-bold">
                          {t('pr_has_account')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-mute truncate">{emp.position || '—'}</p>
                  </div>

                  {salaryEdit === emp.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-mute">RM</span>
                        <input autoFocus type="number" min="0" step="0.01" value={salaryVal}
                          onChange={e => setSalaryVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveSalary(emp); if (e.key === 'Escape') setSalaryEdit(null) }}
                          className="w-28 pl-8 pr-2 py-1.5 text-sm border border-primary rounded-full focus:outline-none" />
                      </div>
                      <button onClick={() => saveSalary(emp)} disabled={savingSal}
                        className="w-7 h-7 rounded-full bg-primary flex items-center justify-center disabled:opacity-50">
                        {savingSal ? <Loader className="w-3 h-3 text-white animate-spin" /> : <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <button onClick={() => setSalaryEdit(null)}
                        className="w-7 h-7 rounded-full border border-hairline flex items-center justify-center text-mute hover:text-ink">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setSalaryEdit(emp.id); setSalaryVal(emp.basic_salary || '') }}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border flex-shrink-0 transition-colors ${
                        noSalary
                          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-hairline bg-canvas text-charcoal hover:bg-surface-bone'
                      }`}>
                      {noSalary ? t('pr_set_salary') : fmt(emp.basic_salary)}
                    </button>
                  )}

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setModal(emp)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas text-ash hover:text-charcoal transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm(t('pr_emp_del_confirm'))) deactivateEmployee(emp.id) }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-ash hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!salaryEdit && (
                  <div className="flex gap-1.5 mt-2 pl-12">
                    {emp.is_epf   && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">EPF</span>}
                    {emp.is_socso && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">SOCSO</span>}
                    {emp.is_eis   && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">EIS</span>}
                    {noSalary     && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">⚠ {t('pr_salary_needed')}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal === 'add' && <EmployeeModal onSave={addEmployee} onClose={() => setModal(null)} />}
      {modal && modal !== 'add' && (
        <EmployeeModal initial={modal} onSave={(data) => updateEmployee(modal.id, data)} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Payroll tab ──────────────────────────────────────────────────────────────
function PayrollTab({ workshopId }) {
  const { t, lang } = useLang()
  const { workshop } = useApp()
  const months = lang === 'ms' ? MONTH_MS : MONTH_EN

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { employees, loading: empLoading, needsMigration } = useEmployees(workshopId)
  const { run, entries, loading: runLoading, processRun, updateEntry, finaliseRun, deleteRun } = usePayroll(workshopId, year, month)

  const [processing,  setProcessing]  = useState(false)
  const [finalising,  setFinalising]  = useState(false)
  const [payslip,     setPayslip]     = useState(null)
  const [showEA,      setShowEA]      = useState(false)
  const [editingId,   setEditingId]   = useState(null)
  const [editVals,    setEditVals]    = useState({})
  const [savingEntry, setSavingEntry] = useState(false)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const nextY = month === 12 ? year + 1 : year
    const nextM = month === 12 ? 1 : month + 1
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return
    setYear(nextY); setMonth(nextM)
  }

  const handleProcess = async () => {
    if (employees.length === 0) { alert(t('pr_no_emp')); return }
    setProcessing(true)
    try { await processRun(employees) } catch (e) { alert(e.message) }
    finally { setProcessing(false) }
  }

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditVals({ allowances: entry.allowances, pcb: entry.pcb, other_deductions: entry.other_deductions })
  }

  const saveEdit = async (entryId) => {
    setSavingEntry(true)
    try {
      await updateEntry(entryId, {
        allowances: Number(editVals.allowances) || 0,
        pcb: Number(editVals.pcb) || 0,
        other_deductions: Number(editVals.other_deductions) || 0,
      })
      setEditingId(null)
    } catch (e) { alert(e.message) }
    finally { setSavingEntry(false) }
  }

  const handleFinalise = async () => {
    if (!window.confirm(t('pr_finalise_confirm'))) return
    setFinalising(true)
    try { await finaliseRun() } catch (e) { alert(e.message) }
    finally { setFinalising(false) }
  }

  const exportKWSP = () => {
    const header = ['No', 'Nama Pekerja', 'No IC', 'No KWSP', 'Gaji Kasar', 'Caruman Pekerja (11%)', 'Caruman Majikan', 'Jumlah']
    const rows = entries.map((e, i) => [
      i + 1,
      e.employee.name,
      e.employee.ic_number || '',
      e.employee.epf_number || '',
      fmtCompact(e.gross_salary),
      fmtCompact(e.epf_employee),
      fmtCompact(e.epf_employer),
      fmtCompact(Number(e.epf_employee) + Number(e.epf_employer)),
    ])
    const total = ['', 'JUMLAH', '', '',
      fmtCompact(entries.reduce((s, e) => s + Number(e.gross_salary), 0)),
      fmtCompact(entries.reduce((s, e) => s + Number(e.epf_employee), 0)),
      fmtCompact(entries.reduce((s, e) => s + Number(e.epf_employer), 0)),
      fmtCompact(entries.reduce((s, e) => s + Number(e.epf_employee) + Number(e.epf_employer), 0)),
    ]
    const csv = [header, ...rows, total].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `KWSP_${year}_${String(month).padStart(2, '0')}_${workshop?.name || 'bengkel'}.csv`
    a.click()
  }

  const exportPERKESO = () => {
    const header = ['No', 'Nama Pekerja', 'No IC', 'No PERKESO', 'Gaji Boleh Insurans', 'Caruman Pekerja (0.5%)', 'Caruman Majikan (1.75%)', 'EIS Pekerja (0.2%)', 'EIS Majikan (0.2%)']
    const rows = entries.map((e, i) => [
      i + 1,
      e.employee.name,
      e.employee.ic_number || '',
      e.employee.socso_number || '',
      fmtCompact(Math.min(Number(e.gross_salary), 6000)),
      fmtCompact(e.socso_employee),
      fmtCompact(e.socso_employer),
      fmtCompact(e.eis_employee),
      fmtCompact(e.eis_employer),
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `PERKESO_${year}_${String(month).padStart(2, '0')}_${workshop?.name || 'bengkel'}.csv`
    a.click()
  }

  const loading = empLoading || runLoading

  if (needsMigration) return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{t('pr_migrate_title')}</p>
          <p className="text-xs text-amber-700 mt-0.5">{t('pr_migrate_sub')}</p>
        </div>
      </div>
      <pre className="bg-surface-dark text-on-dark text-xs rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">{SQL}</pre>
    </div>
  )

  const isFinal = run?.status === 'final'
  const totalGross = entries.reduce((s, e) => s + Number(e.gross_salary), 0)
  const totalNet   = entries.reduce((s, e) => s + Number(e.net_salary), 0)
  const totalEPF   = entries.reduce((s, e) => s + Number(e.epf_employee) + Number(e.epf_employer), 0)
  const totalSOCSO = entries.reduce((s, e) => s + Number(e.socso_employee) + Number(e.socso_employer), 0)
  const totalEIS   = entries.reduce((s, e) => s + Number(e.eis_employee) + Number(e.eis_employer), 0)

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full border border-hairline hover:bg-canvas transition-colors">
          <ChevronLeft className="w-4 h-4 text-charcoal" />
        </button>
        <p className="font-display font-bold text-ink text-lg min-w-[140px] text-center">
          {months[month - 1]} {year}
        </p>
        <button onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-hairline hover:bg-canvas transition-colors disabled:opacity-30"
          disabled={year === now.getFullYear() && month === now.getMonth() + 1}>
          <ChevronRight className="w-4 h-4 text-charcoal" />
        </button>
        {isFinal && <span className="text-xs bg-badge-success/10 text-badge-success font-bold px-2.5 py-1 rounded-full">{t('pr_finalised')}</span>}
        <button onClick={() => setShowEA(true)}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-surface-card border border-hairline text-charcoal px-3 py-2 rounded-full hover:bg-canvas transition-colors">
          <FileText className="w-3.5 h-3.5" /> {t('pr_ea_btn')} {year}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader className="w-5 h-5 animate-spin text-mute mx-auto" /></div>
      ) : !run ? (
        <div className="bg-surface-card border border-hairline rounded-lg p-10 text-center space-y-4">
          <p className="text-charcoal font-semibold">{t('pr_no_run')}</p>
          <p className="text-mute text-sm">{t('pr_no_run_sub', { n: employees.length })}</p>
          <button onClick={handleProcess} disabled={processing || employees.length === 0}
            className="bg-primary hover:bg-primary-deep disabled:bg-stone text-white font-semibold rounded-full px-6 py-3 text-sm flex items-center gap-2 mx-auto transition-colors">
            {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {processing ? t('pr_processing') : t('pr_process')}
          </button>
          {employees.length === 0 && <p className="text-xs text-amber-600">{t('pr_add_emp_first')}</p>}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('pr_total_gross'), value: totalGross, cls: 'text-ink' },
              { label: t('pr_total_net'),   value: totalNet,   cls: 'text-primary' },
              { label: 'EPF (E+M)',          value: totalEPF,   cls: 'text-blue-600' },
              { label: 'SOCSO + EIS',        value: totalSOCSO + totalEIS, cls: 'text-emerald-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-surface-card border border-hairline rounded-lg p-3">
                <p className="text-xs text-mute">{label}</p>
                <p className={`font-display font-bold text-base mt-0.5 ${cls}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Entries — table on desktop, stacked cards on phones */}
          <div className="hidden sm:block bg-surface-card border border-hairline rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-bone border-b border-hairline text-charcoal font-semibold">
                    <th className="text-left px-4 py-3 whitespace-nowrap">{t('pr_emp_name')}</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">{t('pr_basic')}</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">{t('pr_allowances')}</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">{t('pr_gross')}</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">EPF (P)</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">EPF (M)</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">SOCSO</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">EIS</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap">PCB</th>
                    <th className="text-right px-3 py-3 whitespace-nowrap font-bold">{t('pr_net')}</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-hairline last:border-0 hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                        {entry.employee.name}
                        {entry.employee.position && <span className="block text-mute font-normal">{entry.employee.position}</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-charcoal">{fmtCompact(entry.basic_salary)}</td>
                      <td className="px-3 py-3 text-right">
                        {editingId === entry.id ? (
                          <input type="number" min="0" step="0.01" value={editVals.allowances}
                            onChange={e => setEditVals(v => ({ ...v, allowances: e.target.value }))}
                            className="w-20 text-right border border-primary rounded px-1.5 py-1 text-xs focus:outline-none" />
                        ) : (
                          <span className="text-charcoal">{fmtCompact(entry.allowances)}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{fmtCompact(entry.gross_salary)}</td>
                      <td className="px-3 py-3 text-right text-red-600">{fmtCompact(entry.epf_employee)}</td>
                      <td className="px-3 py-3 text-right text-blue-600">{fmtCompact(entry.epf_employer)}</td>
                      <td className="px-3 py-3 text-right text-mute">
                        {fmtCompact(entry.socso_employee)} / {fmtCompact(entry.socso_employer)}
                      </td>
                      <td className="px-3 py-3 text-right text-mute">
                        {fmtCompact(entry.eis_employee)} / {fmtCompact(entry.eis_employer)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {editingId === entry.id ? (
                          <input type="number" min="0" step="0.01" value={editVals.pcb}
                            onChange={e => setEditVals(v => ({ ...v, pcb: e.target.value }))}
                            className="w-20 text-right border border-primary rounded px-1.5 py-1 text-xs focus:outline-none" />
                        ) : (
                          <span className="text-charcoal">{fmtCompact(entry.pcb)}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-primary">{fmtCompact(entry.net_salary)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {!isFinal && (
                            editingId === entry.id ? (
                              <>
                                <button onClick={() => saveEdit(entry.id)} disabled={savingEntry}
                                  className="w-6 h-6 flex items-center justify-center rounded bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
                                  {savingEntry ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                </button>
                                <button onClick={() => setEditingId(null)}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-canvas text-ash transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => startEdit(entry)}
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-canvas text-ash hover:text-charcoal transition-colors">
                                <Pencil className="w-3 h-3" />
                              </button>
                            )
                          )}
                          <button onClick={() => setPayslip(entry)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-canvas text-ash hover:text-primary transition-colors" title="Slip Gaji">
                            <Printer className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards (same data + edit controls as the table) */}
          <div className="sm:hidden space-y-2.5">
            {entries.map((entry) => {
              const editing = editingId === entry.id
              const editInput = 'w-24 text-right border border-primary rounded px-2 py-1 text-xs focus:outline-none'
              const figure = (label, value, cls = 'text-charcoal') => (
                <div className="flex justify-between gap-2">
                  <span className="text-mute">{label}</span>
                  <span className={cls}>{value}</span>
                </div>
              )
              return (
                <div key={entry.id} className="bg-surface-card border border-hairline rounded-lg p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{entry.employee.name}</p>
                      {entry.employee.position && <p className="text-xs text-mute truncate">{entry.employee.position}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-mute uppercase tracking-wide">{t('pr_net')}</p>
                      <p className="font-display font-bold text-primary text-lg leading-tight">{fmt(entry.net_salary)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
                    {figure(t('pr_basic'), fmtCompact(entry.basic_salary))}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-mute">{t('pr_allowances')}</span>
                      {editing ? (
                        <input type="number" min="0" step="0.01" value={editVals.allowances}
                          onChange={e => setEditVals(v => ({ ...v, allowances: e.target.value }))} className={editInput} />
                      ) : <span className="text-charcoal">{fmtCompact(entry.allowances)}</span>}
                    </div>
                    {figure(t('pr_gross'), fmtCompact(entry.gross_salary))}
                    {figure('EPF (P)', fmtCompact(entry.epf_employee), 'text-red-600')}
                    {figure('EPF (M)', fmtCompact(entry.epf_employer), 'text-blue-600')}
                    {figure('SOCSO', `${fmtCompact(entry.socso_employee)} / ${fmtCompact(entry.socso_employer)}`, 'text-mute')}
                    {figure('EIS', `${fmtCompact(entry.eis_employee)} / ${fmtCompact(entry.eis_employer)}`, 'text-mute')}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-mute">PCB</span>
                      {editing ? (
                        <input type="number" min="0" step="0.01" value={editVals.pcb}
                          onChange={e => setEditVals(v => ({ ...v, pcb: e.target.value }))} className={editInput} />
                      ) : <span className="text-charcoal">{fmtCompact(entry.pcb)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-hairline">
                    {!isFinal && (editing ? (
                      <>
                        <button onClick={() => saveEdit(entry.id)} disabled={savingEntry}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
                          {savingEntry ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} {t('save')}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-hairline text-charcoal hover:bg-canvas transition-colors">
                          {t('no')}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(entry)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-hairline text-charcoal hover:bg-canvas transition-colors">
                        <Pencil className="w-3 h-3" /> {t('edit')}
                      </button>
                    ))}
                    <button onClick={() => setPayslip(entry)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-hairline text-charcoal hover:bg-surface-bone transition-colors">
                      <Printer className="w-3 h-3" /> Slip
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={exportKWSP}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full px-4 py-2.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> {t('pr_export_kwsp')}
            </button>
            <button onClick={exportPERKESO}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full px-4 py-2.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> {t('pr_export_perkeso')}
            </button>
            {!isFinal && (
              <>
                <button onClick={handleFinalise} disabled={finalising}
                  className="flex items-center gap-1.5 bg-ink hover:bg-charcoal text-white text-xs font-semibold rounded-full px-4 py-2.5 transition-colors disabled:opacity-50 ml-auto">
                  {finalising ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  {t('pr_finalise')}
                </button>
                <button onClick={() => { if (window.confirm(t('pr_del_confirm'))) deleteRun() }}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-full px-4 py-2.5 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> {t('pr_reset')}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {payslip && (
        <PayslipModal
          entry={payslip}
          run={run}
          workshop={workshop}
          onClose={() => setPayslip(null)}
        />
      )}

      {showEA && (
        <EAFormModal
          workshopId={workshopId}
          workshop={workshop}
          year={year}
          onClose={() => setShowEA(false)}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function PayrollPage() {
  const { workshop } = useApp()
  const { t } = useLang()
  const [tab, setTab] = useState('employees')

  const tabCls = (key) =>
    `px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
      tab === key ? 'bg-primary text-white' : 'text-charcoal hover:bg-canvas'
    }`

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <h1 className="font-display font-bold text-ink text-xl">{t('pr_title')}</h1>
      </div>

      <div className="flex gap-1 bg-surface-bone rounded-full p-1 w-fit">
        <button onClick={() => setTab('employees')} className={tabCls('employees')}>{t('pr_tab_emp')}</button>
        <button onClick={() => setTab('payroll')}   className={tabCls('payroll')}>{t('pr_tab_pay')}</button>
      </div>

      {tab === 'employees' && <EmployeesTab workshopId={workshop?.id} />}
      {tab === 'payroll'   && <PayrollTab   workshopId={workshop?.id} />}
    </div>
  )
}
