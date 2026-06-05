import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePlatformStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [
        { count: workshops },
        { count: jobs },
        { count: paid },
        { count: attachments },
      ] = await Promise.all([
        supabase.from('workshops').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('paid', true),
        supabase.from('job_attachments').select('*', { count: 'exact', head: true }),
      ])
      setStats({
        workshops: workshops || 0,
        jobs:      jobs      || 0,
        paid:      paid      || 0,
        photos:    attachments || 0,
      })
    }
    load()
  }, [])

  return stats
}
