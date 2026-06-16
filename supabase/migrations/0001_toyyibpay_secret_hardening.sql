-- ============================================================================
-- ToyyibPay secret hardening
-- ----------------------------------------------------------------------------
-- Problem: toyyibpay_secret_key lived on the `workshops` row, which the client
-- fetches in full (AppContext: workshops.select('*') and workshop_members
-- .select('*, workshops(*)')). Postgres RLS is row-level, not column-level, so
-- every workshop MEMBER (including workers) received the merchant secret in the
-- browser. This moves the secret into a table no client role can read.
--
-- RUN ORDER (important — avoids breaking live payments):
--   1. Run BLOCK 1 now.
--   2. Redeploy edge functions create-bill + payment-callback (they now read
--      the secret from workshop_secrets).
--   3. Run BLOCK 2 to drop the leaking column. Leak is fully closed after this.
-- ============================================================================

-- ─── BLOCK 1 — safe to run immediately ──────────────────────────────────────

-- Secret store: only the service_role (edge functions) can touch this. No
-- policies are created for anon/authenticated, so RLS denies them by default.
CREATE TABLE IF NOT EXISTS workshop_secrets (
  workshop_id          uuid PRIMARY KEY REFERENCES workshops(id) ON DELETE CASCADE,
  toyyibpay_secret_key text,
  updated_at           timestamptz DEFAULT now()
);
ALTER TABLE workshop_secrets ENABLE ROW LEVEL SECURITY;

-- Non-secret flag so the client can show "Configured" without seeing the key.
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_secret_set boolean DEFAULT false;

-- Migrate any existing keys into the secret store + set the flag.
INSERT INTO workshop_secrets (workshop_id, toyyibpay_secret_key)
SELECT id, toyyibpay_secret_key
FROM workshops
WHERE toyyibpay_secret_key IS NOT NULL AND length(trim(toyyibpay_secret_key)) > 0
ON CONFLICT (workshop_id)
  DO UPDATE SET toyyibpay_secret_key = EXCLUDED.toyyibpay_secret_key, updated_at = now();

UPDATE workshops
SET toyyibpay_secret_set = true
WHERE toyyibpay_secret_key IS NOT NULL AND length(trim(toyyibpay_secret_key)) > 0;

-- Owners set their gateway via this RPC (write-only path; the secret is never
-- read back to the client). Passing NULL/empty p_secret keeps the existing key,
-- so an owner can edit category/sandbox without re-typing the secret.
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

-- ─── BLOCK 2 — run only AFTER redeploying the edge functions ─────────────────
-- ALTER TABLE workshops DROP COLUMN IF EXISTS toyyibpay_secret_key;
