import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Workshop A (owner A, worker W) has live ToyyibPay keys, B is in sandbox mode, C has no keys.
// S is signed in but works nowhere.
const A = '10000000-0000-4000-8000-00000000000a', B = '10000000-0000-4000-8000-00000000000b'
const C = '10000000-0000-4000-8000-00000000000c', W = '10000000-0000-4000-8000-0000000000aa'
const S = '10000000-0000-4000-8000-0000000000ff'
const wsA = '20000000-0000-4000-8000-00000000000a', wsB = '20000000-0000-4000-8000-00000000000b'
const wsC = '20000000-0000-4000-8000-00000000000c', jA1 = '30000000-0000-4000-8000-0000000000a1'

let db
const migration = name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
async function as(role, uid = '') {
  await db.exec(`RESET ROLE; SELECT set_config('test.uid', '${uid}', false); SET ROLE ${role};`)
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0]
const count = async (sql) => Number((await one(sql)).n)
const lookup = async (slug) => (await one('SELECT public.workshop_public($1) AS r', [slug])).r

before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;

    -- The production columns of public.workshops (2 Oct 2026).
    CREATE TABLE public.workshops (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL, name text, slug text UNIQUE, phone text, address text,
      logo_url text, instagram text, tiktok text, stages jsonb, plan text, early_bird boolean, trial_ends_at timestamptz,
      paid_until timestamptz, toyyibpay_category_code text, toyyibpay_sandbox boolean, toyyibpay_secret_set boolean,
      created_at timestamptz DEFAULT now());
    CREATE TABLE public.workshop_members (workshop_id uuid, user_id uuid, role text);
    CREATE TABLE public.jobs (
      id uuid PRIMARY KEY, workshop_id uuid REFERENCES public.workshops, plate text NOT NULL, owner text NOT NULL,
      car text NOT NULL, phone text, notes text, stage text, date_in date, type text, total_amount numeric,
      downpayment numeric DEFAULT 0, discount numeric DEFAULT 0, paid boolean DEFAULT false, archived boolean DEFAULT false,
      services jsonb DEFAULT '[]', est_completion date, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE public.job_attachments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES public.jobs ON DELETE CASCADE,
      type text, url text, caption text, stage text, created_at timestamptz DEFAULT now());
    ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workshop_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

    -- The production policies of 2 Oct 2026 that matter here.
    CREATE FUNCTION public.get_my_workshop_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT workshop_id FROM workshop_members WHERE user_id = auth.uid() LIMIT 1 $$;
    CREATE POLICY workshops_public_read ON public.workshops FOR SELECT USING (true);
    CREATE POLICY workshops_owner ON public.workshops FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
    CREATE POLICY read_workshops_safe ON public.workshops FOR SELECT TO authenticated
      USING (owner_id = auth.uid() OR id = public.get_my_workshop_id());
    CREATE POLICY members_self_read ON public.workshop_members FOR SELECT USING (user_id = auth.uid());
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

    INSERT INTO auth.users VALUES ('${A}'), ('${B}'), ('${C}'), ('${W}'), ('${S}');
    INSERT INTO public.workshops (id, owner_id, name, slug, phone, address, logo_url, instagram, tiktok, stages, plan, early_bird,
                                  trial_ends_at, toyyibpay_category_code, toyyibpay_sandbox, toyyibpay_secret_set) VALUES
      ('${wsA}', '${A}', 'Bengkel A', 'bengkel-a', '012-3456789', 'Lot 1, Jalan A', 'https://x/logos/a.png', 'bengkela', 'bengkela',
       '["Terima","Siap"]', 'trial', true, now() + interval '9 months', 'cat123', false, true),
      ('${wsB}', '${B}', 'Bengkel B', 'bengkel-b', '019-0000000', 'Lot 2', null, null, null, null, 'trial', true, now(), 'cat999', true, true),
      ('${wsC}', '${C}', 'Bengkel C', 'bengkel-c', null, null, null, null, null, null, 'trial', false, now(), null, null, false);
    INSERT INTO public.workshop_members VALUES ('${wsA}', '${W}', 'worker');
    INSERT INTO public.jobs (id, workshop_id, plate, owner, car, phone, stage, total_amount)
      VALUES ('${jA1}', '${wsA}', 'WXY1234', 'Ahmad Fauzi bin Ali', 'Toyota Vios', '012-345 6789', 'painting', 900);
  `)
  await db.exec(await migration('20260930130000_tracking_lookup.sql'))
  await db.exec(await migration('20261002120100_public_lookup_minimisation.sql'))
  await db.exec(await migration('20261002120200_legal_acceptances.sql'))
})
after(async () => { await db?.close() })

test('workshop_public: one workshop by exact slug, only what the tracking page shows', async () => {
  await as('anon')
  const a = await lookup('bengkel-a')
  assert.deepEqual(Object.keys(a).sort(), ['address', 'instagram', 'logo_url', 'name', 'online_payments', 'phone', 'slug', 'stages', 'tiktok'])
  assert.equal(a.address, 'Lot 1, Jalan A')   // printed on the invoice the customer opens
  assert.equal(a.name, 'Bengkel A')
  assert.equal(a.phone, '012-3456789')
  assert.deepEqual(a.stages, ['Terima', 'Siap'])
  for (const slug of ['no-such-workshop', 'bengkel-%', 'bengkel_a', 'BENGKEL-A', '']) assert.equal(await lookup(slug), null, slug)
})

test('workshop_public: the pay button only with live ToyyibPay keys', async () => {
  await as('anon')
  assert.equal((await lookup('bengkel-a')).online_payments, true)
  assert.equal((await lookup('bengkel-b')).online_payments, false)   // sandbox
  assert.equal((await lookup('bengkel-c')).online_payments, false)   // no keys
})

test('customer names on the tracking page: first name and an initial', async () => {
  await as('anon')
  const [job] = (await one('SELECT public.track_jobs($1, $2) AS r', ['bengkel-a', 'WXY1234'])).r
  assert.equal(job.owner, 'Ahmad F.')
  await as('postgres')
  const cases = {
    'Ahmad Fauzi': 'Ahmad F.', 'Siti binti Ali': 'Siti A.', 'Siti Bt Ali': 'Siti A.', 'Ramesh a/l Kumar': 'Ramesh K.',
    'Priya A/P Raj': 'Priya R.', 'Muhammad Ali bin Abu': 'Muhammad A.', 'Lim': 'Lim', 'lim  wei   ming': 'lim W.',
    'Bintang Holdings': 'Bintang H.', '  ': null, '': null,
  }
  for (const [name, masked] of Object.entries(cases)) {
    assert.equal((await one('SELECT public.mask_person_name($1) AS r', [name])).r, masked, name)
  }
  assert.equal((await one('SELECT public.mask_person_name(NULL) AS r')).r, null)
  await as('anon')
  await assert.rejects(db.query(`SELECT public.mask_person_name('x')`), /permission denied/)
})

test('before the closing migration: anyone can list every workshop (what it closes)', async () => {
  await as('anon')
  assert.equal(await count('SELECT count(*) AS n FROM public.workshops'), 3)
  const row = await one(`SELECT phone, address, owner_id, trial_ends_at FROM public.workshops WHERE slug = 'bengkel-a'`)
  assert.equal(row.address, 'Lot 1, Jalan A')
})

test('after it: logged-out visitors read no workshops; owners and workers keep their own', async () => {
  await as('postgres')
  await db.exec(await migration('20261002120300_close_public_workshop_reads.sql'))
  await as('anon')
  assert.equal(await count('SELECT count(*) AS n FROM public.workshops'), 0)
  assert.equal((await lookup('bengkel-a')).name, 'Bengkel A')   // the tracking page still works
  await as('authenticated', S)
  assert.equal(await count('SELECT count(*) AS n FROM public.workshops'), 0)
  await as('authenticated', A)
  assert.deepEqual((await db.query('SELECT slug FROM public.workshops')).rows.map(r => r.slug), ['bengkel-a'])
  await as('authenticated', W)
  assert.deepEqual((await db.query('SELECT slug FROM public.workshops')).rows.map(r => r.slug), ['bengkel-a'])
})

test('consent records: users add their own, the time is the server\'s, nothing can be edited', async () => {
  await as('authenticated', A)
  const before = Date.now()
  const r = await one(`INSERT INTO public.legal_acceptances (version, accepted_at) VALUES ('2026-10-02', '2001-01-01') RETURNING user_id, accepted_at`)
  assert.equal(r.user_id, A)
  assert.ok(new Date(r.accepted_at).getTime() >= before - 5000, 'back-dated acceptance kept')
  await assert.rejects(db.query(`INSERT INTO public.legal_acceptances (version) VALUES ('2026-10-02')`), /duplicate key/)
  await assert.rejects(db.query(`INSERT INTO public.legal_acceptances (user_id, version) VALUES ('${B}', '2026-10-02')`), /row-level security/)
  await assert.rejects(db.query(`INSERT INTO public.legal_acceptances (version) VALUES ('v1')`), /check constraint/)
  await assert.rejects(db.query(`UPDATE public.legal_acceptances SET version = '2027-01-01'`), /permission denied/)
  await assert.rejects(db.query(`DELETE FROM public.legal_acceptances`), /permission denied/)
  await as('authenticated', B)
  assert.equal(await count('SELECT count(*) AS n FROM public.legal_acceptances'), 0)
  await as('anon')
  await assert.rejects(db.query('SELECT count(*) FROM public.legal_acceptances'), /permission denied/)
  await as('authenticated', A)
  assert.equal(await count('SELECT count(*) AS n FROM public.legal_acceptances'), 1)
})

test('new functions run with fixed search paths; the lookup runs as the table owner', async () => {
  await as('postgres')
  const { rows } = await db.query(`SELECT proname, prosecdef, proconfig FROM pg_proc
    WHERE proname IN ('workshop_public', 'mask_person_name', 'track_jobs', 'legal_acceptance_time') ORDER BY proname`)
  assert.deepEqual(rows.map(r => [r.proname, r.prosecdef]), [
    ['legal_acceptance_time', false], ['mask_person_name', false], ['track_jobs', true], ['workshop_public', true]])
  for (const r of rows) assert.deepEqual(r.proconfig, ['search_path=""'], r.proname)
})
