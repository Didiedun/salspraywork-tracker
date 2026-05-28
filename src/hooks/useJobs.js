import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'salspray_jobs'

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsSave(jobs) { localStorage.setItem(LS_KEY, JSON.stringify(jobs)) }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` }

// Strip keys that don't exist as columns yet (graceful degradation for new fields)
async function safeInsert(payload) {
  let { data, error } = await supabase.from('jobs').insert([payload]).select('*, job_attachments(*)').single()
  if (error?.message?.includes('est_completion')) {
    const { est_completion, ...rest } = payload
    ;({ data, error } = await supabase.from('jobs').insert([rest]).select('*, job_attachments(*)').single())
  }
  if (error) throw error
  return data
}

async function safeUpdate(id, payload) {
  let { data, error } = await supabase.from('jobs').update(payload).eq('id', id).select('*, job_attachments(*)').single()
  if (error?.message?.includes('est_completion')) {
    const { est_completion, ...rest } = payload
    ;({ data, error } = await supabase.from('jobs').update(rest).eq('id', id).select('*, job_attachments(*)').single())
  }
  if (error) throw error
  return data
}

export function useJobs() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [offline, setOffline] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('jobs').select('*, job_attachments(*)').order('created_at', { ascending: false })
    if (err) {
      setOffline(true); setJobs(lsLoad())
      if (err.code !== 'FETCH_ERROR') setError(err.message)
    } else {
      setOffline(false); setJobs(data || []); lsSave(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const addJob = async (jobData) => {
    if (offline) {
      const j = { ...jobData, id: uid(), created_at: new Date().toISOString(), job_attachments: [] }
      const next = [j, ...lsLoad()]; lsSave(next); setJobs(next); return j
    }
    const data = await safeInsert(jobData)
    const next = [data, ...jobs]; setJobs(next); lsSave(next); return data
  }

  const updateJob = async (id, updates) => {
    if (offline) {
      const next = lsLoad().map(j => j.id === id ? { ...j, ...updates } : j)
      lsSave(next); setJobs(next); return next.find(j => j.id === id)
    }
    const data = await safeUpdate(id, updates)
    const next = jobs.map(j => j.id === id ? data : j); setJobs(next); lsSave(next); return data
  }

  const deleteJob = async (id) => {
    if (offline) {
      const next = lsLoad().filter(j => j.id !== id); lsSave(next); setJobs(next); return
    }
    const { error: err } = await supabase.from('jobs').delete().eq('id', id)
    if (err) throw err
    const next = jobs.filter(j => j.id !== id); setJobs(next); lsSave(next)
  }

  const addAttachment = async (jobId, url, type, caption = '', stage = '') => {
    if (offline) {
      const a = { id: uid(), job_id: jobId, url, type, caption, stage, created_at: new Date().toISOString() }
      const next = lsLoad().map(j => j.id === jobId ? { ...j, job_attachments: [...(j.job_attachments||[]), a] } : j)
      lsSave(next); setJobs(next); return a
    }
    const { data, error: err } = await supabase
      .from('job_attachments').insert([{ job_id: jobId, url, type, caption, stage }]).select().single()
    if (err) throw err
    const next = jobs.map(j => j.id === jobId ? { ...j, job_attachments: [...(j.job_attachments||[]), data] } : j)
    setJobs(next); lsSave(next); return data
  }

  const deleteAttachment = async (jobId, attachmentId) => {
    if (offline) {
      const next = lsLoad().map(j => j.id === jobId
        ? { ...j, job_attachments: j.job_attachments.filter(a => a.id !== attachmentId) } : j)
      lsSave(next); setJobs(next); return
    }
    const { error: err } = await supabase.from('job_attachments').delete().eq('id', attachmentId)
    if (err) throw err
    const next = jobs.map(j => j.id === jobId
      ? { ...j, job_attachments: j.job_attachments.filter(a => a.id !== attachmentId) } : j)
    setJobs(next); lsSave(next)
  }

  return { jobs, loading, error, offline, fetchJobs, addJob, updateJob, deleteJob, addAttachment, deleteAttachment }
}
