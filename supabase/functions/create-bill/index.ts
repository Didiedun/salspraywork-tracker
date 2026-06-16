/**
 * DEPLOYMENT (platform admin — run once)
 * ────────────────────────────────────────────────────────
 * brew install supabase/tap/supabase
 * supabase login
 * supabase link --project-ref <your-supabase-project-ref>
 * supabase secrets set APP_URL=https://your-deployed-app.com
 * supabase functions deploy create-bill --no-verify-jwt=false
 *
 * Each workshop enters their OWN ToyyibPay credentials in
 * Settings > Payment Gateway — no per-workshop CLI work needed.
 *
 * Required DB columns on workshops table (run once in SQL editor):
 * ────────────────────────────────────────────────────────
 * ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_secret_key    text;
 * ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_category_code text;
 * ALTER TABLE workshops ADD COLUMN IF NOT EXISTS toyyibpay_sandbox        boolean DEFAULT true;
 *
 * Required tables (in supabase/functions/payment-callback/index.ts header)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'

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

    const { job_id, amount, return_url } = await req.json()
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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Load this workshop's own ToyyibPay config (non-secret fields) + the secret
    // from the service-role-only secret store.
    const { data: workshop } = await serviceClient
      .from('workshops')
      .select('name, slug, toyyibpay_category_code, toyyibpay_sandbox')
      .eq('id', job.workshop_id)
      .single()

    const { data: secretRow } = await serviceClient
      .from('workshop_secrets')
      .select('toyyibpay_secret_key')
      .eq('workshop_id', job.workshop_id)
      .single()

    const secretKey    = secretRow?.toyyibpay_secret_key
    const categoryCode = workshop?.toyyibpay_category_code
    const isSandbox    = workshop?.toyyibpay_sandbox !== false

    if (!secretKey || !categoryCode) {
      return corsResponse({
        error: 'Payment gateway not configured. Go to Settings → Payment Gateway and enter your ToyyibPay credentials.',
      }, 503)
    }

    // Create local pending payment intent before touching the gateway
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

    const TOYYIBPAY_BASE = isSandbox ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com'
    const amountCents   = Math.round(Number(amount) * 100)
    const callbackUrl   = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`
    const returnUrl     = return_url || `${Deno.env.get('APP_URL') || ''}/w/${workshop?.slug || ''}`

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
    // billPaymentChannel: 0 = FPX, 1 = card, 2 = both (the old `billPaymentMethod`
    // key is not a real toyyibPay param and was silently ignored)
    form.append('billPaymentChannel', '2')
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
      return corsResponse({ error: 'ToyyibPay rejected the request. Check your Secret Key and Category Code.', detail: tpData }, 502)
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
