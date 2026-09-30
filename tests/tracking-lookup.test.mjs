import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Workshop A (owner A, worker W) and workshop B (owner B); S is signed in but works nowhere.
const A = '10000000-0000-4000-8000-00000000000a', B = '10000000-0000-4000-8000-00000000000b'
const W = '10000000-0000-4000-8000-0000000000aa', S = '10000000-0000-4000-8000-0000000000ff'
const wsA = '20000000-0000-4000-8000-00000000000a', wsB = '20000000-0000-4000-8000-00000000000b'
const jA1 = '30000000-0000-4000-8000-0000000000a1', jA1old = '30000000-0000-4000-8000-0000000000a0'
const jA2 = '30000000-0000-4000-8000-0000000000a2', jA3 = '30000000-0000-4000-8000-0000000000a3'
const jB1 = '30000000-0000-4000-8000-0000000000b1', gone = '30000000-0000-4000-8000-0000000000dd'

let db
const migration = name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
async function as(role, uid = '') {
  await db.exec(`RESET ROLE; SELECT set_config('test.uid', '${uid}', false); SET ROLE ${role};`)
}
const count = async (sql, params) => Number((await db.query(sql, params)).rows[0].n)
const track = async (slug, plate = null, phone = null) =>
  (await db.query('SELECT public.track_jobs($1, $2, $3) AS r', [slug, plate, phone])).rows[0].r

before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;

    CREATE TABLE public.workshops (id uuid PRIMARY KEY, owner_id uuid NOT NULL, name text, slug text UNIQUE, toyyibpay_secret_key text);
    CREATE TABLE public.workshop_members (workshop_id uuid, user_id uuid, role text);
    CREATE TABLE public.jobs (
      id uuid PRIMARY KEY, workshop_id uuid REFERENCES public.workshops, plate text NOT NULL, owner text NOT NULL,
      car text NOT NULL, phone text, notes text, stage text, date_in date, type text, total_amount numeric,
      downpayment numeric DEFAULT 0, discount numeric DEFAULT 0, paid boolean DEFAULT false, archived boolean DEFAULT false,
      services jsonb DEFAULT '[]', customer_email text, updated_by text, assigned_to text, payment_method text,
      next_service_date date, est_completion date, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE public.job_attachments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES public.jobs ON DELETE CASCADE,
      type text, url text, caption text, stage text, created_at timestamptz DEFAULT now());
    ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workshop_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

    -- The production policies of 30 Sep 2026 that matter here.
    CREATE POLICY workshops_public_read ON public.workshops FOR SELECT USING (true);
    CREATE POLICY members_self_read ON public.workshop_members FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY jobs_owner ON public.jobs FOR ALL
      USING (workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = auth.uid()))
      WITH CHECK (workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = auth.uid()));
    CREATE POLICY jobs_public_read ON public.jobs FOR SELECT USING (archived = false);
    CREATE POLICY jobs_worker_read ON public.jobs FOR SELECT
      USING (workshop_id IN (SELECT workshop_id FROM public.workshop_members WHERE user_id = auth.uid()));
    CREATE POLICY owners_manage_attachments ON public.job_attachments FOR ALL TO authenticated
      USING (job_id IN (SELECT id FROM public.jobs WHERE workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = auth.uid())));
    CREATE POLICY attachments_public_read ON public.job_attachments FOR SELECT USING (true);
    CREATE POLICY workers_read_attachments ON public.job_attachments FOR SELECT TO authenticated
      USING (job_id IN (SELECT j.id FROM public.jobs j JOIN public.workshop_members wm ON wm.workshop_id = j.workshop_id WHERE wm.user_id = auth.uid()));
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments');
    GRANT SELECT, INSERT, DELETE ON storage.objects TO anon, authenticated;

    INSERT INTO public.workshops (id, owner_id, name, slug) VALUES ('${wsA}', '${A}', 'A', 'bengkel-a'), ('${wsB}', '${B}', 'B', 'bengkel-b');
    INSERT INTO public.workshop_members VALUES ('${wsA}', '${W}', 'worker');
    INSERT INTO public.jobs (id, workshop_id, plate, owner, car, phone, notes, stage, total_amount, discount, downpayment, paid, archived,
                             services, customer_email, updated_by, assigned_to, payment_method, created_at) VALUES
      ('${jA1}', '${wsA}', 'WXY1234', 'Ahmad Fauzi', 'Toyota Vios', '012-345 6789', 'Warna asal', 'painting', 900, 50, 200, false, false,
       '[{"description":"Cat pintu","category_name":"Cat","qty":2,"unit_price":450,"amount":900,"inventory_item_id":"inv-1","stock_deducted":true,"qty_deducted":1}]',
       'ahmad@gmail.com', 'hafiz@a.my', 'Hafiz', 'cash', now() - interval '2 days'),
      ('${jA1old}', '${wsA}', 'WXY1234', 'Ahmad Fauzi', 'Toyota Vios', '0199999999', null, 'siap', 300, 0, 300, true, false,
       '[]', null, null, null, null, now() - interval '60 days'),
      ('${jA2}', '${wsA}', 'BKD5678', 'Ahmad Fauzi', 'Honda Civic', '+60 12-345 6789', null, 'ready', 500, 0, 0, false, false,
       '[]', null, null, null, null, now() - interval '1 day'),
      ('${jA3}', '${wsA}', 'VFH902', 'Lim', 'Myvi', '0123456789', null, 'siap', 100, 0, 100, true, true,
       '[]', null, null, null, null, now() - interval '10 days'),
      ('${jB1}', '${wsB}', 'WXY1234', 'Other Customer', 'Proton Saga', '0123456789', null, 'ready', 50, 0, 0, false, false,
       '[]', null, null, null, null, now());
    INSERT INTO public.job_attachments (job_id, type, url, stage, created_at) VALUES
      ('${jA1}', 'photo',   'https://x/photos/a1/after.jpg',  'polish', now() - interval '1 hour'),
      ('${jA1}', 'photo',   'https://x/photos/a1/before.jpg', 'ready',  now() - interval '2 days'),
      ('${jA1}', 'receipt', 'https://x/receipts/a1/bank.jpg', '',       now());
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('attachments', 'photos/${jA1}/1.jpg'), ('attachments', 'receipts/${jA1}/1.jpg'), ('attachments', 'logos/${wsA}/1.png'),
      ('attachments', 'photos/${jB1}/1.jpg'), ('attachments', 'photos/${gone}/orphan.jpg');
  `)
  await db.exec(await migration('20260930120100_attachments_and_secret_hardening.sql'))
  await db.exec(await migration('20260930130000_tracking_lookup.sql'))
})
after(async () => { await db?.close() })

test('plate lookup: exact plate in that workshop only, its latest job, spacing and case ignored', async () => {
  await as('anon')
  const r = await track('bengkel-a', ' wxy 1234 ')
  assert.equal(r.length, 1)
  assert.equal(r[0].id, jA1)
  const other = await track('bengkel-b', 'WXY1234')
  assert.deepEqual(other.map(j => j.id), [jB1])
})

test('no wildcards, partial plates or partial phone numbers', async () => {
  await as('anon')
  for (const plate of ['%', '_', 'WXY%', '%1234', 'WXY123', '_XY1234', 'WXY12345']) {
    assert.deepEqual(await track('bengkel-a', plate), [], plate)
  }
  for (const phone of ['6789', '12345', '0123456', '23456789', '1234567890', '%', '']) {
    assert.deepEqual(await track('bengkel-a', null, phone), [], phone)
  }
  assert.deepEqual(await track('bengkel-a'), [])
})

test('phone lookup: the full number in any common format finds every active car on it', async () => {
  await as('anon')
  for (const phone of ['012-345 6789', '0123456789', '+60123456789', '60 12 345 6789', '123456789']) {
    const r = await track('bengkel-a', null, phone)
    assert.deepEqual(r.map(j => j.id), [jA2, jA1], phone)   // newest first; the archived VFH902 is left out
  }
})

test('archived jobs, other workshops and unknown workshops never come back', async () => {
  await as('anon')
  assert.deepEqual(await track('bengkel-a', 'VFH902'), [])
  assert.deepEqual(await track('bengkel-b', null, '0199999999'), [])
  assert.deepEqual(await track('no-such-workshop', 'WXY1234'), [])
})

test('only what the tracking page shows: masked phone, photos only, no staff or stock fields', async () => {
  await as('anon')
  const [job] = await track('bengkel-a', 'WXY1234')
  assert.deepEqual(Object.keys(job).sort(), [
    'car', 'created_at', 'date_in', 'discount', 'downpayment', 'est_completion', 'id', 'job_attachments', 'notes',
    'owner', 'paid', 'phone', 'plate', 'services', 'stage', 'total_amount', 'type', 'updated_at'])
  assert.equal(job.phone, '•••• 6789')
  assert.deepEqual(job.job_attachments.map(a => a.stage), ['ready', 'polish'])   // oldest first: before, then after
  assert.ok(job.job_attachments.every(a => a.type === 'photo'))
  assert.deepEqual(job.services, [{ description: 'Cat pintu', category_name: 'Cat', qty: 2, unit_price: 450, amount: 900 }])
  assert.equal(Number(job.total_amount), 900)
})

test('landing page totals count everything and work logged out', async () => {
  await as('anon')
  const { rows: [{ r }] } = await db.query('SELECT public.platform_stats() AS r')
  assert.deepEqual(r, { workshops: 2, jobs: 5, paid: 2, photos: 2 })
})

test('both functions run with fixed search paths as the table owner', async () => {
  await as('postgres')
  const { rows } = await db.query(`SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('track_jobs', 'platform_stats') ORDER BY proname`)
  assert.equal(rows.length, 2)
  for (const r of rows) {
    assert.equal(r.prosecdef, true, r.proname)
    assert.deepEqual(r.proconfig, ['search_path=""'], r.proname)
  }
})

test('before the second migration, the old public read is still open (what it closes)', async () => {
  await as('anon')
  assert.equal(await count('SELECT count(*) AS n FROM public.jobs'), 4)
  assert.equal(await count('SELECT count(*) AS n FROM public.job_attachments'), 3)
  assert.equal(await count('SELECT count(*) AS n FROM storage.objects'), 5)
})

test('after the second migration, logged-out visitors can read no jobs, photos or file names', async () => {
  await as('postgres')
  await db.exec(await migration('20260930130100_close_public_job_reads.sql'))
  await as('anon')
  assert.equal(await count('SELECT count(*) AS n FROM public.jobs'), 0)
  assert.equal(await count('SELECT count(*) AS n FROM public.job_attachments'), 0)
  assert.equal(await count('SELECT count(*) AS n FROM storage.objects'), 0)
  // The tracking page keeps working through the function.
  assert.equal((await track('bengkel-a', 'WXY1234'))[0].id, jA1)
})

test('signed-in users see only their own workshop: owners everything, workers their jobs', async () => {
  await as('authenticated', S)
  assert.equal(await count('SELECT count(*) AS n FROM public.jobs'), 0)
  assert.equal(await count('SELECT count(*) AS n FROM public.job_attachments'), 0)
  await as('authenticated', B)
  assert.deepEqual((await db.query('SELECT id FROM public.jobs')).rows.map(r => r.id), [jB1])
  await as('authenticated', A)
  assert.equal(await count('SELECT count(*) AS n FROM public.jobs'), 4)   // archived included
  assert.equal(await count('SELECT count(*) AS n FROM public.job_attachments'), 3)
  await as('authenticated', W)
  assert.equal(await count('SELECT count(*) AS n FROM public.jobs'), 4)
  assert.equal(await count('SELECT count(*) AS n FROM public.job_attachments'), 3)
})

test('file names: members see their own workshop\'s files (storage needs that to delete them)', async () => {
  const names = async () => (await db.query('SELECT name FROM storage.objects ORDER BY name')).rows.map(r => r.name.split('/')[0] + '/' + (r.name.includes(gone) ? 'gone' : r.name.includes(jB1) ? 'B' : 'A'))
  await as('authenticated', S)
  assert.deepEqual(await names(), ['photos/gone'])
  await as('authenticated', B)
  assert.deepEqual(await names(), ['photos/B', 'photos/gone'])
  await as('authenticated', W)
  assert.deepEqual(await names(), ['photos/A', 'photos/gone', 'receipts/A'])
  await as('authenticated', A)
  assert.deepEqual(await names(), ['logos/A', 'photos/A', 'photos/gone', 'receipts/A'])
  assert.equal((await db.query(`DELETE FROM storage.objects WHERE name = 'logos/${wsA}/1.png' RETURNING id`)).rows.length, 1)
})
