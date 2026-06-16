-- ============================================================================
-- Payroll → Finance link + worker-facing payslips
-- Safe to run once in the Supabase SQL editor.
-- ============================================================================

-- ─── Link payroll runs to the P&L expense they generate ─────────────────────
-- Finalising a payroll run posts a 'gaji' expense; the FK lets it be replaced
-- on re-finalise and auto-removed if the run is deleted.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE;

-- ─── Let workers read their OWN finalised payslips ──────────────────────────
-- employees.user_id is text; auth.uid() is uuid, so cast to match the existing
-- "workers_self_profile" policy.
DO $$ BEGIN
  CREATE POLICY "workers_read_own_entries" ON payroll_entries
    FOR SELECT USING (
      employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: this policy must reference employees DIRECTLY, not payroll_entries.
-- Going through payroll_entries creates a circular RLS reference with that
-- table's "owners_manage_payroll_entries" policy (which queries payroll_runs),
-- causing "infinite recursion detected in policy for relation payroll_runs".
DO $$ BEGIN
  CREATE POLICY "workers_read_own_runs" ON payroll_runs
    FOR SELECT USING (
      workshop_id IN (SELECT workshop_id FROM employees WHERE user_id = auth.uid()::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
