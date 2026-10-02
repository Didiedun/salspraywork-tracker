-- Workers fill in their own HR details (IC, EPF/SOCSO numbers, bank account) from the
-- worker app, through the "workers_self_profile" policy. That policy was FOR ALL with
-- no WITH CHECK, so a worker could change every column of their own row through the
-- API, not just the ones the app shows them:
--   * basic_salary, which "Proses Gaji Bulan Ini" copies into the payslip,
--   * status, the EPF/SOCSO/EIS switches, or the workshop the row belongs to,
--   * or delete the row, which cascades to their payslips (payroll_entries).
-- Replace it with separate read / create / update policies (no delete) and a trigger
-- that leaves pay and employment details to the workshop owner.
-- Safe to apply before or after the frontend deploy: the app only ever sends the
-- self-service fields (WorkerView.saveProfile).

DROP POLICY IF EXISTS "workers_self_profile" ON public.employees;
DROP POLICY IF EXISTS "workers_read_own_profile" ON public.employees;
DROP POLICY IF EXISTS "workers_create_own_profile" ON public.employees;
DROP POLICY IF EXISTS "workers_update_own_profile" ON public.employees;

CREATE POLICY "workers_read_own_profile" ON public.employees FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

-- A worker may create their own profile, and only in a workshop they belong to.
CREATE POLICY "workers_create_own_profile" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())::text
    AND workshop_id IN (SELECT m.workshop_id FROM public.workshop_members m WHERE m.user_id = (SELECT auth.uid())));

CREATE POLICY "workers_update_own_profile" ON public.employees FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);
-- No DELETE policy for workers: only the owner removes an employee (owners_manage_employees).

-- Columns a worker may set on their own row. Everything else belongs to the owner.
-- Runs as the caller (not SECURITY DEFINER) so current_user is the real role; owners
-- can always read their own workshop row, which is all the ownership check needs.
CREATE OR REPLACE FUNCTION public.employees_owner_fields() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  ws uuid := CASE WHEN TG_OP = 'UPDATE' THEN OLD.workshop_id ELSE NEW.workshop_id END;
BEGIN
  -- The service role, the dashboard / SQL editor and the workshop's owner may change anything.
  IF coalesce(auth.role(), current_user::text) IN ('service_role', 'postgres', 'supabase_admin')
     OR EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = ws AND w.owner_id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A worker's own profile starts with no pay; the owner sets salary and contributions.
    NEW.basic_salary := 0;
    NEW.status := 'active';
    NEW.is_epf := true;
    NEW.is_socso := true;
    NEW.is_eis := true;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.workshop_id IS DISTINCT FROM OLD.workshop_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.name IS DISTINCT FROM OLD.name
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.basic_salary IS DISTINCT FROM OLD.basic_salary
     OR NEW.is_epf IS DISTINCT FROM OLD.is_epf
     OR NEW.is_socso IS DISTINCT FROM OLD.is_socso
     OR NEW.is_eis IS DISTINCT FROM OLD.is_eis
     OR NEW.employment_type IS DISTINCT FROM OLD.employment_type
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the workshop owner can change pay or employment details'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.employees_owner_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_employees_owner_fields ON public.employees;
CREATE TRIGGER trg_employees_owner_fields
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.employees_owner_fields();
