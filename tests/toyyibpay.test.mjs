import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { myrToSen, outstandingSen, billText, returnUrl, readGatewayResponse, callbackHashValid, verifiedTransaction } from '../supabase/functions/_shared/toyyibpay.ts'
import { handleCallback } from '../supabase/functions/payment-callback/handler.ts'
import { createCheckout } from '../supabase/functions/_shared/create-checkout.ts'

const id = '00000000-0000-4000-8000-000000000001'
const payment = { id, purpose: 'subscription_monthly', status: 'pending', currency: 'MYR', amount_original: '30.00', gateway_sandbox: true }
const transaction = { billExternalReferenceNo: id, billpaymentStatus: '1', billpaymentAmount: '30.00' }
const secret = 'test-only-secret'
function signed(status = '1') {
  const params = new URLSearchParams({ billcode: 'testbill', order_id: id, refno: 'reference', status, amount: '0.01' })
  params.set('hash', createHash('md5').update(secret + status + id + 'reference' + 'ok').digest('hex'))
  return params
}
function callbackClient(row = payment, rpcError = null) {
  const actions = []
  return { actions,
    from(table) {
      const query = {
        select() { return query }, eq() { return query },
        single: async () => ({ data: row }),
        insert(value) { actions.push({ table, value }); return Promise.resolve({ error: null }) },
        update(value) { actions.push({ table, value }); return query },
        then(resolve) { resolve({ error: null }) },
      }
      return query
    },
    async rpc(name, args) { actions.push({ name, args }); return { error: rpcError } },
  }
}
const request = params => new Request('https://example.com/callback', { method: 'POST', body: params })
const env = key => key === 'PLATFORM_TOYYIBPAY_SECRET_KEY' ? secret : 'false'

test('decimal MYR is converted to sen exactly, including fractional balances', () => {
  assert.equal(myrToSen('30.00'), 3000)
  assert.equal(myrToSen('1.01'), 101)
  assert.equal(outstandingSen({ total_amount: 100, discount: 10.01, downpayment: 20 }), 6999)
  for (const invalid of [undefined, null, NaN, Infinity, '', '30oops', '-1', '0.001', {}]) assert.throws(() => myrToSen(invalid))
})
test('bill names obey provider character and length limits', () => {
  assert.equal(billText("WXX-123 O'Brien & Co.", 30), 'WXX123 OBrien  Co')
  assert.equal(billText('a'.repeat(40), 30).length, 30)
})
test('return URLs stay on the configured application origin', () => {
  assert.equal(returnUrl('https://app.example', 'https://evil.example', '/settings'), 'https://app.example/settings')
  assert.equal(returnUrl('https://app.example', 'https://app.example/settings?sub=pending', '/'), 'https://app.example/settings?sub=pending')
  assert.throws(() => returnUrl(undefined, 'https://evil.example', '/'))
})
test('gateway JSON and plain-text HTTP 200 errors are read once', async () => {
  assert.equal(await readGatewayResponse(new Response('[KEY-DID-NOT-EXIST]')), '[KEY-DID-NOT-EXIST]')
  assert.deepEqual(await readGatewayResponse(new Response('[{"BillCode":"abc"}]')), [{ BillCode: 'abc' }])
})
test('callback hash rejects tampering and missing signatures', () => {
  const params = signed()
  assert.equal(callbackHashValid(params, secret), true)
  params.set('status', '3')
  assert.equal(callbackHashValid(params, secret), false)
  params.delete('hash')
  assert.equal(callbackHashValid(params, secret), false)
})
test('verification requires matching reference, currency, final status and exact amount', () => {
  assert.deepEqual(verifiedTransaction([transaction], payment), transaction)
  for (const change of [{ billpaymentAmount: '0.30' }, { billpaymentAmount: '31.00' }, { billpaymentAmount: null }, { billpaymentStatus: '2' }, { billExternalReferenceNo: 'different' }]) {
    assert.equal(verifiedTransaction([{ ...transaction, ...change }], payment), null)
  }
  assert.equal(verifiedTransaction([transaction], { ...payment, currency: 'USD' }), null)
})
test('forged callback produces no audit or settlement writes', async () => {
  const client = callbackClient(); const params = signed(); params.set('hash', '0'.repeat(32))
  const response = await handleCallback(request(params), client, env, () => { throw new Error('Unexpected provider call') })
  assert.equal(response.status, 401)
  assert.deepEqual(client.actions, [])
})
test('successful callback uses provider MYR and the original sandbox, ignoring callback amount', async () => {
  const client = callbackClient()
  const response = await handleCallback(request(signed()), client, env, async url => {
    assert.match(url, /^https:\/\/dev.toyyibpay.com\//)
    return Response.json([transaction])
  })
  assert.equal(response.status, 200)
  assert.equal(client.actions.at(-1).args.p_amount_sen, 3000)
  assert.equal(client.actions[0].value.payload.hash, undefined)
})
test('verification outages and mismatches remain retryable without settlement', async () => {
  for (const reply of [new Response('down', { status: 503 }), Response.json([]), Response.json([{ ...transaction, billpaymentAmount: '0.30' }])]) {
    const client = callbackClient()
    assert.equal((await handleCallback(request(signed()), client, env, async () => reply)).status, 503)
    assert.equal(client.actions.some(a => a.name), false)
  }
})
test('settlement errors return failure for gateway retry', async () => {
  const client = callbackClient(payment, { message: 'database unavailable' })
  assert.equal((await handleCallback(request(signed()), client, env, async () => Response.json([transaction]))).status, 500)
})
test('late failed callback cannot overwrite a paid payment', async () => {
  const client = callbackClient({ ...payment, status: 'paid' })
  assert.equal((await handleCallback(request(signed('3')), client, env, () => { throw new Error('Unexpected fetch') })).status, 200)
  assert.equal(client.actions.length, 1) // audit event only
})

function checkoutClient(saveError = null) {
  const writes = []
  return { writes, from() {
    let inserting = false
    const q = {
      insert(value) { inserting = true; writes.push(value); return q },
      update(value) { writes.push(value); return q },
      eq() { return q }, select() { return q },
      single: async () => ({ data: inserting || !saveError ? { id } : null, error: inserting ? null : saveError }),
      then(resolve) { resolve({ error: null }) },
    }; return q
  } }
}
const options = { workshopId: id, jobId: id, purpose: 'job', amountSen: 3000, secret, category: 'category', sandbox: true, name: 'WXX-123', description: 'Repair & paint', returnUrl: 'https://app.example', callbackUrl: 'https://api.example/callback' }
test('checkout sends fixed sen amount and stores reference before returning link', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    assert.equal(init.body.get('billAmount'), '3000')
    assert.equal(init.body.get('billPriceSetting'), '1')
    assert.equal(init.body.get('billName'), 'WXX123')
    assert.equal(init.body.get('billPayorInfo'), '0')
    return Response.json([{ BillCode: 'testbill' }])
  })
  const client = checkoutClient()
  const result = await createCheckout(client, options)
  assert.equal(result.payment_url, 'https://dev.toyyibpay.com/testbill')
  assert.equal(client.writes[0].amount_original, 30)
  assert.equal(client.writes.at(-1).gateway_ref, 'testbill')
})
test('plain-text rejection preserves the failed intent without exposing upstream details', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('[KEY-DID-NOT-EXIST]'))
  const client = checkoutClient()
  await assert.rejects(createCheckout(client, options), /ToyyibPay rejected/)
  assert.equal(client.writes.at(-1).status, 'rejected')
})
test('checkout does not return an unpersisted gateway link', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json([{ BillCode: 'testbill' }]))
  await assert.rejects(createCheckout(checkoutClient({ message: 'offline' }), options), /Unable to save the payment link/)
})
