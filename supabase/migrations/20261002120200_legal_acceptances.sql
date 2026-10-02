-- When each signed-in user accepted the Terms of Service and Privacy Notice, and which
-- version. The PDPA regulations expect consent to be in a form that can be recorded and
-- kept, so the app writes a row at onboarding (new users) or from a one-time banner
-- (existing users). Users can read their own rows and add new ones; nobody but the
-- service role can change or remove them, and the time is set by the database.
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  version     text NOT NULL CHECK (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version)
);
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_acceptances_read_own" ON public.legal_acceptances;
DROP POLICY IF EXISTS "legal_acceptances_add_own" ON public.legal_acceptances;
CREATE POLICY "legal_acceptances_read_own" ON public.legal_acceptances FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "legal_acceptances_add_own" ON public.legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

-- The acceptance time is the server's, so a client cannot back-date it.
CREATE OR REPLACE FUNCTION public.legal_acceptance_time() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.accepted_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.legal_acceptance_time() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_legal_acceptance_time ON public.legal_acceptances;
CREATE TRIGGER trg_legal_acceptance_time
  BEFORE INSERT ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.legal_acceptance_time();
