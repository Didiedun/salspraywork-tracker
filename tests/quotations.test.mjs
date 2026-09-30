import test from 'node:test'
import assert from 'node:assert/strict'
import { translations } from '../src/i18n.js'
import {
  addDays, cleanItems, quoteSubtotal, quoteTotal, quoteNumber, isExpired, quoteToJob,
  waNumber, whatsappText, whatsappLink,
} from '../src/lib/quotations.js'

// Same substitution as LanguageContext's t().
const tFor = (lang) => (key, params = {}) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v), translations[lang][key] ?? key)

const quote = {
  id: '5b0e6a3c-0000-4000-8000-00000000ab12',
  created_at: '2026-09-30T12:00:00Z',
  status: 'sent',
  customer_name: ' Ahmad ',
  customer_phone: '012-345 6789',
  plate: 'wxx 1234',
  car: 'Perodua Myvi',
  items: [
    { description: 'Cat bumper depan', qty: 1, unit_price: '350', inventory_item_id: null, category_name: 'Cat' },
    { description: '  Lampu belakang ', qty: '2', unit_price: '60.5', inventory_item_id: 'inv-1', qty_per_service: 1 },
    { description: '   ', qty: 1, unit_price: '999' },
  ],
  discount: '21',
  valid_until: '2026-10-14',
  notes: 'Deposit 50%.\nMaybank 1234',
}

test('empty lines are dropped and every line is priced like a job service line', () => {
  const items = cleanItems(quote.items)
  assert.equal(items.length, 2)
  assert.deepEqual(items[1], {
    description: 'Lampu belakang', qty: 2, unit_price: 60.5, amount: 121,
    inventory_item_id: 'inv-1', qty_per_service: 1, category_name: null,
  })
  assert.equal(cleanItems([{ description: 'x', qty: '', unit_price: 'abc' }])[0].qty, 1)
  assert.equal(cleanItems([{ description: 'x', qty: '', unit_price: 'abc' }])[0].amount, 0)
})

test('totals: blank lines ignored, discount taken off, never below zero, no float drift', () => {
  assert.equal(quoteSubtotal(cleanItems(quote.items)), 471)
  assert.equal(quoteTotal({ ...quote, items: cleanItems(quote.items) }), 450)
  assert.equal(quoteTotal({ items: [{ description: 'a', unit_price: 10 }], discount: 25 }), 0)
  assert.equal(quoteSubtotal([{ unit_price: 0.1 }, { unit_price: 0.2 }]), 0.3)
})

test('quotation numbers follow the invoice pattern', () => {
  assert.equal(quoteNumber(quote), 'SH-20260930-AB12')
})

test('validity: only open quotations expire, and only after the last valid day', () => {
  assert.equal(isExpired(quote, '2026-10-14'), false)
  assert.equal(isExpired(quote, '2026-10-15'), true)
  assert.equal(isExpired({ ...quote, status: 'draft' }, '2026-10-15'), true)
  assert.equal(isExpired({ ...quote, status: 'accepted' }, '2026-10-15'), false)
  assert.equal(isExpired({ ...quote, status: 'rejected' }, '2026-10-15'), false)
  assert.equal(isExpired({ ...quote, valid_until: null }, '2030-01-01'), false)
  assert.equal(addDays('2026-09-30', 14), '2026-10-14')
  assert.equal(addDays('2026-12-25', 14), '2027-01-08')
})

test('an accepted quotation becomes a complete job', () => {
  const job = quoteToJob(quote, { stage: 'inspection', today: '2026-10-01', note: 'Dari sebut harga SH-20260930-AB12' })
  assert.equal(job.plate, 'WXX1234')
  assert.equal(job.owner, 'Ahmad')
  assert.equal(job.phone, '012-345 6789')
  assert.equal(job.car, 'Perodua Myvi')
  assert.equal(job.total_amount, 471)
  assert.equal(job.discount, 21)
  assert.equal(job.downpayment, 0)
  assert.equal(job.paid, false)
  assert.equal(job.stage, 'inspection')
  assert.equal(job.date_in, '2026-10-01')
  assert.equal(job.notes, 'Dari sebut harga SH-20260930-AB12\nDeposit 50%.\nMaybank 1234')
  assert.equal(job.services.length, 2)
  // Stock is deducted by addJob when the job is created, not before.
  assert.ok(job.services.every(s => s.stock_deducted === false && s.qty_deducted === null))
  assert.equal(job.services[1].inventory_item_id, 'inv-1')
})

test('WhatsApp numbers use the Malaysian country code', () => {
  assert.equal(waNumber('012-345 6789'), '60123456789')
  assert.equal(waNumber('+60 12-345 6789'), '60123456789')
  assert.equal(waNumber(''), null)
  assert.equal(waNumber(null), null)
})

test('the WhatsApp message is written by the workshop to the customer, in both languages', () => {
  const formatDate = (d) => `[${d}]`
  const ms = whatsappText(quote, { t: tFor('ms'), workshopName: 'NZE Resources', formatDate })
  assert.equal(ms.split('\n')[0], 'Salam Ahmad, berikut sebut harga dari NZE Resources (SH-20260930-AB12):')
  assert.match(ms, /^Kenderaan: WXX1234 · Perodua Myvi$/m)
  assert.match(ms, /^• Cat bumper depan — RM\u00a0350\.00$/m)
  assert.match(ms, /^• Lampu belakang × 2 — RM\u00a0121\.00$/m)
  assert.match(ms, /^Diskaun: − RM\u00a021\.00$/m)
  assert.match(ms, /^\*Jumlah: RM\u00a0450\.00\*$/m)
  assert.match(ms, /^Sah sehingga \[2026-10-14\]\.$/m)
  assert.match(ms, /Deposit 50%\.\nMaybank 1234/)
  assert.doesNotMatch(ms, /undefined|null|\{/)

  const en = whatsappText({ ...quote, customer_name: '', discount: 0, notes: null, plate: null, car: null }, { t: tFor('en'), workshopName: 'NZE', formatDate })
  assert.equal(en.split('\n')[0], 'Hi, here is your quotation from NZE (SH-20260930-AB12):')
  assert.doesNotMatch(en, /Discount|Vehicle/)
  assert.match(en, /Reply to this message to confirm/)
})

test('the WhatsApp link opens the customer chat, or lets the owner pick one', () => {
  assert.equal(whatsappLink(quote, 'a b&c'), 'https://wa.me/60123456789?text=a%20b%26c')
  assert.equal(whatsappLink({ ...quote, customer_phone: '' }, 'x'), 'https://wa.me/?text=x')
})
