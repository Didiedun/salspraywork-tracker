// Subscription state for a workshop.
// If migration 0007 hasn't run yet (trial_ends_at is null), stay unlocked —
// never lock a workshop out because of missing data.
export function planStatus(workshop) {
  const now = Date.now()
  const paidUntil = workshop?.paid_until ? Date.parse(workshop.paid_until) : 0
  const trialEnds = workshop?.trial_ends_at ? Date.parse(workshop.trial_ends_at) : null

  if (paidUntil > now) {
    return { state: 'pro', until: workshop.paid_until, daysLeft: Math.ceil((paidUntil - now) / 86400000) }
  }
  if (trialEnds === null) return { state: 'trial', until: null, daysLeft: null }
  if (trialEnds > now) {
    return { state: 'trial', until: workshop.trial_ends_at, daysLeft: Math.ceil((trialEnds - now) / 86400000) }
  }
  return { state: 'expired', until: null, daysLeft: 0 }
}

// Mirrors PRICES_RM in the create-subscription-bill edge function (display only —
// the server decides the real amount)
export function planPrices(workshop) {
  return workshop?.early_bird ? { monthly: 20, annual: 200 } : { monthly: 30, annual: 300 }
}
