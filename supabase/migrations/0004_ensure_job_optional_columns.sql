-- ============================================================================
-- Ensure all "optional" job columns exist.
-- The app's save fallback strips a column when the DB lacks it; if any of these
-- were missing, saves silently dropped them (incl. discount). Add any missing
-- ones so saves persist every field. Idempotent — safe to run once.
-- ============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS est_completion    date;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS next_service_date date;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to       text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_method    text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS discount          numeric(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
