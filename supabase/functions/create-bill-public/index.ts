import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createCheckout } from '../_shared/create-checkout.ts'
import { outstandingSen, returnUrl } from '../_shared/toyyibpay.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405)

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

    const amountSen = outstandingSen(job)
    if (job.paid || amountSen < 100) return corsResponse({ error: 'Outstanding balance must be at least RM1.00' }, 400)

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

    const checkout = await createCheckout(serviceClient, {
      workshopId: job.workshop_id, jobId: job.id, purpose: 'job', amountSen,
      secret: secretKey, category: categoryCode, sandbox: isSandbox,
      name: `${job.plate} ${job.owner || 'Pelanggan'}`,
      description: `Bayaran servis kenderaan ${job.plate}`,
      returnUrl: returnUrl(Deno.env.get('APP_URL'), return_url, `/w/${workshop?.slug || ''}`),
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`,
    })
    return corsResponse(checkout)
  } catch (e) {
    console.error(e)
    return corsResponse({ error: (e as Error).message }, 500)
  }
})
