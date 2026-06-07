import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const lsKey = (wid) => `jobs_${wid}`
function lsLoad(wid) {
  try { return JSON.parse(localStorage.getItem(lsKey(wid)) || '[]') } catch { return [] }
}
function lsSave(wid, jobs) { localStorage.setItem(lsKey(wid), JSON.stringify(jobs)) }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` }

async function deductStockForServices(services) {
  if (!services?.length) return services
  const result = services.map(s => ({ ...s }))
  for (const svc of result) {
    if (!svc.inventory_item_id) continue
    const newTotal = (parseFloat(svc.qty) || 1) * (parseFloat(svc.qty_per_service) || 1)
    // already = what was previously deducted from stock for this line
    const already = svc.qty_deducted != null
      ? parseFloat(svc.qty_deducted)
      : svc.stock_deducted
        ? parseFloat(svc.qty_per_service) || 1   // old record before qty was added
        : 0
    const delta = newTotal - already
    if (Math.abs(delta) < 0.001) continue        // nothing changed
    const { data: item } = await supabase.from('inventory').select('quantity').eq('id', svc.inventory_item_id).single()
    if (item) {
      await supabase.from('inventory').update({
        quantity: Math.max(0, (item.quantity || 0) - delta),
      }).eq('id', svc.inventory_item_id)
    }
    svc.qty_deducted  = newTotal
    svc.stock_deducted = true
  }
  return result
}

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

export function useJobs(workshopId) {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [offline, setOffline] = useState(false)

  const fetchJobs = useCallback(async () => {
    if (!workshopId) { setLoading(false); return }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('jobs').select('*, job_attachments(*)')
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false })
    if (err) {
      setOffline(true); setJobs(lsLoad(workshopId))
      if (err.code !== 'FETCH_ERROR') setError(err.message)
    } else {
      setOffline(false); setJobs(data || []); lsSave(workshopId, data || [])
    }
    setLoading(false)
  }, [workshopId])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const addJob = async (jobData) => {
    const services = await deductStockForServices(jobData.services)
    const payload = { ...jobData, services, workshop_id: workshopId }
    if (offline) {
      const j = { ...payload, id: uid(), created_at: new Date().toISOString(), job_attachments: [] }
      const next = [j, ...lsLoad(workshopId)]; lsSave(workshopId, next); setJobs(next); return j
    }
    const data = await safeInsert(payload)
    const next = [data, ...jobs]; setJobs(next); lsSave(workshopId, next); return data
  }

  const updateJob = async (id, updates) => {
    const payload = { ...updates }
    if (updates.services !== undefined) {
      payload.services = await deductStockForServices(updates.services)
    }
    if (offline) {
      const next = lsLoad(workshopId).map(j => j.id === id ? { ...j, ...payload } : j)
      lsSave(workshopId, next); setJobs(next); return next.find(j => j.id === id)
    }
    const data = await safeUpdate(id, payload)
    const next = jobs.map(j => j.id === id ? data : j); setJobs(next); lsSave(workshopId, next); return data
  }

  const deleteJob = async (id) => {
    if (offline) {
      const next = lsLoad(workshopId).filter(j => j.id !== id)
      lsSave(workshopId, next); setJobs(next); return
    }
    const job = jobs.find(j => j.id === id)
    const photos = job?.job_attachments?.filter(a => a.type === 'photo') || []
    if (photos.length > 0) {
      const paths = photos.map(a => {
        const marker = '/object/public/attachments/'
        const idx = a.url.indexOf(marker)
        return idx !== -1 ? a.url.slice(idx + marker.length) : null
      }).filter(Boolean)
      if (paths.length > 0) await supabase.storage.from('attachments').remove(paths)
    }
    const { error: err } = await supabase.from('jobs').delete().eq('id', id)
    if (err) throw err
    const next = jobs.filter(j => j.id !== id); setJobs(next); lsSave(workshopId, next)
  }

  const addAttachment = async (jobId, url, type, caption = '', stage = '') => {
    if (offline) {
      const a = { id: uid(), job_id: jobId, url, type, caption, stage, created_at: new Date().toISOString() }
      const next = lsLoad(workshopId).map(j =>
        j.id === jobId ? { ...j, job_attachments: [...(j.job_attachments || []), a] } : j)
      lsSave(workshopId, next); setJobs(next); return a
    }
    const { data, error: err } = await supabase
      .from('job_attachments').insert([{ job_id: jobId, url, type, caption, stage }]).select().single()
    if (err) throw err
    const next = jobs.map(j =>
      j.id === jobId ? { ...j, job_attachments: [...(j.job_attachments || []), data] } : j)
    setJobs(next); lsSave(workshopId, next); return data
  }

  const deleteAttachment = async (jobId, attachmentId) => {
    if (offline) {
      const next = lsLoad(workshopId).map(j =>
        j.id === jobId ? { ...j, job_attachments: j.job_attachments.filter(a => a.id !== attachmentId) } : j)
      lsSave(workshopId, next); setJobs(next); return
    }
    const { error: err } = await supabase.from('job_attachments').delete().eq('id', attachmentId)
    if (err) throw err
    const next = jobs.map(j =>
      j.id === jobId ? { ...j, job_attachments: j.job_attachments.filter(a => a.id !== attachmentId) } : j)
    setJobs(next); lsSave(workshopId, next)
  }

  return { jobs, loading, error, offline, fetchJobs, addJob, updateJob, deleteJob, addAttachment, deleteAttachment }
}
