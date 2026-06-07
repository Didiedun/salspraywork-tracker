import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useWorkers(workshopId) {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!workshopId) return
    setLoading(true)
    setError(null)
    supabase.rpc('get_workshop_members', { workshop_uuid: workshopId })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setWorkers(data || [])
        setLoading(false)
      })
  }, [workshopId])

  return { workers, loading, error }
}
