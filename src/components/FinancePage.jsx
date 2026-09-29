import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useNotify } from '../context/NotifyContext'
import { PageHeader } from './PageHeader'
import { useExpenses } from '../hooks/useExpenses'
import { useJobs } from '../hooks/useJobs'
import { supabase } from '../lib/supabase'
import {
  Plus, Trash2, X, Save, Download, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Receipt,
} from 'lucide-react'

const CATEGORIES = ['sewa', 'utiliti', 'alat', 'petrol', 'gaji', 'lain']

// Categories are told apart by their label; colour stays reserved for money states.
const CAT_COLORS = {
  sewa:    'bg-surface-bone text-charcoal',
  utiliti: 'bg-surface-bone text-charcoal',
  alat:    'bg-surface-bone text-charcoal',
  petrol:  'bg-surface-bone text-charcoal',
  gaji:    'bg-surface-bone text-charcoal',
  lain:    'bg-surface-bone text-charcoal',
}

const MONTH_MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']
const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function AddExpenseModal({ onSave, onClose }) {
  const { t, lang } = useLang()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ date: today, category: 'lain', description: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handle = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) { setErr(t('fin_amount_req')); return }
    setSaving(true); setErr('')
    try {
      await onSave({ date: form.date, category: form.category, description: form.description.trim() || null, amount: parseFloat(form.amount) })
      onClose()
    } catch (ex) { setErr(ex.message) }
    finally { setSaving(false) }
  }

  const inp = 'w-full bg-canvas border border-hairline rounded-full px-4 py-2.5 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm'
  const sel = 'w-full bg-canvas border border-hairline rounded-lg px-4 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center pt-16 px-0 pb-0 sm:p-4">
      <div className="bg-surface-card rounded-t-2xl sm:rounded-2xl border border-hairline w-full sm:max-w-sm flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-hairline">
          <h3 className="font-display font-bold text-ink">{t('fin_add_expense')}</h3>
          <button aria-label={t('ui_close')} onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>
        <form onSubmit={handle} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expense-date" className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_date')}</label>
              <input id="expense-date" type="date" value={form.date} onChange={set('date')} className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label htmlFor="expense-category" className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_cat')}</label>
              <select id="expense-category" value={form.category} onChange={set('category')} className={sel}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t(`fin_cat_${c}`)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="expense-description" className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_desc')}</label>
            <input id="expense-description" autoFocus value={form.description} onChange={set('description')} placeholder={t('fin_expense_desc_ph')} className={inp} />
          </div>
          <div>
            <label htmlFor="expense-amount" className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_amount')} (RM) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mute pointer-events-none font-medium">RM</span>
              <input id="expense-amount" type="text" inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0.00"
                className="w-full bg-canvas border border-hairline rounded-full pl-12 pr-4 py-2.5 text-sm text-ink font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          {err && <p className="text-red-700 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 transition-colors text-sm">
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('save')}
          </button>
        </form>
      </div>
    </div>
  )
}

export function FinancePage() {
  const { workshop } = useApp()
  const { t, lang } = useLang()
  const { toast, confirm } = useNotify()
  const MONTHS = lang === 'ms' ? MONTH_MS : MONTH_EN
  // Lists are already scoped to one month, so "15 Sep" reads faster than 2026-09-15.
  const shortDate = (iso) => {
    const [, m, d] = (iso || '').slice(0, 10).split('-').map(Number)
    return m && d ? `${d} ${MONTHS[m - 1]}` : ''
  }

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tab,   setTab]   = useState('expenses')
  const [adding, setAdding] = useState(false)

  const { expenses, loading, error, needsMigration, fetchExpenses, addExpense, deleteExpense } = useExpenses(workshop?.id)
  const { jobs } = useJobs(workshop?.id)

  useEffect(() => { fetchExpenses(year, month) }, [fetchExpenses, year, month])

  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  // Actual revenue is the discounted total (total_amount − discount).
  const jobNet = (j) => (Number(j.total_amount) || 0) - (Number(j.discount) || 0)
  const monthRevenue = useMemo(() =>
    jobs.filter(j => j.paid && (j.date_in || j.created_at || '').slice(0, 7) === monthKey)
      .reduce((s, j) => s + jobNet(j), 0),
    [jobs, monthKey]
  )
  const paidJobs = useMemo(() =>
    jobs.filter(j => j.paid && (j.date_in || j.created_at || '').slice(0, 7) === monthKey),
    [jobs, monthKey]
  )

  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const profit = monthRevenue - totalExpenses
  const isProfit = profit >= 0

  const fmt = (v) => `RM ${Math.abs(Number(v)).toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    if (ny > now.getFullYear() || (ny === now.getFullYear() && nm > now.getMonth() + 1)) return
    setYear(ny); setMonth(nm)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const exportCSV = () => {
    const rows = [
      ['Tarikh', 'Jenis', 'Kategori/Peringkat', 'Penerangan', 'Amaun (RM)'],
      ...paidJobs.map(j => [
        (j.date_in || j.created_at || '').slice(0, 10),
        'Pendapatan', j.stage || '',
        `${j.plate} — ${j.owner}`,
        jobNet(j).toFixed(2),
      ]),
      ...expenses.map(e => [
        e.date, 'Perbelanjaan', t(`fin_cat_${e.category}`),
        e.description || '',
        `-${Number(e.amount).toFixed(2)}`,
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `akaun_${monthKey}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const SQL_MIGRATION = `-- Run this once in Supabase SQL editor

-- Payment gateway columns on workshops
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_secret_key    text;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_category_code text;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_sandbox        boolean DEFAULT true;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  description text,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_expenses" ON expenses
  FOR ALL USING (
    workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())
  );

-- Online payments table (for ToyyibPay integration)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  amount_original numeric(10,2) NOT NULL,
  amount_paid numeric(10,2),
  currency text NOT NULL DEFAULT 'MYR',
  provider text NOT NULL DEFAULT 'toyyibpay',
  status text NOT NULL DEFAULT 'pending',
  gateway_ref text,
  gateway_status text,
  gateway_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_payments" ON payments
  FOR ALL USING (
    workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())
  );

-- Webhook deduplication table
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  payment_id uuid REFERENCES payments(id),
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, event_id)
);
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_manage_events" ON payment_events FOR ALL USING (true);`

  return (
    <div className="app-page">
      <PageHeader title={t('nav_finance')} description={t('ui_finance_sub')} actions={
        <div className="flex items-center gap-1 rounded-full border border-hairline bg-surface-card p-1" role="group" aria-label={t('fin_month')}>
          <button aria-label={t('ui_prev')} onClick={prevMonth} className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-canvas hover:text-ink">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[7.5rem] text-center text-sm font-semibold text-ink" aria-live="polite">{MONTHS[month - 1]} {year}</span>
          <button aria-label={t('ui_next')} onClick={nextMonth} disabled={isCurrentMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-canvas hover:text-ink disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      } />

      {/* Migration notice */}
      {needsMigration && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t('fin_migration_title')}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t('fin_migration_sub')}</p>
            </div>
          </div>
          <pre className="bg-surface-dark text-on-dark text-xs rounded-lg p-3 overflow-x-auto leading-relaxed">{SQL_MIGRATION}</pre>
        </div>
      )}

      {/* Profit & loss for the month: what came in, what went out, what's left */}
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: t('fin_revenue'),        value: fmt(monthRevenue),  tone: 'text-badge-success', Icon: TrendingUp },
          { label: t('fin_expenses_total'), value: fmt(totalExpenses), tone: 'text-red-700',       Icon: TrendingDown },
          { label: isProfit ? t('fin_profit') : t('fin_loss'), value: `${isProfit ? '' : '−'}${fmt(profit)}`, tone: isProfit ? 'text-badge-success' : 'text-red-700', Icon: Wallet,
            box: isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
        ].map(({ label, value, tone, Icon, box }) => (
          <div key={label} className={`rounded-2xl border p-3 sm:p-5 ${box || 'bg-surface-card border-hairline'}`}>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-charcoal"><Icon className={`w-3.5 h-3.5 flex-shrink-0 ${tone}`} aria-hidden="true" /> {label}</dt>
            <dd className={`mt-1.5 font-display font-bold text-base leading-tight sm:text-2xl ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="segmented" role="group" aria-label={t('nav_finance')}>
        {[
          { key: 'expenses', label: t('fin_tab_expenses'), n: expenses.length },
          { key: 'revenue',  label: t('fin_tab_revenue'),  n: paidJobs.length },
        ].map(({ key, label, n }) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}
            className={`segmented-item ${tab === key ? 'segmented-item-on' : ''}`}>
            {label} <span className="segmented-count">{n}</span>
          </button>
        ))}
      </div>

      {/* Expenses tab */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-mute font-medium">{t('fin_expenses_total')}: <span className="font-bold text-red-700">{fmt(totalExpenses)}</span></p>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 text-xs font-semibold bg-canvas border border-hairline hover:bg-surface-bone text-charcoal px-3 py-2 rounded-full transition-colors">
                <Download className="w-3.5 h-3.5" /> {t('fin_export')}
              </button>
              <button onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-primary hover:bg-primary-deep text-white px-3 py-2 rounded-full transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t('fin_add_expense')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-mute text-sm">{t('loading')}</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700">{error}</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-ash">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-charcoal">{t('fin_no_expenses')}</p>
              <p className="text-xs mt-1">{t('fin_no_expenses_sub')}</p>
            </div>
          ) : (
            <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden">
              {expenses.map((exp, i) => (
                <div key={exp.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < expenses.length - 1 ? 'border-b border-hairline' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${CAT_COLORS[exp.category] || CAT_COLORS.lain}`}>
                        {t(`fin_cat_${exp.category}`)}
                      </span>
                      {exp.description && <span className="text-sm text-ink truncate">{exp.description}</span>}
                    </div>
                    <p className="text-xs text-mute mt-0.5">{shortDate(exp.date)}</p>
                  </div>
                  <p className="text-sm font-bold text-red-700 flex-shrink-0">−{fmt(exp.amount)}</p>
                  <button onClick={async () => {
                    if (!(await confirm({ title: t('confirm_delete_title', { name: exp.description || t(`fin_cat_${exp.category}`) }), message: `${shortDate(exp.date)} · ${fmt(exp.amount)}`, confirmLabel: t('delete'), tone: 'danger' }))) return
                    try { await deleteExpense(exp.id) } catch (e) { toast.error(e.message) }
                  }} aria-label={`${t('delete')}: ${exp.description || t(`fin_cat_${exp.category}`)}`} className="w-9 h-9 -mr-1.5 flex items-center justify-center text-mute hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revenue tab */}
      {tab === 'revenue' && (
        <div className="space-y-3">
          <p className="text-xs text-mute font-medium">{t('fin_revenue')}: <span className="font-bold text-badge-success">{fmt(monthRevenue)}</span></p>
          {paidJobs.length === 0 ? (
            <div className="text-center py-12 text-ash">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-charcoal">{t('fin_no_revenue')}</p>
            </div>
          ) : (
            <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden">
              {paidJobs.map((j, i) => (
                <div key={j.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < paidJobs.length - 1 ? 'border-b border-hairline' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="plate text-[13px] mb-1">{j.plate}</p>
                    <p className="text-xs text-mute truncate">{j.owner} · {j.car}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-badge-success">
                      RM {jobNet(j).toFixed(2)}
                    </p>
                    <p className="text-xs text-mute">{shortDate(j.date_in || j.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {adding && <AddExpenseModal onSave={addExpense} onClose={() => setAdding(false)} />}
    </div>
  )
}
