import { createHash, timingSafeEqual } from 'node:crypto'

// createBill takes sen; getBillTransactions returns decimal MYR.
export function myrToSen(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid MYR amount')
  const text = String(value)
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Invalid MYR amount')
  const [whole, fraction = ''] = text.split('.')
  const sen = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(sen)) throw new Error('Invalid MYR amount')
  return sen
}

export function outstandingSen(job: Record<string, unknown>): number {
  return Math.max(0, myrToSen(job.total_amount ?? 0) - myrToSen(job.discount ?? 0) - myrToSen(job.downpayment ?? 0))
}

export function billText(value: string, max: number): string {
  return value.replace(/[^a-zA-Z0-9 _]/g, '').trim().slice(0, max) || 'Payment'
}

export function returnUrl(appUrl: string | undefined, requested: unknown, fallback: string): string {
  if (!appUrl) throw new Error('APP_URL is not configured')
  const base = new URL(appUrl)
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid APP_URL')
  if (typeof requested === 'string') {
    try {
      const candidate = new URL(requested)
      if (candidate.origin === base.origin && !candidate.username && !candidate.password) return candidate.href
    } catch { /* Use the configured application URL. */ }
  }
  return new URL(fallback, base.origin).href
}

export async function readGatewayResponse(response: Response): Promise<unknown> {
  // Reading .json() and then .text() on failure consumes the same stream twice.
  const body = await response.text()
  try { return JSON.parse(body) } catch { return body }
}

export function callbackHashValid(params: URLSearchParams, secret: string): boolean {
  const hash = params.get('hash') || ''
  if (!secret || !/^[a-f0-9]{32}$/i.test(hash)) return false
  const expected = createHash('md5').update(
    secret + params.get('status') + params.get('order_id') + params.get('refno') + 'ok'
  ).digest('hex')
  return timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(hash.toLowerCase()))
}

export function verifiedTransaction(data: unknown, payment: { id: string; amount_original: unknown; currency: string }) {
  if (payment.currency !== 'MYR' || !Array.isArray(data)) return null
  return data.find(tx => {
    if (!tx || tx.billExternalReferenceNo !== payment.id || String(tx.billpaymentStatus) !== '1') return false
    try { return myrToSen(tx.billpaymentAmount) > 0 && myrToSen(tx.billpaymentAmount) === myrToSen(payment.amount_original) }
    catch { return false }
  }) ?? null
}
