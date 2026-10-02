import test from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, servicesText, jobsToCsv, fetchAllJobs } from '../src/lib/exportJobs.js'
import { hasAcceptedLegal, acceptLegal } from '../src/lib/legal.js'
import { LEGAL_VERSION, BUSINESS } from '../src/legal/business.js'
import { LEGAL, fillLegal } from '../src/legal/content.js'

test('csvCell: quoted, quotes doubled, formulas defused, phone numbers and amounts left alone', () => {
  assert.equal(csvCell('Ahmad "Ali"'), '"Ahmad ""Ali"""')
  assert.equal(csvCell(null), '""')
  assert.equal(csvCell(900), '"900"')
  for (const s of ['=HYPERLINK("x")', '@SUM(A1)', '+cmd|calc', '-2+3+cmd|x', '\tx']) assert.ok(csvCell(s).startsWith(`"'`), s)
  for (const s of ['+60 12-345 6789', '012-345 6789', '-50.00', '(03) 1234 5678']) assert.equal(csvCell(s), `"${s}"`, s)
})

test('servicesText: description, quantity and line amount', () => {
  assert.equal(servicesText([
    { description: 'Cat pintu', qty: 2, unit_price: 450, amount: 900 },
    { description: 'Polish', qty: 1, unit_price: 180 },
    { description: '  ', qty: 1, amount: 5 },
  ]), 'Cat pintu × 2 (RM 900.00); Polish (RM 180.00)')
  assert.equal(servicesText(null), '')
})

test('jobsToCsv: BOM, one header row, one row per job, in the chosen language', () => {
  const jobs = [{
    date_in: '2026-10-01', plate: 'WXY1234', car: 'Vios', owner: 'Ahmad', phone: '012-345 6789', customer_email: 'a@b.my',
    stage: 'painting', total_amount: 900, discount: 0, downpayment: 200, paid: false, payment_method: 'cash',
    services: [{ description: 'Cat', qty: 1, amount: 900 }], notes: 'Warna asal', archived: true,
    created_at: '2026-10-01T02:00:00+00:00', updated_at: '2026-10-02T02:00:00+00:00',
  }]
  const ms = jobsToCsv(jobs, { stageLabel: v => (v === 'painting' ? 'Cat Spray' : v) })
  assert.ok(ms.startsWith('﻿"Tarikh masuk","No. plat"'))
  const lines = ms.split('\r\n')
  assert.equal(lines.length, 2)
  assert.match(lines[1], /^"2026-10-01","WXY1234","Vios","Ahmad","012-345 6789","a@b.my","Cat Spray","900.00","0.00","200.00","Tidak","cash","Cat \(RM 900.00\)","Warna asal","","","Ya",/)
  assert.ok(jobsToCsv(jobs, { lang: 'en' }).includes('"Date in","Plate"'))
  assert.ok(jobsToCsv(jobs, { lang: 'en' }).includes('"No","cash"'))
})

test('fetchAllJobs: pages through every job of the workshop', async () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: i }))
  const calls = []
  const client = { from: (table) => ({ select: () => ({ eq: (col, val) => ({ order: () => ({ range: async (a, b) => {
    calls.push([table, col, val, a, b]); return { data: rows.slice(a, b + 1), error: null }
  } }) }) }) }) }
  assert.deepEqual((await fetchAllJobs(client, 'ws1', 2)).map(r => r.id), [0, 1, 2, 3, 4])
  assert.deepEqual(calls.map(c => [c[3], c[4]]), [[0, 1], [2, 3], [4, 5]])
  assert.deepEqual(calls[0].slice(0, 3), ['jobs', 'workshop_id', 'ws1'])
  const failing = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async () => ({ data: null, error: new Error('RLS') }) }) }) }) }) }
  await assert.rejects(fetchAllJobs(failing, 'ws1'), /RLS/)
})

const fakeClient = ({ rows = [], selectError = null, insertError = null, throws = false } = {}) => {
  const inserted = []
  return {
    inserted,
    from: () => ({
      select: () => ({ eq: (_c, v) => ({ limit: async () => {
        if (throws) throw new Error('offline')
        return { data: selectError ? null : rows.filter(r => r.version === v), error: selectError }
      } }) }),
      insert: async (row) => { inserted.push(row); return { error: insertError } },
    }),
  }
}

test('consent: accepted, not yet, or unknown (never nag when the check fails)', async () => {
  assert.equal(await hasAcceptedLegal(fakeClient({ rows: [{ version: LEGAL_VERSION }] })), true)
  assert.equal(await hasAcceptedLegal(fakeClient({ rows: [{ version: '2020-01-01' }] })), false)
  assert.equal(await hasAcceptedLegal(fakeClient({ selectError: { code: '42P01' } })), null)
  assert.equal(await hasAcceptedLegal(fakeClient({ throws: true })), null)
})

test('consent: records the current version; accepting twice is fine, other errors surface', async () => {
  const c = fakeClient()
  await acceptLegal(c)
  assert.deepEqual(c.inserted, [{ version: LEGAL_VERSION }])
  await acceptLegal(fakeClient({ insertError: { code: '23505' } }))
  await assert.rejects(acceptLegal(fakeClient({ insertError: { code: '42501', message: 'denied' } })))
})

test('legal documents: both languages have the same sections, and every placeholder is filled', () => {
  assert.match(LEGAL_VERSION, /^\d{4}-\d{2}-\d{2}$/)
  for (const kind of ['privacy', 'terms']) {
    const { ms, en } = LEGAL[kind]
    assert.deepEqual(ms.sections.map(s => s.id), en.sections.map(s => s.id), kind)
    for (const doc of [ms, en]) {
      const text = JSON.stringify(doc)
      assert.ok(!fillLegal(text, BUSINESS).match(/\{(email|website)\}/), `${kind}: unfilled placeholder`)
      assert.ok(!/TODO|lorem/i.test(text), `${kind}: placeholder text`)
    }
  }
  // The landing page links to /terma#bayaran.
  assert.ok(LEGAL.terms.ms.sections.some(s => s.id === 'bayaran'))
})
