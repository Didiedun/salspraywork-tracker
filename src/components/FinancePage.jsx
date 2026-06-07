import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LanguageContext'
import { useExpenses } from '../hooks/useExpenses'
import { useJobs } from '../hooks/useJobs'
import { supabase } from '../lib/supabase'
import {
  Plus, Trash2, X, Save, Download, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Receipt,
} from 'lucide-react'

const CATEGORIES = ['sewa', 'utiliti', 'alat', 'petrol', 'gaji', 'lain']

const CAT_COLORS = {
  sewa:    'bg-blue-100 text-blue-700',
  utiliti: 'bg-amber-100 text-amber-700',
  alat:    'bg-purple-100 text-purple-700',
  petrol:  'bg-orange-100 text-orange-700',
  gaji:    'bg-emerald-100 text-emerald-700',
  lain:    'bg-stone-100 text-stone-600',
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
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas transition-colors">
            <X className="w-4 h-4 text-ash" />
          </button>
        </div>
        <form onSubmit={handle} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_date')}</label>
              <input type="date" value={form.date} onChange={set('date')} className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_cat')}</label>
              <select value={form.category} onChange={set('category')} className={sel}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t(`fin_cat_${c}`)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_desc')}</label>
            <input autoFocus value={form.description} onChange={set('description')} placeholder={t('fin_expense_desc_ph')} className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1.5 block">{t('fin_expense_amount')} (RM) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mute pointer-events-none font-medium">RM</span>
              <input type="text" inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0.00"
                className="w-full bg-canvas border border-hairline rounded-full pl-12 pr-4 py-2.5 text-sm text-ink font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          {err && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</p>}
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
  const MONTHS = lang === 'ms' ? MONTH_MS : MONTH_EN

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tab,   setTab]   = useState('expenses')
  const [adding, setAdding] = useState(false)

  const { expenses, loading, error, needsMigration, fetchExpenses, addExpense, deleteExpense } = useExpenses(workshop?.id)
  const { jobs } = useJobs(workshop?.id)

  useEffect(() => { fetchExpenses(year, month) }, [fetchExpenses, year, month])

  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  const monthRevenue = useMemo(() =>
    jobs.filter(j => j.paid && (j.date_in || j.created_at || '').slice(0, 7) === monthKey)
      .reduce((s, j) => s + (Number(j.total_amount) || 0), 0),
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
        Number(j.total_amount).toFixed(2),
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
  );`

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

      {/* Migration notice */}
      {needsMigration && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t('fin_migration_title')}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t('fin_migration_sub')}</p>
            </div>
          </div>
          <pre className="bg-surface-dark text-on-dark text-xs rounded-lg p-3 overflow-x-auto leading-relaxed">{SQL_MIGRATION}</pre>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-ink text-lg">{t('nav_finance')}</h2>
        <div className="flex items-center gap-2 bg-surface-card border border-hairline rounded-full px-2 py-1">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas transition-colors text-mute hover:text-ink">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-ink min-w-[7rem] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-canvas transition-colors text-mute hover:text-ink disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* P&L summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-card border border-hairline rounded-xl p-4 text-center">
          <TrendingUp className="w-4 h-4 text-badge-success mx-auto mb-1.5" />
          <p className="font-display font-bold text-base text-badge-success">
            RM {monthRevenue.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-mute mt-0.5 font-medium">{t('fin_revenue')}</p>
        </div>
        <div className="bg-surface-card border border-hairline rounded-xl p-4 text-center">
          <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1.5" />
          <p className="font-display font-bold text-base text-red-500">
            RM {totalExpenses.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-mute mt-0.5 font-medium">{t('fin_expenses_total')}</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${isProfit ? 'bg-badge-success/5 border-badge-success/30' : 'bg-red-50 border-red-200'}`}>
          <Minus className={`w-4 h-4 mx-auto mb-1.5 ${isProfit ? 'text-badge-success' : 'text-red-500'}`} />
          <p className={`font-display font-bold text-base ${isProfit ? 'text-badge-success' : 'text-red-500'}`}>
            {isProfit ? '' : '−'}{fmt(profit)}
          </p>
          <p className={`text-xs mt-0.5 font-medium ${isProfit ? 'text-badge-success' : 'text-red-500'}`}>
            {isProfit ? t('fin_profit') : t('fin_loss')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-bone border border-hairline rounded-full p-1 w-fit">
        {[
          { key: 'expenses', label: `${t('fin_tab_expenses')} (${expenses.length})` },
          { key: 'revenue',  label: `${t('fin_tab_revenue')} (${paidJobs.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              tab === key ? 'bg-white shadow-sm text-ink' : 'text-mute hover:text-charcoal'
            }`}>{label}</button>
        ))}
      </div>

      {/* Expenses tab */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-mute font-medium">{t('fin_expenses_total')}: <span className="font-bold text-red-500">{fmt(totalExpenses)}</span></p>
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
                    <p className="text-xs text-mute mt-0.5">{exp.date}</p>
                  </div>
                  <p className="text-sm font-bold text-red-500 flex-shrink-0">−{fmt(exp.amount)}</p>
                  <button onClick={async () => {
                    if (!window.confirm(t('delete') + '?')) return
                    try { await deleteExpense(exp.id) } catch (e) { alert(e.message) }
                  }} className="w-7 h-7 flex items-center justify-center text-mute hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                    <Trash2 className="w-3 h-3" />
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
                    <p className="text-sm font-bold text-ink font-mono">{j.plate}</p>
                    <p className="text-xs text-mute truncate">{j.owner} · {j.car}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-badge-success">
                      RM {Number(j.total_amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-mute">{(j.date_in || j.created_at || '').slice(0, 10)}</p>
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
