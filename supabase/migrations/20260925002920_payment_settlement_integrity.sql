-- Requires 0007_subscriptions.sql. Apply before deploying the payment functions.
BEGIN;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_sandbox boolean;
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_gateway_ref_unique
  ON public.payments(provider, gateway_ref) WHERE gateway_ref IS NOT NULL;

-- Payment intents and settlement are server-owned. Owners may read their ledger.
DROP POLICY IF EXISTS "owners_manage_payments" ON public.payments;
DROP POLICY IF EXISTS "owners_read_payments" ON public.payments;
CREATE POLICY "owners_read_payments" ON public.payments FOR SELECT TO authenticated
  USING (workshop_id IN (SELECT id FROM public.workshops WHERE owner_id = (SELECT auth.uid())));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.payments FROM anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments, public.payment_events, public.workshop_secrets TO service_role;

-- The original INSERT trigger reset trial fields but accepted a client-supplied
-- paid_until. Initialize every new workshop without a paid entitlement.
CREATE OR REPLACE FUNCTION public.set_workshop_trial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT count(*) FROM public.workshops) < 10 THEN
    NEW.early_bird := true;
    NEW.trial_ends_at := now() + interval '12 months';
  ELSE
    NEW.early_bird := false;
    NEW.trial_ends_at := now() + interval '14 days';
  END IF;
  NEW.plan := 'trial';
  NEW.paid_until := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_workshop_trial() FROM PUBLIC, anon, authenticated;

-- Atomic settlement: row locks protect both duplicate callbacks and separate
-- payments arriving for the same job/workshop. Any failure rolls everything back.
CREATE OR REPLACE FUNCTION public.settle_toyyibpay_payment(
  p_payment_id uuid, p_bill_code text, p_amount_sen bigint, p_payload jsonb
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  payment public.payments%ROWTYPE;
  job public.jobs%ROWTYPE;
  workshop public.workshops%ROWTYPE;
  new_deposit numeric;
  extension interval;
BEGIN
  SELECT * INTO payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF payment.provider IS DISTINCT FROM 'toyyibpay'
     OR p_bill_code IS NULL OR p_bill_code = ''
     OR payment.gateway_ref IS DISTINCT FROM p_bill_code
     OR payment.currency IS DISTINCT FROM 'MYR'
     OR p_amount_sen IS NULL OR p_amount_sen <= 0
     OR payment.amount_original * 100 <> p_amount_sen THEN
    RAISE EXCEPTION 'Payment verification mismatch';
  END IF;
  IF payment.status = 'paid' THEN RETURN; END IF;
  IF payment.status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'Payment is not pending'; END IF;

  IF payment.purpose = 'job' THEN
    SELECT * INTO job FROM public.jobs WHERE id = payment.job_id FOR UPDATE;
    IF NOT FOUND OR job.workshop_id IS DISTINCT FROM payment.workshop_id THEN
      RAISE EXCEPTION 'Payment job mismatch';
    END IF;
    -- Preserve any overpayment so it can be reconciled/refunded, not silently lost.
    new_deposit := coalesce(job.downpayment, 0) + p_amount_sen::numeric / 100;
    UPDATE public.jobs SET downpayment = new_deposit,
      paid = new_deposit >= greatest(coalesce(job.total_amount, 0) - coalesce(job.discount, 0), 0),
      payment_method = 'online'
    WHERE id = job.id;
  ELSIF payment.purpose IN ('subscription_monthly', 'subscription_annual') THEN
    IF payment.job_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid subscription payment'; END IF;
    SELECT * INTO workshop FROM public.workshops WHERE id = payment.workshop_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Workshop not found'; END IF;
    extension := CASE WHEN payment.purpose = 'subscription_annual' THEN interval '12 months' ELSE interval '1 month' END;
    -- Preserve unused trial time and existing prepaid time. PostgreSQL calendar
    -- intervals also clamp month-end dates rather than overflowing into March.
    UPDATE public.workshops SET plan = 'pro',
      paid_until = greatest(now(), workshop.paid_until, workshop.trial_ends_at) + extension
    WHERE id = workshop.id;
  ELSE
    RAISE EXCEPTION 'Unsupported payment purpose';
  END IF;

  UPDATE public.payments SET status = 'paid', amount_paid = p_amount_sen::numeric / 100,
    gateway_status = 'paid', gateway_payload = p_payload, paid_at = now(), updated_at = now()
  WHERE id = payment.id;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_toyyibpay_payment(uuid, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_toyyibpay_payment(uuid, text, bigint, jsonb) TO service_role;
COMMIT;
