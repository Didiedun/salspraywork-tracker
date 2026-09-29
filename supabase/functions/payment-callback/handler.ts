import { callbackHashValid, sandboxAllowed, workshopSandbox } from '../_shared/toyyibpay.ts'
import { blockSandboxPayment, confirmAndSettle } from '../_shared/settle.ts'

export async function handleCallback(req: Request, client: any, env: (key: string) => string | undefined, fetcher = fetch) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  try {
    const params = new URLSearchParams(await req.text())
    const billCode = params.get('billcode') || ''
    const orderId = params.get('order_id') || ''
    const status = params.get('status') || ''
    const refno = params.get('refno') || ''
    if (!billCode || !/^[0-9a-f-]{36}$/i.test(orderId) || !['1', '2', '3'].includes(status) || !refno) {
      return new Response('Invalid callback', { status: 400 })
    }
    const { data: payment, error: loadError } = await client.from('payments').select('*')
      .eq('id', orderId).eq('provider', 'toyyibpay').eq('gateway_ref', billCode).single()
    if (loadError || !payment) return new Response('Payment unavailable', { status: 503 })

    const isSubscription = ['subscription_monthly', 'subscription_annual'].includes(payment.purpose)
    if (!isSubscription && payment.purpose !== 'job') return new Response('Invalid payment purpose', { status: 409 })
    let secret: string | undefined
    let sandbox: boolean
    if (isSubscription) {
      secret = env('PLATFORM_TOYYIBPAY_SECRET_KEY')?.trim()
      sandbox = payment.gateway_sandbox ?? (env('PLATFORM_TOYYIBPAY_SANDBOX') === 'true')
    } else {
      const { data: config, error: configError } = await client.from('workshops')
        .select('toyyibpay_sandbox').eq('id', payment.workshop_id).single()
      const { data: secrets, error: secretError } = await client.from('workshop_secrets')
        .select('toyyibpay_secret_key').eq('workshop_id', payment.workshop_id).single()
      if (configError || secretError) return new Response('Gateway configuration unavailable', { status: 503 })
      secret = secrets?.toyyibpay_secret_key?.trim()
      sandbox = payment.gateway_sandbox ?? workshopSandbox(config)
    }
    if (!secret) return new Response('Gateway configuration unavailable', { status: 503 })
    if (!callbackHashValid(params, secret)) return new Response('Invalid callback hash', { status: 401 })

    // Only authenticated callbacks enter the audit log. Include status because
    // the same reference may progress from pending to successful.
    const payload = Object.fromEntries(params.entries())
    delete payload.hash
    const { error: eventError } = await client.from('payment_events').insert({
      provider: 'toyyibpay', event_id: `${billCode}:${refno}:${status}`, payment_id: payment.id, payload,
    })
    if (eventError && eventError.code !== '23505') throw new Error('Could not record payment event')
    // Never short-circuit on duplicate events: a previous settlement may have failed.
    if (payment.status === 'paid') return new Response('OK')
    if (sandbox && !sandboxAllowed(env)) {
      await blockSandboxPayment(client, payment.id)
      return new Response('OK')
    }
    if (status !== '1') {
      const { error } = await client.from('payments').update({
        gateway_status: status === '2' ? 'pending' : 'rejected', gateway_payload: payload,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id).eq('status', 'pending')
      if (error) throw new Error('Could not record gateway status')
      return new Response('OK')
    }

    const result = await confirmAndSettle(client, payment, sandbox, { callback: payload }, fetcher)
    if (result === 'unavailable') return new Response('Verification unavailable; retry', { status: 503 })
    // Do not acknowledge success when the provider has not confirmed it yet.
    if (result === 'unconfirmed') return new Response('Payment verification incomplete; retry', { status: 503 })
    return new Response('OK')
  } catch {
    // No raw provider payloads or secrets in logs.
    console.error('Payment callback failed; a retry is required')
    return new Response('Internal Server Error', { status: 500 })
  }
}
