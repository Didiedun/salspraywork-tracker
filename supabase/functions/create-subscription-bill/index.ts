/**
 * Creates a ToyyibPay bill for a workshop's Pro subscription, paid to the
 * PLATFORM's own ToyyibPay account (unlike create-bill, which uses each
 * workshop's merchant account).
 *
 * DEPLOYMENT (once):
 *   supabase secrets set PLATFORM_TOYYIBPAY_SECRET_KEY=<your user secret key>
 *   supabase secrets set PLATFORM_TOYYIBPAY_CATEGORY_CODE=<your category code>
 *   supabase secrets set PLATFORM_TOYYIBPAY_SANDBOX=true   # false when live
 *   supabase functions deploy create-subscription-bill
 *
 * Requires migration 0007_subscriptions.sql.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'

// Prices are server-side only — never trust an amount from the client.
// Matches the landing page: early bird RM20/200, standard RM30/300.
const PRICES_RM = {
  subscription_monthly: { standard: 30,  early_bird: 20 },
  subscription_annual:  { standard: 300, early_bird: 200 },
}

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

    const { interval, return_url } = await req.json()
    const purpose = interval === 'annual' ? 'subscription_annual' : 'subscription_monthly'

    // RLS: only the owner can read their own workshop row
    const { data: workshop, error: wsError } = await supabase
      .from('workshops')
      .select('id, name, slug, early_bird')
      .eq('owner_id', user.id)
      .single()
    if (wsError || !workshop) return corsResponse({ error: 'Workshop not found' }, 404)

    const secretKey    = Deno.env.get('PLATFORM_TOYYIBPAY_SECRET_KEY')
    const categoryCode = Deno.env.get('PLATFORM_TOYYIBPAY_CATEGORY_CODE')
    const isSandbox    = Deno.env.get('PLATFORM_TOYYIBPAY_SANDBOX') !== 'false'

    if (!secretKey || !categoryCode) {
      return corsResponse({ error: 'Platform payment gateway not configured.' }, 503)
    }

    const amountRM = PRICES_RM[purpose][workshop.early_bird ? 'early_bird' : 'standard']

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Local pending payment first — purpose tells payment-callback how to settle
    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        workshop_id: workshop.id,
        job_id: null,
        purpose,
        amount_original: amountRM,
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
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`
    const returnUrl   = return_url || `${Deno.env.get('APP_URL') || ''}/settings?sub=pending`

    const form = new FormData()
    form.append('userSecretKey', secretKey)
    form.append('categoryCode', categoryCode)
    form.append('billName', 'Digital Depot Pro')
    form.append('billDescription',
      `Langganan Pro ${interval === 'annual' ? 'tahunan' : 'bulanan'} ${workshop.name}`
        .replace(/[^a-zA-Z0-9 _]/g, '').substring(0, 100))
    form.append('billPriceSetting', '1') // 1 = fixed amount; 0 would let the payer edit it
    form.append('billPayorInfo', '0') // payer fills in their own details on ToyyibPay's page
    form.append('billAmount', String(Math.round(amountRM * 100)))
    form.append('billReturnUrl', returnUrl)
    form.append('billCallbackUrl', callbackUrl)
    form.append('billExternalReferenceNo', payment.id)
    form.append('billPaymentChannel', '2')
    form.append('billTo', (workshop.name || 'Bengkel').substring(0, 50))
    if (user.email) form.append('billEmail', user.email)

    const tpRes = await fetch(`${TOYYIBPAY_BASE}/index.php/api/createBill`, {
      method: 'POST',
      body: form,
    })

    let tpData: unknown
    try { tpData = await tpRes.json() } catch { tpData = await tpRes.text() }

    const billCode = Array.isArray(tpData) ? (tpData[0] as Record<string, string>)?.BillCode : null
    if (!billCode) {
      await serviceClient.from('payments').delete().eq('id', payment.id)
      return corsResponse({ error: 'ToyyibPay rejected the request.', detail: tpData }, 502)
    }

    await serviceClient
      .from('payments')
      .update({ gateway_ref: billCode, gateway_status: 'bill_created' })
      .eq('id', payment.id)

    return corsResponse({
      payment_url: `${TOYYIBPAY_BASE}/${billCode}`,
      bill_code: billCode,
      payment_id: payment.id,
      amount: amountRM,
    })
  } catch (e) {
    console.error(e)
    return corsResponse({ error: (e as Error).message }, 500)
  }
})
