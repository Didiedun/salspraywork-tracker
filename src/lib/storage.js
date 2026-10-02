// Files in the public "attachments" bucket: logos/<workshop_id>/…, photos/<job_id>/…
// and receipts/<job_id>/…. The bucket is public, so a file stays reachable by its link
// until it is removed from storage; deleting only the database row is not enough.
// Callers pass the bucket (supabase.storage.from('attachments')).

const MARKER = '/object/public/attachments/'
const OUR_FOLDERS = ['logos', 'photos', 'receipts']

// Storage path of a file we uploaded, from its public URL. Anything else (an external
// URL, another bucket or folder) is never deleted.
export function attachmentPath(url, folders = OUR_FOLDERS) {
  const i = typeof url === 'string' ? url.indexOf(MARKER) : -1
  if (i === -1) return null
  let path
  try { path = decodeURIComponent(url.slice(i + MARKER.length).split(/[?#]/)[0]) } catch { return null }
  if (!path || path.split('/').includes('..')) return null
  return folders.some(f => path.startsWith(`${f}/`)) ? path : null
}

// Best effort: a failed clean-up must never undo or block the delete that came first.
export async function removeAttachmentFiles(bucket, urls) {
  const paths = [...new Set(urls.map(u => attachmentPath(u)).filter(Boolean))]
  if (paths.length === 0) return []
  try { await bucket.remove(paths) } catch { /* ignore */ }
  return paths
}

// Upload a job photo or receipt and record it. If recording fails, the file is removed
// again so nothing is left behind that no job points to.
export async function uploadJobFile(bucket, job, file, type, addAttachment) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${type === 'photo' ? 'photos' : 'receipts'}/${job.id}/${Date.now()}.${ext}`
  const { error: upErr } = await bucket.upload(path, file)
  if (upErr) throw upErr
  const { data: { publicUrl } } = bucket.getPublicUrl(path)
  try {
    return await addAttachment(job.id, publicUrl, type, '', type === 'photo' ? job.stage : '')
  } catch (e) {
    try { await bucket.remove([path]) } catch { /* ignore */ }
    throw e
  }
}
