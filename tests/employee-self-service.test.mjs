import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Workshop A: owner A, workers W and V. Workshop B: owner B. E is W's employee row in A.
const A = '10000000-0000-4000-8000-00000000000a', B = '10000000-0000-4000-8000-00000000000b'
const W = '10000000-0000-4000-8000-0000000000aa', V = '10000000-0000-4000-8000-0000000000ab'
const wsA = '20000000-0000-4000-8000-00000000000a', wsB = '20000000-0000-4000-8000-00000000000b'
const E = '40000000-0000-4000-8000-0000000000e1', run = '50000000-0000-4000-8000-000000000001'

let db
const migration = name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
async function as(role, uid = '') {
  await db.exec(`RESET ROLE; SELECT set_config('test.uid', '${uid}', false); SET ROLE ${role};`)
}
const row = async () => { await as('postgres'); return (await db.query(`SELECT * FROM public.employees WHERE id = '${E}'`)).rows[0] }
const rejects = (sql, pattern) => assert.rejects(db.query(sql), pattern)

before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.role', true), '') $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;

    CREATE TABLE public.workshops (id uuid PRIMARY KEY, owner_id uuid NOT NULL, name text);
    CREATE TABLE public.workshop_members (workshop_id uuid, user_id uuid, role text);
    -- Same columns as production public.employees.
    CREATE TABLE public.employees (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid REFERENCES public.workshops ON DELETE CASCADE,
      user_id text, name text NOT NULL, ic_number text, phone text, position text,
      basic_salary numeric(10,2) NOT NULL DEFAULT 0, epf_number text, socso_number text, bank_name text, bank_account text,
      is_epf boolean DEFAULT true, is_socso boolean DEFAULT true, is_eis boolean DEFAULT true,
      employment_type text DEFAULT 'full_time', start_date date, status text DEFAULT 'active', created_at timestamptz DEFAULT now());
    CREATE TABLE public.payroll_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payroll_run_id uuid, employee_id uuid REFERENCES public.employees ON DELETE CASCADE, basic_salary numeric(10,2));
    ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workshop_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

    -- The production policies of 2 Oct 2026 that matter here.
    CREATE POLICY workshops_owner ON public.workshops FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
    CREATE POLICY members_self_read ON public.workshop_members FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY owners_manage_employees ON public.employees FOR ALL
      USING (workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = auth.uid()));
    CREATE POLICY workers_self_profile ON public.employees FOR ALL USING (user_id = auth.uid()::text);
    CREATE POLICY workers_read_own_entries ON public.payroll_entries FOR SELECT
      USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()::text));
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

    INSERT INTO public.workshops VALUES ('${wsA}', '${A}', 'A'), ('${wsB}', '${B}', 'B');
    INSERT INTO public.workshop_members VALUES ('${wsA}', '${W}', 'worker'), ('${wsA}', '${V}', 'worker');
    INSERT INTO public.employees (id, workshop_id, user_id, name, basic_salary)
      VALUES ('${E}', '${wsA}', '${W}', 'Hafiz Rahman', 2200);
    INSERT INTO public.payroll_entries (payroll_run_id, employee_id, basic_salary) VALUES ('${run}', '${E}', 2200);
  `)
})
after(async () => { await db?.close() })

test('before the fix: a worker could raise their own salary through the API', async () => {
  await as('authenticated', W)
  await db.query(`UPDATE public.employees SET basic_salary = 9999 WHERE id = '${E}'`)
  assert.equal(Number((await row()).basic_salary), 9999)
  await db.query(`UPDATE public.employees SET basic_salary = 2200 WHERE id = '${E}'`)   // put it back (as postgres)
  await db.exec(await migration('20261002120000_employee_self_service_limits.sql'))
})

test('a worker can still fill in their IC, EPF/SOCSO numbers and bank details', async () => {
  await as('authenticated', W)
  const { rows } = await db.query(`UPDATE public.employees
    SET ic_number = '900101-14-5678', epf_number = '12345678', socso_number = 'S1', bank_name = 'Maybank', bank_account = '1122'
    WHERE id = '${E}' RETURNING id`)
  assert.equal(rows.length, 1)
  const r = await row()
  assert.equal(r.ic_number, '900101-14-5678')
  assert.equal(r.bank_account, '1122')
})

test('a worker cannot change pay, contributions, status, name or workshop', async () => {
  await as('authenticated', W)
  for (const set of [
    'basic_salary = 9999', 'is_epf = false', 'is_socso = false', 'is_eis = false', "status = 'inactive'",
    "name = 'Someone Else'", "position = 'Pengurus'", "employment_type = 'part_time'", "start_date = '2020-01-01'",
    `workshop_id = '${wsB}'`, `user_id = '${V}'`,
  ]) {
    await rejects(`UPDATE public.employees SET ${set} WHERE id = '${E}'`, /Only the workshop owner/, set)
  }
  assert.equal(Number((await row()).basic_salary), 2200)
})

test('a worker cannot delete their record (and with it their payslips)', async () => {
  await as('authenticated', W)
  const { rows } = await db.query(`DELETE FROM public.employees WHERE id = '${E}' RETURNING id`)
  assert.equal(rows.length, 0)
  await as('postgres')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.payroll_entries')).rows[0].n, 1)
})

test('a new worker profile starts with no pay, and only in their own workshop', async () => {
  await as('authenticated', V)
  const { rows: [created] } = await db.query(`INSERT INTO public.employees (workshop_id, user_id, name, basic_salary, status, is_epf)
    VALUES ('${wsA}', '${V}', 'Vinod', 8000, 'inactive', false) RETURNING basic_salary, status, is_epf`)
  assert.equal(Number(created.basic_salary), 0)
  assert.equal(created.status, 'active')
  assert.equal(created.is_epf, true)
  await rejects(`INSERT INTO public.employees (workshop_id, user_id, name) VALUES ('${wsB}', '${V}', 'Vinod')`, /row-level security/)
  await rejects(`INSERT INTO public.employees (workshop_id, user_id, name) VALUES ('${wsA}', '${W}', 'Hafiz')`, /row-level security/)
})

test('workers see only their own record; logged-out visitors see none', async () => {
  await as('authenticated', V)
  const names = (await db.query('SELECT name FROM public.employees ORDER BY name')).rows.map(r => r.name)
  assert.deepEqual(names, ['Vinod'])
  await as('anon')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.employees')).rows[0].n, 0)
})

test('the owner still manages everything, including pay and removal', async () => {
  await as('authenticated', A)
  await db.query(`UPDATE public.employees SET basic_salary = 2500, status = 'inactive', is_epf = false WHERE id = '${E}'`)
  const r = await row()
  assert.equal(Number(r.basic_salary), 2500)
  assert.equal(r.status, 'inactive')
  // Another workshop's owner cannot touch it.
  await as('authenticated', B)
  const { rows } = await db.query(`UPDATE public.employees SET basic_salary = 1 WHERE id = '${E}' RETURNING id`)
  assert.equal(rows.length, 0)
  await as('authenticated', A)
  assert.equal((await db.query(`DELETE FROM public.employees WHERE id = '${E}' RETURNING id`)).rows.length, 1)
})

test('the guard runs as the caller (so it sees the real role) with a fixed search path', async () => {
  await as('postgres')
  const { rows: [fn] } = await db.query(`SELECT prosecdef, proconfig FROM pg_proc WHERE proname = 'employees_owner_fields'`)
  assert.equal(fn.prosecdef, false)
  assert.deepEqual(fn.proconfig, ['search_path=""'])
})
