import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { sandboxAllowed, workshopSandbox } from '../_shared/toyyibpay.ts'
import { blockSandboxPayment, confirmAndSettle } from '../_shared/settle.ts'

// Owner-only "check payment status". If ToyyibPay's callback never arrived, the
// owner can ask the server to look the job's pending bills up with ToyyibPay
// directly; verified payments settle exactly as they would from the callback.
export async function handleCheck(req: Request, deps: {
  userClient: (authHeader: string) => any
  serviceClient: any
  env: (key: string) => string | undefined
  fetcher?: typeof fetch
}) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return corsResponse({ error: 'Method Not Allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Unauthorized' }, 401)
    const { data: { user }, error: authError } = await deps.userClient(authHeader).auth.getUser()
    if (authError || !user) return corsResponse({ error: 'Unauthorized' }, 401)

    const { job_id } = await req.json()
    if (typeof job_id !== 'string' || !job_id) return corsResponse({ error: 'job_id required' }, 400)

    const service = deps.serviceClient
    const { data: job } = await service.from('jobs').select('id, workshop_id').eq('id', job_id).single()
    if (!job) return corsResponse({ error: 'Job not found' }, 404)
    const { data: workshop } = await service.from('workshops')
      .select('owner_id, toyyibpay_sandbox').eq('id', job.workshop_id).single()
    if (!workshop || workshop.owner_id !== user.id) return corsResponse({ error: 'Forbidden' }, 403)

    // Newest first; a job rarely has more than one or two open links.
    const { data: pending, error: listError } = await service.from('payments')
      .select('id, gateway_ref, amount_original, currency, gateway_sandbox')
      .eq('job_id', job.id).eq('provider', 'toyyibpay').eq('purpose', 'job').eq('status', 'pending')
      .not('gateway_ref', 'is', null)
      .order('created_at', { ascending: false }).limit(5)
    if (listError) throw new Error('Could not load payments')

    const settled: number[] = []
    let unavailable = false
    for (const payment of pending ?? []) {
      const sandbox = payment.gateway_sandbox ?? workshopSandbox(workshop)
      if (sandbox && !sandboxAllowed(deps.env)) {
        await blockSandboxPayment(service, payment.id)
        continue
      }
      const result = await confirmAndSettle(service, payment, sandbox,
        { source: 'status_check', checked_by: user.id }, deps.fetcher)
      if (result === 'settled') settled.push(Number(payment.amount_original))
      if (result === 'unavailable') unavailable = true
    }
    return corsResponse({ checked: pending?.length ?? 0, settled, unavailable })
  } catch {
    // No provider payloads or secrets in logs.
    console.error('Payment status check failed')
    return corsResponse({ error: 'Could not check the payment status. Please try again.' }, 500)
  }
}
