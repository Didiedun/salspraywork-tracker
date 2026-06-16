-- ============================================================================
-- Refund tracking. A refund is cash RETURNED to the customer (e.g. a discount
-- applied after they already paid). It is recorded here for audit and used to
-- correct the job's recorded amount paid — it is NOT a P&L expense (revenue is
-- already recognised net of discount). Idempotent — safe to run once.
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text DEFAULT 'cash',
  notes text,
  refund_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "owners_manage_refunds" ON refunds
    FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
