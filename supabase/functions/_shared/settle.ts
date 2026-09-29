import { myrToSen, verifiedTransaction } from './toyyibpay.ts'

export type Confirmation = 'settled' | 'unconfirmed' | 'unavailable'

// Asks ToyyibPay directly (server to server) whether this payment's bill was paid
// and settles it once when the status and the exact amount check out. Shared by
// the gateway callback and the owner's "check payment status" button.
export async function confirmAndSettle(
  client: any,
  payment: { id: string; gateway_ref: string; amount_original: unknown; currency: string },
  sandbox: boolean,
  payload: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<Confirmation> {
  const form = new FormData()
  form.append('billCode', payment.gateway_ref)
  form.append('billpaymentStatus', '1')
  const base = sandbox ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com'
  let data: unknown
  try {
    const response = await fetcher(`${base}/index.php/api/getBillTransactions`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return 'unavailable'
    data = await response.json()
  } catch {
    return 'unavailable'
  }
  const transaction = verifiedTransaction(data, payment)
  if (!transaction) return 'unconfirmed'

  const { error } = await client.rpc('settle_toyyibpay_payment', {
    p_payment_id: payment.id, p_bill_code: payment.gateway_ref,
    p_amount_sen: myrToSen(transaction.billpaymentAmount),
    p_payload: { ...payload, transaction },
  })
  if (error) throw new Error('Payment settlement failed')
  return 'settled'
}

// A test-mode payment reached a project that does not accept them: record why and
// leave the job or plan untouched. No real money moved.
export async function blockSandboxPayment(client: any, paymentId: string) {
  const { error } = await client.from('payments').update({
    status: 'rejected', gateway_status: 'sandbox_blocked', updated_at: new Date().toISOString(),
  }).eq('id', paymentId).eq('status', 'pending')
  if (error) throw new Error('Could not record blocked sandbox payment')
}
