import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useExpenses(workshopId) {
  const [expenses,       setExpenses]       = useState([])
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [needsMigration, setNeedsMigration] = useState(false)

  const fetchExpenses = useCallback(async (year, month) => {
    if (!workshopId) return
    setLoading(true); setError(null)
    const pad      = (n) => String(n).padStart(2, '0')
    const from     = `${year}-${pad(month)}-01`
    const lastDay  = new Date(year, month, 0).getDate()
    const to       = `${year}-${pad(month)}-${lastDay}`
    const { data, error: err } = await supabase
      .from('expenses')
      .select('*')
      .eq('workshop_id', workshopId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    if (err) {
      // 42P01 = table does not exist
      if (err.code === '42P01' || err.message?.toLowerCase().includes('relation')) {
        setNeedsMigration(true)
      } else {
        setError(err.message)
      }
      setExpenses([])
    } else {
      setNeedsMigration(false)
      setExpenses(data || [])
    }
    setLoading(false)
  }, [workshopId])

  const addExpense = async (expense) => {
    const { data, error: err } = await supabase
      .from('expenses')
      .insert([{ ...expense, workshop_id: workshopId }])
      .select().single()
    if (err) throw err
    setExpenses(prev => [data, ...prev])
    return data
  }

  const deleteExpense = async (id) => {
    const { error: err } = await supabase.from('expenses').delete().eq('id', id)
    if (err) throw err
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return { expenses, loading, error, needsMigration, fetchExpenses, addExpense, deleteExpense }
}
