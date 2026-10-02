import test from 'node:test'
import assert from 'node:assert/strict'
import { attachmentPath, removeAttachmentFiles, uploadJobFile } from '../src/lib/storage.js'

const base = 'https://abc.supabase.co/storage/v1/object/public/attachments/'
const fakeBucket = ({ uploadError = null, removeThrows = false } = {}) => {
  const calls = { upload: [], remove: [] }
  return {
    calls,
    async upload(path, file) { calls.upload.push([path, file]); return { error: uploadError } },
    getPublicUrl: (path) => ({ data: { publicUrl: base + path } }),
    async remove(paths) { calls.remove.push(paths); if (removeThrows) throw new Error('network'); return { data: [], error: null } },
  }
}

test('attachmentPath: our folders only, query strings dropped, nothing outside the bucket', () => {
  assert.equal(attachmentPath(`${base}photos/j1/1.jpg`), 'photos/j1/1.jpg')
  assert.equal(attachmentPath(`${base}receipts/j1/2.png?download=1`), 'receipts/j1/2.png')
  assert.equal(attachmentPath(`${base}logos/w1/3.png#x`), 'logos/w1/3.png')
  assert.equal(attachmentPath(`${base}logos/w1%20b/3.png`), 'logos/w1 b/3.png')
  assert.equal(attachmentPath(`${base}photos/j1/1.jpg`, ['logos']), null)
  for (const url of [`${base}other/x.jpg`, `${base}photos/../logos/w1/x.png`, 'https://example.com/photos/a.jpg',
    `${base}`, `${base}%E0%A4%A`, null, undefined, 42]) {
    assert.equal(attachmentPath(url), null, String(url))
  }
})

test('removeAttachmentFiles: removes each of our files once, ignores the rest and never throws', async () => {
  const bucket = fakeBucket()
  const removed = await removeAttachmentFiles(bucket, [
    `${base}photos/j1/1.jpg`, `${base}receipts/j1/2.jpg`, `${base}photos/j1/1.jpg`, 'https://example.com/x.jpg', null])
  assert.deepEqual(removed, ['photos/j1/1.jpg', 'receipts/j1/2.jpg'])
  assert.deepEqual(bucket.calls.remove, [['photos/j1/1.jpg', 'receipts/j1/2.jpg']])
  assert.deepEqual(await removeAttachmentFiles(bucket, []), [])
  assert.equal(bucket.calls.remove.length, 1)
  await removeAttachmentFiles(fakeBucket({ removeThrows: true }), [`${base}photos/j1/1.jpg`])   // no throw
})

test('uploadJobFile: photos and receipts go to their folders and are recorded', async () => {
  const bucket = fakeBucket()
  const recorded = []
  const add = async (...args) => { recorded.push(args); return { id: 'a1' } }
  const job = { id: 'j1', stage: 'painting' }
  assert.deepEqual(await uploadJobFile(bucket, job, { name: 'Gambar.JPG' }, 'photo', add), { id: 'a1' })
  await uploadJobFile(bucket, job, { name: 'slip.png' }, 'receipt', add)
  assert.match(bucket.calls.upload[0][0], /^photos\/j1\/\d+\.jpg$/)
  assert.match(bucket.calls.upload[1][0], /^receipts\/j1\/\d+\.png$/)
  assert.deepEqual(recorded.map(r => [r[0], r[2], r[4]]), [['j1', 'photo', 'painting'], ['j1', 'receipt', '']])
  assert.equal(bucket.calls.remove.length, 0)
})

test('uploadJobFile: if recording fails, the uploaded file is removed again', async () => {
  const bucket = fakeBucket()
  await assert.rejects(uploadJobFile(bucket, { id: 'j1' }, { name: 'a.jpg' }, 'photo', async () => { throw new Error('RLS') }), /RLS/)
  assert.deepEqual(bucket.calls.remove, [[bucket.calls.upload[0][0]]])
  const failing = fakeBucket({ uploadError: new Error('too big') })
  await assert.rejects(uploadJobFile(failing, { id: 'j1' }, { name: 'a.jpg' }, 'photo', async () => ({})), /too big/)
  assert.equal(failing.calls.remove.length, 0)
})
