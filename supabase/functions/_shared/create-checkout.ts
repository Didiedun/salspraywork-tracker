import { billText, readGatewayResponse } from './toyyibpay.ts'

// All three checkout routes use the same persistence and provider error handling.
export async function createCheckout(client: any, options: {
  workshopId: string; jobId?: string; purpose: string; amountSen: number;
  secret: string; category: string; sandbox: boolean; name: string; description: string;
  returnUrl: string; callbackUrl: string;
}) {
  if (!Number.isSafeInteger(options.amountSen) || options.amountSen < 100) throw new Error('Online payments require at least RM1.00')
  const { data: payment, error } = await client.from('payments').insert({
    workshop_id: options.workshopId, job_id: options.jobId ?? null, purpose: options.purpose,
    amount_original: options.amountSen / 100, currency: 'MYR', provider: 'toyyibpay',
    status: 'pending', gateway_sandbox: options.sandbox,
  }).select('id').single()
  if (error || !payment) throw new Error('Unable to save payment intent')

  const base = options.sandbox ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com'
  const form = new FormData()
  Object.entries({
    userSecretKey: options.secret.trim(), categoryCode: options.category.trim(),
    billName: billText(options.name, 30), billDescription: billText(options.description, 100),
    billPriceSetting: '1', billPayorInfo: '0', billAmount: String(options.amountSen),
    billReturnUrl: options.returnUrl, billCallbackUrl: options.callbackUrl,
    billExternalReferenceNo: payment.id, billPaymentChannel: '2',
  }).forEach(([key, value]) => form.append(key, value))

  let response: Response
  let data: unknown
  try {
    response = await fetch(`${base}/index.php/api/createBill`, { method: 'POST', body: form, signal: AbortSignal.timeout(15000) })
    data = await readGatewayResponse(response)
  } catch {
    await client.from('payments').update({ gateway_status: 'creation_unknown' }).eq('id', payment.id)
    throw new Error('Payment gateway did not respond. Please try again later.')
  }
  const billCode = Array.isArray(data) ? data[0]?.BillCode : null
  if (!response.ok || typeof billCode !== 'string' || !/^[a-zA-Z0-9]+$/.test(billCode)) {
    await client.from('payments').update({ status: 'rejected', gateway_status: 'creation_failed' }).eq('id', payment.id)
    // Never return raw upstream payloads: they can contain account details.
    throw new Error('ToyyibPay rejected the bill. Check that the Secret Key and Category Code belong to the same sandbox or live account.')
  }
  const { data: saved, error: saveError } = await client.from('payments')
    .update({ gateway_ref: billCode, gateway_status: 'bill_created' }).eq('id', payment.id).select('id').single()
  if (saveError || !saved) throw new Error('Unable to save the payment link. Please contact support.')
  return { payment_url: `${base}/${billCode}`, bill_code: billCode, payment_id: payment.id }
}
