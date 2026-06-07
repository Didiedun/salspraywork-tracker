import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useWorkers(workshopId) {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!workshopId) return
    setLoading(true)
    supabase.rpc('get_workshop_members', { workshop_uuid: workshopId })
      .then(({ data }) => { setWorkers(data || []); setLoading(false) })
  }, [workshopId])

  return { workers, loading }
}
