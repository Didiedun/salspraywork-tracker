-- Quotations (sebut harga): a priced offer given to a customer before any work starts.
-- An accepted quotation becomes a job (job_id); the quotation itself is kept for reference.
-- Owner-only: quotations carry prices, so workers and the public get no access.

CREATE TABLE IF NOT EXISTS public.quotations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  customer_name  text NOT NULL DEFAULT '',
  customer_phone text,
  plate          text,
  car            text,
  -- Same line shape as jobs.services: {description, qty, unit_price, amount, ...}
  items          jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  discount       numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  notes          text,
  valid_until    date,
  job_id         uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotations_workshop_created_idx
  ON public.quotations (workshop_id, created_at DESC);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotations_owner_all" ON public.quotations;
CREATE POLICY "quotations_owner_all" ON public.quotations FOR ALL TO authenticated
  USING      (workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = (SELECT auth.uid())))
  WITH CHECK (workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = (SELECT auth.uid())));

REVOKE ALL ON public.quotations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
