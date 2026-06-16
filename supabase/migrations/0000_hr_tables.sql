-- ============================================================================
-- HR / Payroll base tables — RUN THIS FIRST (before 0001 and 0002).
-- Without these tables, the Pekerja/Payroll page fails with
-- "Could not find the table 'public.employees' in the schema cache".
-- Idempotent: safe to run more than once.
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  user_id text,
  name text NOT NULL,
  ic_number text,
  phone text,
  position text,
  basic_salary numeric(10,2) NOT NULL DEFAULT 0,
  epf_number text,
  socso_number text,
  bank_name text,
  bank_account text,
  is_epf boolean DEFAULT true,
  is_socso boolean DEFAULT true,
  is_eis boolean DEFAULT true,
  employment_type text DEFAULT 'full_time',
  start_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_employees" ON employees
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "workers_self_profile" ON employees
    FOR ALL USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL,
  status text DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workshop_id, year, month)
);
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_payroll_runs" ON payroll_runs
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary numeric(10,2) DEFAULT 0,
  allowances numeric(10,2) DEFAULT 0,
  pcb numeric(10,2) DEFAULT 0,
  other_deductions numeric(10,2) DEFAULT 0,
  gross_salary numeric(10,2) DEFAULT 0,
  epf_employee numeric(10,2) DEFAULT 0,
  epf_employer numeric(10,2) DEFAULT 0,
  socso_employee numeric(10,2) DEFAULT 0,
  socso_employer numeric(10,2) DEFAULT 0,
  eis_employee numeric(10,2) DEFAULT 0,
  eis_employer numeric(10,2) DEFAULT 0,
  net_salary numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_payroll_entries" ON payroll_entries
    FOR ALL USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tell PostgREST to refresh its schema cache so the new tables are visible
-- immediately (otherwise you may still get "schema cache" errors for ~seconds).
NOTIFY pgrst, 'reload schema';
