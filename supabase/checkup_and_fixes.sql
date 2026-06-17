-- ============================================================================
-- Digital Depot — Supabase checkup & fixes
-- HOW TO USE:
--   • Open Supabase → SQL Editor.
--   • PART 1 = read-only diagnostics. Run each query ON ITS OWN (highlight it →
--     Run) so you can read each result, and paste the results back to me.
--   • PART 2 = safe fixes. Run each lettered block (2A, 2B, 2C) as a whole.
--     They're idempotent — safe to run even if you've run them before.
--   • PART 3 = delete hand-inserted jobs (fill in the value first).
--   • PART 4 = waits until I see the PART 1C result.
-- ============================================================================


-- ============================================================================
-- PART 1 — DIAGNOSTICS  (read-only · run each separately · paste me the output)
-- ============================================================================

-- 1A. Which tables still have RLS turned OFF (should come back EMPTY after fixes)
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;

-- 1B. Wide-open policies (anything listed here is a hole — USING/CHECK = true)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, cmd;

-- 1C. Full policies on the 3 tables I still need to fix safely (incl. roles)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('job_attachments', 'workshop_invites', 'workshops')
ORDER BY tablename, cmd;

-- 1D. Do you OWN the workshop your jobs live in? (explains the delete button)
--     Compare owner_id below to YOUR user UID from Auth → Users → your email.
SELECT j.plate, j.workshop_id, w.name AS workshop, w.owner_id
FROM jobs j
LEFT JOIN workshops w ON w.id = j.workshop_id
ORDER BY j.created_at DESC
LIMIT 10;


-- ============================================================================
-- PART 2 — SECURITY FIXES  (safe · idempotent · run each block as a whole)
-- ============================================================================

-- ----- 2A. Service catalog RLS (closes the Supabase advisor alert) -----------
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_service_categories" ON service_categories
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_service_items" ON service_items
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE service_variants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_service_variants" ON service_variants
    FOR ALL USING (
      item_id IN (
        SELECT id FROM service_items
        WHERE workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';

-- ----- 2B. Remove the wide-open "anyone" policies on jobs --------------------
-- Keeps jobs_owner (owner full control), jobs_worker_read, workers_update_jobs,
-- and jobs_public_read (active jobs only, for the customer tracker).
DROP POLICY IF EXISTS "Can delete jobs"     ON jobs;   -- was DELETE using true
DROP POLICY IF EXISTS "Can update jobs"     ON jobs;   -- was UPDATE using true
DROP POLICY IF EXISTS "Can insert jobs"     ON jobs;   -- was INSERT check true
DROP POLICY IF EXISTS "Public can read jobs" ON jobs;  -- was SELECT using true
DROP POLICY IF EXISTS "workers_read_jobs"   ON jobs;   -- duplicate of jobs_worker_read

NOTIFY pgrst, 'reload schema';

-- ----- 2C. Payroll recursion fix (only matters if you use Payroll) ----------
-- Fixes "infinite recursion detected in policy for relation payroll_runs".
DROP POLICY IF EXISTS "workers_read_own_runs"    ON payroll_runs;
DROP POLICY IF EXISTS "workers_read_own_entries" ON payroll_entries;

CREATE POLICY "workers_read_own_runs" ON payroll_runs
  FOR SELECT USING (
    workshop_id IN (SELECT workshop_id FROM employees WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "workers_read_own_entries" ON payroll_entries
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()::text)
  );

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- PART 3 — DELETE HAND-INSERTED / STUCK JOBS  (SQL editor bypasses RLS)
-- ============================================================================

-- See them first:
SELECT id, plate, created_at FROM jobs ORDER BY created_at DESC;

-- Your 3 hand-inserted seed jobs all share the timestamp 2026-04-11 — delete them:
DELETE FROM jobs WHERE created_at::date = '2026-04-11';
-- (or delete a single one by id:)
-- DELETE FROM jobs WHERE id = '3730e945-fe1b-4db8-8efd-7c9d88e0a740';


-- ============================================================================
-- PART 4 — close the last holes (attachments + invite codes)  [run as a block]
-- ============================================================================
-- job_attachments: anyone could INSERT/DELETE photos. Remove the public write +
-- duplicate public reads; keep ONE public read (customer tracker needs photos),
-- keep the worker read/insert, and add owner full control.
DROP POLICY IF EXISTS "Public delete" ON job_attachments;
DROP POLICY IF EXISTS "Public insert" ON job_attachments;
DROP POLICY IF EXISTS "Public read"   ON job_attachments;
DROP POLICY IF EXISTS "Public can read job attachments" ON job_attachments;
DO $$ BEGIN
  CREATE POLICY "owners_manage_attachments" ON job_attachments
    FOR ALL TO authenticated
    USING      (job_id IN (SELECT id FROM jobs WHERE workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())))
    WITH CHECK (job_id IN (SELECT id FROM jobs WHERE workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- workshop_invites: codes were world-readable. Joining goes through the
-- join_workshop() RPC, so the client never needs to read them — drop the open read.
DROP POLICY IF EXISTS "invites_public_read" ON workshop_invites;

-- NOTE: workshops_public_read is intentionally KEPT — the public /w/<slug>
-- tracker reads the workshop by slug as an anonymous visitor.

NOTIFY pgrst, 'reload schema';
