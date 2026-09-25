import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createCheckout } from '../_shared/create-checkout.ts'
import { returnUrl } from '../_shared/toyyibpay.ts'

// Prices are server-side only — never trust an amount from the client.
// Matches the landing page: early bird RM20/200, standard RM30/300.
const PRICES_RM = {
  subscription_monthly: { standard: 30,  early_bird: 20 },
  subscription_annual:  { standard: 300, early_bird: 200 },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405)

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
    if (!['monthly', 'annual'].includes(interval)) return corsResponse({ error: 'Invalid billing interval' }, 400)
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

    const checkout = await createCheckout(serviceClient, {
      workshopId: workshop.id, purpose, amountSen: amountRM * 100,
      secret: secretKey, category: categoryCode, sandbox: isSandbox,
      name: 'Digital Depot Pro',
      description: `Langganan Pro ${interval === 'annual' ? 'tahunan' : 'bulanan'} ${workshop.name}`,
      returnUrl: returnUrl(Deno.env.get('APP_URL'), return_url, '/settings?sub=pending'),
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`,
    })
    return corsResponse({ ...checkout, amount: amountRM })
  } catch (e) {
    console.error(e)
    return corsResponse({ error: (e as Error).message }, 500)
  }
})
