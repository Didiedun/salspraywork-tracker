import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcEntry } from '../lib/payroll'

export function usePayroll(workshopId, year, month) {
  const [run,     setRun]     = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!workshopId || !year || !month) return
    setLoading(true)
    const { data: runData } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()
    setRun(runData || null)
    if (runData) {
      const { data } = await supabase
        .from('payroll_entries')
        .select('*, employee:employees(*)')
        .eq('payroll_run_id', runData.id)
        .order('created_at')
      setEntries(data || [])
    } else {
      setEntries([])
    }
    setLoading(false)
  }, [workshopId, year, month])

  useEffect(() => { fetch() }, [fetch])

  const processRun = async (employees) => {
    const { data: newRun, error: runErr } = await supabase
      .from('payroll_runs')
      .insert({ workshop_id: workshopId, year, month, status: 'draft' })
      .select().single()
    if (runErr) throw runErr

    const rows = employees.map(emp => {
      const calc = calcEntry(
        Number(emp.basic_salary), 0, 0, 0,
        emp.is_epf !== false, emp.is_socso !== false, emp.is_eis !== false
      )
      return {
        payroll_run_id: newRun.id,
        employee_id: emp.id,
        basic_salary: Number(emp.basic_salary),
        allowances: 0,
        pcb: 0,
        other_deductions: 0,
        ...calc,
      }
    })

    const { data: newEntries, error: entryErr } = await supabase
      .from('payroll_entries')
      .insert(rows)
      .select('*, employee:employees(*)')
    if (entryErr) throw entryErr

    setRun(newRun)
    setEntries(newEntries || [])
  }

  const updateEntry = async (entryId, patch) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    const emp = entry.employee
    const basic      = 'basic_salary'     in patch ? Number(patch.basic_salary)     : Number(entry.basic_salary)
    const allowances = 'allowances'       in patch ? Number(patch.allowances)       : Number(entry.allowances)
    const pcb        = 'pcb'              in patch ? Number(patch.pcb)              : Number(entry.pcb)
    const otherDed   = 'other_deductions' in patch ? Number(patch.other_deductions) : Number(entry.other_deductions)
    const calc = calcEntry(basic, allowances, pcb, otherDed,
      emp.is_epf !== false, emp.is_socso !== false, emp.is_eis !== false)
    const full = { basic_salary: basic, allowances, pcb, other_deductions: otherDed, ...calc }
    const { data, error } = await supabase
      .from('payroll_entries').update(full).eq('id', entryId).select('*, employee:employees(*)').single()
    if (error) throw error
    setEntries(prev => prev.map(e => e.id === entryId ? data : e))
  }

  const finaliseRun = async () => {
    const { data, error } = await supabase
      .from('payroll_runs').update({ status: 'final' }).eq('id', run.id).select().single()
    if (error) throw error
    setRun(data)
  }

  const deleteRun = async () => {
    if (!run) return
    const { error } = await supabase.from('payroll_runs').delete().eq('id', run.id)
    if (error) throw error
    setRun(null); setEntries([])
  }

  return { run, entries, loading, processRun, updateEntry, finaliseRun, deleteRun, refetch: fetch }
}
