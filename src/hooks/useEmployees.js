import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEmployees(workshopId) {
  const [employees,      setEmployees]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)

  const fetch = useCallback(async () => {
    if (!workshopId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('status', 'active')
      .order('name')
    // 42P01 = Postgres "relation does not exist"; PGRST205 = PostgREST "table not
    // found in schema cache" (what Supabase actually returns for a missing table).
    if (error?.code === '42P01' || error?.code === 'PGRST205') { setNeedsMigration(true); setLoading(false); return }
    setEmployees(data || [])
    setLoading(false)
  }, [workshopId])

  useEffect(() => { fetch() }, [fetch])

  const addEmployee = async (emp) => {
    const { data, error } = await supabase
      .from('employees')
      .insert({ ...emp, workshop_id: workshopId })
      .select().single()
    if (error) throw error
    setEmployees(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  const updateEmployee = async (id, updates) => {
    const { data, error } = await supabase
      .from('employees').update(updates).eq('id', id).select().single()
    if (error) throw error
    setEmployees(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deactivateEmployee = async (id) => {
    const { error } = await supabase
      .from('employees').update({ status: 'inactive' }).eq('id', id)
    if (error) throw error
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  return { employees, loading, needsMigration, addEmployee, updateEmployee, deactivateEmployee, refetch: fetch }
}
