/**
 * Public "Pay Now" for the customer tracking page (/w/:slug).
 *
 * DEPLOYMENT: supabase functions deploy create-bill-public --no-verify-jwt
 *
 * No auth: customers are anonymous. Safe because the amount is derived
 * server-side from the job's outstanding balance (never from the client),
 * the bill pays into the WORKSHOP's own ToyyibPay account, and settlement
 * still goes through the verified payment-callback path.
 * ponytail: no rate limiting — worst case is bill spam in the workshop's
 * ToyyibPay dashboard; add a per-job pending-bill reuse if it ever happens.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { job_id, return_url } = await req.json()
    if (!job_id) return corsResponse({ error: 'job_id required' }, 400)

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: job } = await serviceClient
      .from('jobs')
      .select('id, plate, owner, phone, workshop_id, total_amount, discount, downpayment, paid, archived')
      .eq('id', job_id)
      .single()
    if (!job || job.archived) return corsResponse({ error: 'Job not found' }, 404)

    // Amount is ALWAYS the outstanding balance — never client-supplied
    const balance = (Number(job.total_amount) || 0)
      - (Number(job.discount) || 0)
      - (Number(job.downpayment) || 0)
    if (job.paid || balance <= 0) return corsResponse({ error: 'Nothing to pay' }, 400)

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
      return corsResponse({ error: 'Online payment not available for this workshop.' }, 503)
    }

    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        workshop_id: job.workshop_id,
        job_id: job.id,
        purpose: 'job',
        amount_original: balance,
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
    const returnUrl   = return_url || `${Deno.env.get('APP_URL') || ''}/w/${workshop?.slug || ''}`

    const billName = `${job.plate} - ${(job.owner || 'Pelanggan').substring(0, 20)}`.substring(0, 30)

    const form = new FormData()
    form.append('userSecretKey', secretKey)
    form.append('categoryCode', categoryCode)
    form.append('billName', billName)
    form.append('billDescription', `Bayaran servis kenderaan ${job.plate}`.substring(0, 100))
    form.append('billPriceSetting', '1')
    form.append('billPayorInfo', '0')
    form.append('billAmount', String(Math.round(balance * 100)))
    form.append('billReturnUrl', returnUrl)
    form.append('billCallbackUrl', callbackUrl)
    form.append('billExternalReferenceNo', payment.id)
    form.append('billPaymentChannel', '2')

    const tpRes = await fetch(`${TOYYIBPAY_BASE}/index.php/api/createBill`, {
      method: 'POST',
      body: form,
    })

    let tpData: unknown
    try { tpData = await tpRes.json() } catch { tpData = await tpRes.text() }

    const billCode = Array.isArray(tpData) ? (tpData[0] as Record<string, string>)?.BillCode : null
    if (!billCode) {
      await serviceClient.from('payments').delete().eq('id', payment.id)
      return corsResponse({ error: 'Payment gateway error. Please contact the workshop.' }, 502)
    }

    await serviceClient
      .from('payments')
      .update({ gateway_ref: billCode, gateway_status: 'bill_created' })
      .eq('id', payment.id)

    return corsResponse({ payment_url: `${TOYYIBPAY_BASE}/${billCode}` })
  } catch (e) {
    console.error(e)
    return corsResponse({ error: (e as Error).message }, 500)
  }
})
