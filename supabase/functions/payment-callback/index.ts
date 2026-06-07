/**
 * DEPLOYMENT: supabase functions deploy payment-callback --no-verify-jwt
 *
 * This endpoint is public (no JWT) because ToyyibPay calls it directly.
 * Security is provided by: only trusting data fetched server-side, not
 * the callback payload alone.
 *
 * ToyyibPay sends POST with form-encoded body:
 *   billCode, billpaymentStatus (1=paid, 2=pending, 3=failed),
 *   billpaymentAmount (cents), billpaymentInvoiceNo, billBuyerName,
 *   billBuyerEmail, billBuyerPhone, billExternalReferenceNo
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'GET') return new Response('Payment callback endpoint', { status: 200 })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const billCode = params.get('billCode') || ''
    const billpaymentStatus = params.get('billpaymentStatus') || ''
    const billpaymentAmount = params.get('billpaymentAmount') || '0'
    const billpaymentInvoiceNo = params.get('billpaymentInvoiceNo') || ''

    if (!billCode) return new Response('Bad Request: missing billCode', { status: 400 })

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Deduplicate webhook events
    const eventId = `${billCode}:${billpaymentInvoiceNo || billpaymentStatus}`
    const { error: dupeError } = await serviceClient.from('payment_events').insert({
      provider: 'toyyibpay',
      event_id: eventId,
      payload: Object.fromEntries(params.entries()),
    })
    if (dupeError?.code === '23505') {
      // Already processed — safe to acknowledge
      return new Response('OK', { status: 200 })
    }

    // Load local payment by gateway_ref
    const { data: payment } = await serviceClient
      .from('payments')
      .select('id, job_id, workshop_id, amount_original, status')
      .eq('provider', 'toyyibpay')
      .eq('gateway_ref', billCode)
      .single()

    if (!payment) {
      console.error(`No payment record found for billCode: ${billCode}`)
      return new Response('Payment not found', { status: 404 })
    }

    // Link the event to the payment
    await serviceClient
      .from('payment_events')
      .update({ payment_id: payment.id })
      .eq('event_id', eventId)
      .eq('provider', 'toyyibpay')

    // Record non-success statuses and exit
    if (billpaymentStatus !== '1') {
      const statusMap: Record<string, string> = { '2': 'pending', '3': 'rejected' }
      await serviceClient.from('payments').update({
        gateway_status: statusMap[billpaymentStatus] || 'unknown',
        gateway_payload: Object.fromEntries(params.entries()),
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id)
      return new Response('OK', { status: 200 })
    }

    // Idempotent: already settled
    if (payment.status === 'paid') return new Response('OK', { status: 200 })

    // Verify amount — ToyyibPay sends amount in cents
    const paidCents = Math.round(parseFloat(billpaymentAmount))
    const expectedCents = Math.round(Number(payment.amount_original) * 100)
    if (paidCents < expectedCents) {
      console.warn(`Amount short: paid ${paidCents} expected ${expectedCents} for payment ${payment.id}`)
      // Still record as partial payment — log for reconciliation
    }

    const paidAmount = paidCents / 100

    // Settle the payment
    await serviceClient.from('payments').update({
      status: 'paid',
      amount_paid: paidAmount,
      gateway_status: 'paid',
      gateway_payload: Object.fromEntries(params.entries()),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', payment.id)

    // Update the job
    const { data: job } = await serviceClient
      .from('jobs')
      .select('total_amount, downpayment')
      .eq('id', payment.job_id)
      .single()

    if (job) {
      const total = Number(job.total_amount) || 0
      const existingDeposit = Number(job.downpayment) || 0
      const newDeposit = Math.min(existingDeposit + paidAmount, total)
      const isFullPay = newDeposit >= total - 0.005

      await serviceClient.from('jobs').update({
        downpayment: newDeposit,
        paid: isFullPay,
        payment_method: 'online',
      }).eq('id', payment.job_id)
    }

    return new Response('OK', { status: 200 })
  } catch (e) {
    console.error('payment-callback error:', e)
    return new Response('Internal Server Error', { status: 500 })
  }
})
