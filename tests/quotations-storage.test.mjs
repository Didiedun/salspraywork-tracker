import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Owners A and B each have a workshop and a job; W works at A's workshop; S is a stranger.
const A = '10000000-0000-4000-8000-00000000000a', B = '10000000-0000-4000-8000-00000000000b'
const W = '10000000-0000-4000-8000-0000000000aa', S = '10000000-0000-4000-8000-0000000000ff'
const wsA = '20000000-0000-4000-8000-00000000000a', wsB = '20000000-0000-4000-8000-00000000000b'
const jobA = '30000000-0000-4000-8000-00000000000a', jobB = '30000000-0000-4000-8000-00000000000b'
const goneJob = '30000000-0000-4000-8000-0000000000dd'

let db
const migration = name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
async function as(role, uid = '') {
  await db.exec(`RESET ROLE; SELECT set_config('test.uid', '${uid}', false); SET ROLE ${role};`)
}
const upload = name => db.query("INSERT INTO storage.objects (bucket_id, name) VALUES ('attachments', $1)", [name])
const remove = async name => (await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING id', [name])).rows.length
async function seedFile(name) { await as('postgres'); await db.query("INSERT INTO storage.objects (bucket_id, name) VALUES ('attachments', $1)", [name]) }

before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;

    CREATE TABLE public.workshops (id uuid PRIMARY KEY, owner_id uuid NOT NULL, name text, toyyibpay_secret_key text);
    CREATE TABLE public.jobs (id uuid PRIMARY KEY, workshop_id uuid REFERENCES public.workshops);
    CREATE TABLE public.workshop_members (workshop_id uuid, user_id uuid, role text);
    INSERT INTO public.workshops VALUES ('${wsA}', '${A}', 'A', 'leaked-secret'), ('${wsB}', '${B}', 'B', null);
    INSERT INTO public.jobs VALUES ('${jobA}', '${wsA}'), ('${jobB}', '${wsB}');
    INSERT INTO public.workshop_members VALUES ('${wsA}', '${W}', 'worker');
    -- As in production, signed-in users can read workshops (the owner checks look them up).
    GRANT SELECT ON public.workshops, public.jobs, public.workshop_members TO anon, authenticated;

    -- Minimal stand-in for Supabase Storage, with the production policies before this change.
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments');
    CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'attachments');
    CREATE POLICY "Allow delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'attachments');
    GRANT SELECT, INSERT, DELETE ON storage.objects TO anon, authenticated;
  `)
  await db.exec(await migration('20260930120000_quotations.sql'))
  await db.exec(await migration('20260930120100_attachments_and_secret_hardening.sql'))
})
after(async () => { await db?.close() })

test('the public copy of the ToyyibPay secret is gone', async () => {
  await as('postgres')
  const { rows } = await db.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'workshops' AND column_name = 'toyyibpay_secret_key'")
  assert.equal(rows.length, 0)
})

test('logos: only the workshop owner can add them, in the new and the old file layout', async () => {
  await as('authenticated', A)
  await upload(`logos/${wsA}/1790000000000.png`)
  await upload(`logos/${wsA}.png`)
  await assert.rejects(upload(`logos/${wsB}/1.png`), /row-level security/)
  await as('authenticated', W)
  await assert.rejects(upload(`logos/${wsA}/2.png`), /row-level security/)
})

test('job photos and receipts: the owner and that workshop\'s workers can add them, nobody else', async () => {
  await as('authenticated', A)
  await upload(`photos/${jobA}/1.jpg`)
  await upload(`receipts/${jobA}/1.pdf`)
  await assert.rejects(upload(`photos/${jobB}/1.jpg`), /row-level security/)
  await as('authenticated', W)
  await upload(`photos/${jobA}/2.jpg`)
  await assert.rejects(upload(`photos/${jobB}/2.jpg`), /row-level security/)
  await as('authenticated', S)
  await assert.rejects(upload(`photos/${jobA}/3.jpg`), /row-level security/)
})

test('logged-out visitors can no longer add or delete anything; reading stays public', async () => {
  await seedFile(`photos/${jobA}/public.jpg`)
  await as('anon')
  await assert.rejects(upload(`photos/${jobA}/anon.jpg`), /row-level security/)
  assert.equal(await remove(`photos/${jobA}/public.jpg`), 0)
  const { rows } = await db.query('SELECT name FROM storage.objects WHERE name = $1', [`photos/${jobA}/public.jpg`])
  assert.equal(rows.length, 1)
})

test('deleting: own files yes, other workshops no, leftovers of deleted jobs yes', async () => {
  await seedFile(`photos/${jobA}/del.jpg`); await seedFile(`photos/${jobB}/keep.jpg`); await seedFile(`photos/${goneJob}/orphan.jpg`)
  await as('authenticated', S)
  assert.equal(await remove(`photos/${jobA}/del.jpg`), 0)
  await as('authenticated', A)
  assert.equal(await remove(`photos/${jobB}/keep.jpg`), 0)
  assert.equal(await remove(`photos/${jobA}/del.jpg`), 1)
  assert.equal(await remove(`photos/${goneJob}/orphan.jpg`), 1)
})

test('odd paths are refused', async () => {
  await as('authenticated', A)
  for (const name of [`misc/${jobA}/x.jpg`, 'photos/not-a-uuid/x.jpg', `photos/../logos/${wsA}.png`, `${jobA}.jpg`]) {
    await assert.rejects(upload(name), /row-level security/, name)
  }
})

test('quotations: owners manage only their own; workers and the public see nothing', async () => {
  await as('authenticated', A)
  const { rows: [q] } = await db.query(
    "INSERT INTO public.quotations (workshop_id, customer_name, items) VALUES ($1, 'Ali', '[{\"description\":\"Cat bumper\",\"qty\":1,\"unit_price\":350}]') RETURNING id, status",
    [wsA])
  assert.equal(q.status, 'draft')
  await assert.rejects(db.query("INSERT INTO public.quotations (workshop_id, customer_name) VALUES ($1, 'x')", [wsB]), /row-level security/)
  assert.equal((await db.query("UPDATE public.quotations SET status = 'sent' WHERE id = $1 RETURNING id", [q.id])).rows.length, 1)
  await assert.rejects(db.query("UPDATE public.quotations SET status = 'maybe' WHERE id = $1", [q.id]), /check constraint/)

  await as('authenticated', B)
  assert.equal((await db.query('SELECT id FROM public.quotations')).rows.length, 0)
  assert.equal((await db.query('DELETE FROM public.quotations WHERE id = $1 RETURNING id', [q.id])).rows.length, 0)
  await as('authenticated', W)
  assert.equal((await db.query('SELECT id FROM public.quotations')).rows.length, 0)
  await as('anon')
  await assert.rejects(db.query('SELECT id FROM public.quotations'), /permission denied/)

  await as('authenticated', A)
  assert.equal((await db.query('DELETE FROM public.quotations WHERE id = $1 RETURNING id', [q.id])).rows.length, 1)
})
