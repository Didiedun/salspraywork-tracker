-- 0007: Payments bootstrap + platform subscriptions — SELF-CONTAINED, run the
-- whole file once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Creates everything the payment path needs if it doesn't exist yet
-- (payments, payment_events, workshop_secrets, gateway columns) and then the
-- subscription plan columns. After running, set the platform secrets and
-- deploy the edge functions (see steps at the bottom of this file).

-- ── 1. Workshop gateway columns (non-secret) ────────────────
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS toyyibpay_category_code text,
  ADD COLUMN IF NOT EXISTS toyyibpay_sandbox       boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS toyyibpay_secret_set    boolean DEFAULT false;

-- ── 2. Secret store: only service_role (edge functions) can read ──
-- RLS enabled with no policies = clients are denied by default.
CREATE TABLE IF NOT EXISTS workshop_secrets (
  workshop_id          uuid PRIMARY KEY REFERENCES workshops(id) ON DELETE CASCADE,
  toyyibpay_secret_key text,
  updated_at           timestamptz DEFAULT now()
);
ALTER TABLE workshop_secrets ENABLE ROW LEVEL SECURITY;

-- Owners save their gateway via this RPC (write-only; secret never read back).
-- NULL/empty p_secret keeps the existing key.
CREATE OR REPLACE FUNCTION set_toyyibpay_secret(
  p_workshop_id uuid,
  p_secret      text,
  p_category    text,
  p_sandbox     boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workshops WHERE id = p_workshop_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_secret IS NOT NULL AND length(trim(p_secret)) > 0 THEN
    INSERT INTO workshop_secrets (workshop_id, toyyibpay_secret_key, updated_at)
    VALUES (p_workshop_id, trim(p_secret), now())
    ON CONFLICT (workshop_id)
      DO UPDATE SET toyyibpay_secret_key = EXCLUDED.toyyibpay_secret_key, updated_at = now();
  END IF;

  UPDATE workshops SET
    toyyibpay_category_code = trim(p_category),
    toyyibpay_sandbox       = p_sandbox,
    toyyibpay_secret_set    = COALESCE(
      (SELECT length(trim(toyyibpay_secret_key)) > 0
       FROM workshop_secrets WHERE workshop_id = p_workshop_id),
      false)
  WHERE id = p_workshop_id;
END $$;

GRANT EXECUTE ON FUNCTION set_toyyibpay_secret(uuid, text, text, boolean) TO authenticated;

-- ── 3. Payments + webhook dedupe tables ─────────────────────
-- purpose: 'job' (customer pays workshop) | 'subscription_monthly' | 'subscription_annual'
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'job',
  amount_original numeric(10,2) NOT NULL,
  amount_paid numeric(10,2),
  currency text NOT NULL DEFAULT 'MYR',
  provider text NOT NULL DEFAULT 'toyyibpay',
  status text NOT NULL DEFAULT 'pending',
  gateway_ref text,
  gateway_status text,
  gateway_payload jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz
);
-- In case the table already existed from the older in-app migration:
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'job';
ALTER TABLE payments ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners_manage_payments" ON payments;
CREATE POLICY "owners_manage_payments" ON payments
  FOR ALL USING (
    workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())
  );

-- Webhook deduplication — service_role only (RLS on, no policies)
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  payment_id uuid REFERENCES payments(id),
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, event_id)
);
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_manage_events" ON payment_events;

-- Expenses table (Finance page shows a migration banner until this exists)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'other',
  description text,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners_manage_expenses" ON expenses;
CREATE POLICY "owners_manage_expenses" ON expenses
  FOR ALL USING (
    workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid())
  );

-- ── 4. Plan columns ─────────────────────────────────────────
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS plan          text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS early_bird    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_until    timestamptz;

-- Existing workshops registered during the early-bird window: 12 months free from today
UPDATE workshops
SET early_bird = true, trial_ends_at = now() + interval '12 months'
WHERE trial_ends_at IS NULL;

-- New signups: first 10 workshops get early bird (12 months free, RM20/mth after),
-- everyone else gets the 14-day trial. Mirrors the landing-page offer.
CREATE OR REPLACE FUNCTION set_workshop_trial() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM workshops) < 10 THEN
    NEW.early_bird    := true;
    NEW.trial_ends_at := now() + interval '12 months';
  ELSE
    NEW.early_bird    := false;
    NEW.trial_ends_at := now() + interval '14 days';
  END IF;
  NEW.plan := 'trial';
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_workshop_trial ON workshops;
CREATE TRIGGER trg_workshop_trial BEFORE INSERT ON workshops
  FOR EACH ROW EXECUTE FUNCTION set_workshop_trial();

-- Owners can UPDATE their own workshop row (RLS), so without this trigger they
-- could grant themselves plan='pro' from the browser console. Only the service
-- role (edge functions) may change billing columns.
CREATE OR REPLACE FUNCTION protect_plan_columns() RETURNS trigger AS $$
BEGIN
  IF coalesce(auth.role(), current_user::text) NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    NEW.plan          := OLD.plan;
    NEW.early_bird    := OLD.early_bird;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.paid_until    := OLD.paid_until;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_plan ON workshops;
CREATE TRIGGER trg_protect_plan BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION protect_plan_columns();

-- ── After this file succeeds ────────────────────────────────
-- Secrets go into SUPABASE (not Cloudflare):
--   supabase secrets set PLATFORM_TOYYIBPAY_SECRET_KEY=xxx PLATFORM_TOYYIBPAY_CATEGORY_CODE=xxx PLATFORM_TOYYIBPAY_SANDBOX=false
-- Then deploy:
--   supabase functions deploy create-subscription-bill
--   supabase functions deploy create-bill
--   supabase functions deploy payment-callback --no-verify-jwt
