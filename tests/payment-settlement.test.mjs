import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

let db
const workshopId = '10000000-0000-4000-8000-000000000001'
const ownerId = '10000000-0000-4000-8000-000000000002'
const jobId = '20000000-0000-4000-8000-000000000001'
let sequence = 0
before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${ownerId}'::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    CREATE TABLE workshops (id uuid PRIMARY KEY, owner_id uuid, name text);
    CREATE TABLE jobs (id uuid PRIMARY KEY, workshop_id uuid REFERENCES workshops,
      total_amount numeric(10,2), discount numeric(10,2) DEFAULT 0, downpayment numeric(10,2) DEFAULT 0,
      paid boolean DEFAULT false, payment_method text);
  `)
  // Exercise the real previous migration and its plan-protection trigger too.
  await db.exec(await readFile(new URL('../supabase/migrations/0007_subscriptions.sql', import.meta.url), 'utf8'))
  await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;`)
  await db.exec(await readFile(new URL('../supabase/migrations/20260925002920_payment_settlement_integrity.sql', import.meta.url), 'utf8'))
  await db.query('INSERT INTO workshops(id, owner_id, name) VALUES ($1, $2, $3)', [workshopId, ownerId, 'Test Workshop'])
  await db.query('INSERT INTO jobs(id, workshop_id, total_amount, discount, downpayment) VALUES ($1, $2, 100, 10, 20)', [jobId, workshopId])
  await db.exec('SET ROLE service_role')
})
after(async () => { await db?.close() })
async function intent({ purpose = 'job', amount = 70, job = jobId, currency = 'MYR', provider = 'toyyibpay', status = 'pending' } = {}) {
  sequence++
  const id = `30000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
  const bill = `bill${sequence}`
  await db.query(`INSERT INTO payments(id, workshop_id, job_id, purpose, amount_original, currency, provider, status, gateway_ref)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, workshopId, job, purpose, amount, currency, provider, status, bill])
  return { id, bill }
}
const settle = (p, sen = 7000) => db.query('SELECT settle_toyyibpay_payment($1, $2, $3, $4)', [p.id, p.bill, sen, '{}'])
const row = async (table, id) => (await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id])).rows[0]

test('discounted balance is fully paid once, including duplicate callbacks', async () => {
  const p = await intent()
  await settle(p)
  await settle(p)
  const job = await row('jobs', jobId)
  assert.equal(Number(job.downpayment), 90)
  assert.equal(job.paid, true)
  assert.equal(Number((await row('payments', p.id)).amount_paid), 70)
})
test('another paid bill preserves an overpayment for reconciliation', async () => {
  const p = await intent({ amount: 10 })
  await settle(p, 1000)
  assert.equal(Number((await row('jobs', jobId)).downpayment), 100)
})
test('wrong amount, currency, provider, reference and terminal status cannot settle', async () => {
  for (const fields of [{ currency: 'USD' }, { provider: 'other' }, { status: 'refunded' }]) {
    const p = await intent(fields)
    await assert.rejects(settle(p))
    assert.notEqual((await row('payments', p.id)).status, 'paid')
  }
  const p = await intent()
  for (const sen of [0, -1, 6999, 7001, null]) await assert.rejects(settle(p, sen))
  await assert.rejects(settle({ ...p, bill: 'wrong' }))
  assert.equal((await row('payments', p.id)).status, 'pending')
})
test('subscription preserves trial time and duplicate callback never extends twice', async () => {
  await db.query("UPDATE workshops SET trial_ends_at = '2099-01-31T00:00:00Z', paid_until = NULL WHERE id = $1", [workshopId])
  const p = await intent({ purpose: 'subscription_monthly', amount: 30, job: null })
  await settle(p, 3000)
  await settle(p, 3000)
  const workshop = await row('workshops', workshopId)
  assert.equal(workshop.plan, 'pro')
  assert.equal(workshop.paid_until.toISOString(), '2099-02-28T00:00:00.000Z')
  const annual = await intent({ purpose: 'subscription_annual', amount: 300, job: null })
  await settle(annual, 30000)
  assert.equal((await row('workshops', workshopId)).paid_until.toISOString(), '2100-02-28T00:00:00.000Z')
})
test('failed final payment write rolls back the job update and can be retried', async () => {
  const p = await intent({ amount: 10 })
  const before = Number((await row('jobs', jobId)).downpayment)
  await db.exec(`RESET ROLE;
    CREATE FUNCTION fail_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected write failure'; END $$;
    CREATE TRIGGER fail_settlement BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION fail_settlement();
    SET ROLE service_role;`)
  await assert.rejects(settle(p, 1000), /Injected write failure/)
  assert.equal(Number((await row('jobs', jobId)).downpayment), before)
  assert.equal((await row('payments', p.id)).status, 'pending')
  await db.exec('RESET ROLE; DROP TRIGGER fail_settlement ON payments; SET ROLE service_role;')
  await settle(p, 1000)
  assert.equal(Number((await row('jobs', jobId)).downpayment), before + 10)
})
test('failed subscription write rolls back the payment and preserves existing entitlement', async () => {
  const p = await intent({ purpose: 'subscription_monthly', amount: 30, job: null })
  const before = (await row('workshops', workshopId)).paid_until.toISOString()
  await db.exec(`RESET ROLE;
    CREATE TRIGGER fail_subscription BEFORE UPDATE ON workshops FOR EACH ROW EXECUTE FUNCTION fail_settlement();
    SET ROLE service_role;`)
  await assert.rejects(settle(p, 3000), /Injected write failure/)
  assert.equal((await row('payments', p.id)).status, 'pending')
  assert.equal((await row('workshops', workshopId)).paid_until.toISOString(), before)
  await db.exec('RESET ROLE; DROP TRIGGER fail_subscription ON workshops; SET ROLE service_role;')
})
test('owners and anonymous callers cannot write the ledger or invoke settlement', async () => {
  const p = await intent()
  await db.exec('SET ROLE authenticated')
  assert.equal((await row('payments', p.id)).status, 'pending')
  await assert.rejects(db.query("UPDATE payments SET status = 'paid' WHERE id = $1", [p.id]), /permission denied/)
  await assert.rejects(settle(p), /permission denied/)
  await db.exec('SET ROLE anon')
  await assert.rejects(settle(p), /permission denied/)
  await db.exec('SET ROLE service_role')
})

test('new workshop cannot grant itself Pro through a supplied paid_until', async () => {
  await db.exec('SET ROLE authenticated')
  const id = '10000000-0000-4000-8000-000000000099'
  await db.query("INSERT INTO workshops(id, owner_id, name, plan, paid_until) VALUES ($1, $2, 'Untrusted signup', 'pro', '2199-01-01')", [id, ownerId])
  const workshop = await row('workshops', id)
  assert.equal(workshop.plan, 'trial')
  assert.equal(workshop.paid_until, null)
  await db.exec('SET ROLE service_role')
})
