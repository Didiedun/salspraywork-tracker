-- ============================================================================
-- Invoice discount — a fixed RM amount taken off the job total.
-- Net total = total_amount - discount; balance = net total - downpayment.
-- Safe to run once in the Supabase SQL editor.
-- ============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
