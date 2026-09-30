import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Quotations are owner-only (see the quotations migration). No offline copy:
// a quotation is only useful once the customer has it, which needs a connection anyway.
export function useQuotations(workshopId) {
  const [quotes, setQuotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Resolves to { data, error } even when the request itself throws (e.g. offline).
  const load = useCallback(async () => {
    if (!workshopId) return { data: [], error: null }
    try {
      return await supabase
        .from('quotations').select('*')
        .eq('workshop_id', workshopId)
        .order('created_at', { ascending: false })
    } catch (error) { return { data: null, error } }
  }, [workshopId])

  const apply = ({ data, error: err }) => {
    setError(err ? err.message : null)
    if (!err) setQuotes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let current = true
    load().then(result => { if (current) apply(result) })
    return () => { current = false }
  }, [load])

  // Retry after an error.
  const fetchQuotes = async () => {
    setLoading(true); setError(null)
    apply(await load())
  }

  const addQuote = async (fields) => {
    const { data, error: err } = await supabase
      .from('quotations').insert([{ ...fields, workshop_id: workshopId }]).select().single()
    if (err) throw err
    setQuotes(list => [data, ...list])
    return data
  }

  const updateQuote = async (id, fields) => {
    const { data, error: err } = await supabase
      .from('quotations').update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (err) throw err
    setQuotes(list => list.map(q => q.id === id ? data : q))
    return data
  }

  const deleteQuote = async (id) => {
    // .select() so an RLS block (0 rows, no error) shows up as a failure.
    const { data, error: err } = await supabase.from('quotations').delete().eq('id', id).select('id')
    if (err) throw err
    if (!data?.length) throw new Error('tiada kebenaran memadam (RLS) atau rekod tidak wujud')
    setQuotes(list => list.filter(q => q.id !== id))
  }

  return { quotes, loading, error, fetchQuotes, addQuote, updateQuote, deleteQuote }
}
