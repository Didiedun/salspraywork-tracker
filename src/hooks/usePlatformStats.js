import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const NONE = { workshops: 0, jobs: 0, paid: 0, photos: 0 }

export function usePlatformStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    // Totals come from a function: the tables themselves are not readable when logged out.
    supabase.rpc('platform_stats').then(
      ({ data }) => setStats({ ...NONE, ...(data || {}) }),
      () => setStats(NONE),
    )
  }, [])

  return stats
}
