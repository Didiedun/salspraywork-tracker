/**
 * DEPLOYMENT GUIDE
 * ─────────────────────────────────────────────────────
 * 1. Install Supabase CLI: brew install supabase/tap/supabase
 * 2. In project root: supabase init
 * 3. Link to your project: supabase link --project-ref <your-ref>
 * 4. Set secrets:
 *      supabase secrets set TOYYIBPAY_SECRET_KEY=xxxx
 *      supabase secrets set TOYYIBPAY_CATEGORY_CODE=xxxx
 *      supabase secrets set TOYYIBPAY_SANDBOX=true        # use false in production
 *      supabase secrets set APP_URL=https://your-app.com
 * 5. Deploy: supabase functions deploy create-bill --no-verify-jwt=false
 *
 * Required DB tables (run in Supabase SQL editor):
 * ─────────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS payments (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   workshop_id uuid REFERENCES workshops(id) ON DELETE CASCADE,
 *   job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
 *   amount_original numeric(10,2) NOT NULL,
 *   amount_paid numeric(10,2),
 *   currency text NOT NULL DEFAULT 'MYR',
 *   provider text NOT NULL DEFAULT 'toyyibpay',
 *   status text NOT NULL DEFAULT 'pending',
 *   gateway_ref text,
 *   gateway_status text,
 *   gateway_payload jsonb,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now(),
 *   paid_at timestamptz
 * );
 * ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "owners_manage_payments" ON payments
 *   FOR ALL USING (workshop_id IN (SELECT id FROM workshops WHERE owner_id = auth.uid()));
 *
 * CREATE TABLE IF NOT EXISTS payment_events (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   provider text NOT NULL,
 *   event_id text NOT NULL,
 *   payment_id uuid REFERENCES payments(id),
 *   payload jsonb,
 *   created_at timestamptz DEFAULT now(),
 *   UNIQUE(provider, event_id)
 * );
 * ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "service_manage_events" ON payment_events FOR ALL USING (true);
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'

const TOYYIBPAY_BASE = Deno.env.get('TOYYIBPAY_SANDBOX') === 'true'
  ? 'https://dev.toyyibpay.com'
  : 'https://toyyibpay.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return corsResponse({ error: 'Unauthorized' }, 401)

    const { job_id, amount } = await req.json()
    if (!job_id || !amount || Number(amount) <= 0) {
      return corsResponse({ error: 'job_id and amount > 0 required' }, 400)
    }

    // Load job — RLS ensures this user owns it
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, plate, owner, phone, workshop_id, total_amount, downpayment')
      .eq('id', job_id)
      .single()
    if (jobError || !job) return corsResponse({ error: 'Job not found' }, 404)

    const { data: workshop } = await supabase
      .from('workshops')
      .select('name, slug')
      .eq('id', job.workshop_id)
      .single()

    // Create local pending payment intent before touching the gateway
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        workshop_id: job.workshop_id,
        job_id: job.id,
        amount_original: Number(amount),
        currency: 'MYR',
        provider: 'toyyibpay',
        status: 'pending',
      })
      .select('id')
      .single()

    if (paymentError || !payment) {
      return corsResponse({ error: paymentError?.message || 'Failed to create payment record' }, 500)
    }

    // Create ToyyibPay bill
    const secretKey = Deno.env.get('TOYYIBPAY_SECRET_KEY')
    const categoryCode = Deno.env.get('TOYYIBPAY_CATEGORY_CODE')
    if (!secretKey || !categoryCode) {
      await serviceClient.from('payments').delete().eq('id', payment.id)
      return corsResponse({ error: 'Payment gateway not configured. Set TOYYIBPAY_SECRET_KEY and TOYYIBPAY_CATEGORY_CODE.' }, 503)
    }

    const amountCents = Math.round(Number(amount) * 100)
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`
    const appUrl = Deno.env.get('APP_URL') || ''
    const returnUrl = workshop?.slug
      ? `${appUrl}/w/${workshop.slug}?paid=1`
      : appUrl

    const billName = `${job.plate} - ${(job.owner || 'Pelanggan').substring(0, 20)}`.substring(0, 30)
    const billDesc = `Bayaran servis kenderaan ${job.plate}`.substring(0, 100)

    const form = new FormData()
    form.append('userSecretKey', secretKey)
    form.append('categoryCode', categoryCode)
    form.append('billName', billName)
    form.append('billDescription', billDesc)
    form.append('billPriceSetting', '0')
    form.append('billPayorInfo', '1')
    form.append('billAmount', String(amountCents))
    form.append('billReturnUrl', returnUrl)
    form.append('billCallbackUrl', callbackUrl)
    form.append('billExternalReferenceNo', payment.id)
    form.append('billPaymentMethod', '2')
    if (job.owner) form.append('billTo', job.owner.substring(0, 50))
    if (job.phone) form.append('billPhone', job.phone.replace(/\D/g, '').substring(0, 15))

    const tpRes = await fetch(`${TOYYIBPAY_BASE}/index.php/api/createBill`, {
      method: 'POST',
      body: form,
    })

    let tpData: unknown
    try {
      tpData = await tpRes.json()
    } catch {
      tpData = await tpRes.text()
    }

    const billCode = Array.isArray(tpData) ? (tpData[0] as Record<string, string>)?.BillCode : null

    if (!billCode) {
      await serviceClient.from('payments').delete().eq('id', payment.id)
      return corsResponse({ error: 'ToyyibPay rejected the request', detail: tpData }, 502)
    }

    await serviceClient
      .from('payments')
      .update({ gateway_ref: billCode, gateway_status: 'bill_created' })
      .eq('id', payment.id)

    return corsResponse({
      payment_url: `${TOYYIBPAY_BASE}/${billCode}`,
      bill_code: billCode,
      payment_id: payment.id,
    })
  } catch (e) {
    console.error(e)
    return corsResponse({ error: (e as Error).message }, 500)
  }
})
