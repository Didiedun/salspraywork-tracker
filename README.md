# Digital Depot / Salspraywork Tracker

React/Vite workshop tracker with Supabase and ToyyibPay payments.

## Local checks

Install dependencies with `npm ci`. Run `npm run dev`, `npm run build`, and
`npm test`. Payment tests use an isolated PostgreSQL engine (PGlite) and mocked
provider responses; they never call a live payment account or production database.
The frontend build was verified on Node 25.9.0. The repository's Node 20.20.2
pin also satisfies Vite 8's requirement (Node 20.19+ or 22.12+).

The existing `npm run lint` command needs an ESLint flat configuration; none is
currently included in this repository.

## ToyyibPay setup and deployment

There are two separate merchant accounts/configurations:

- Customer job payments use the workshop's credentials, saved through
  **Settings → Payment Gateway** into the private `workshop_secrets` table.
- Pro subscription payments use the platform's Supabase Edge Function secrets:
  `PLATFORM_TOYYIBPAY_SECRET_KEY`, `PLATFORM_TOYYIBPAY_CATEGORY_CODE`, and
  `PLATFORM_TOYYIBPAY_SANDBOX` (`true` for testing, `false` for live).

Also set `APP_URL` to the application's full origin, such as
`https://app.example.com`. Return URLs are restricted to this origin. Supabase
provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the
functions. Never place merchant secrets or service-role keys in `VITE_` variables.
Sandbox accounts and categories belong to `https://dev.toyyibpay.com`; live ones
belong to `https://toyyibpay.com`. The key and category must belong to the same
account/environment. Keep sandbox testing in a separate Supabase test project:
a verified sandbox payment intentionally updates that project's test jobs/plans.

Apply `supabase/migrations/20260925002920_payment_settlement_integrity.sql` to the
intended database **before** deploying these functions. It requires the existing
job schema and migration `0007_subscriptions.sql`. Use the project's normal
migration workflow, or run the new file in the Supabase SQL editor. Do not replay
all old migrations against an existing production database without checking its
migration history.

The migration creates a unique gateway-reference index. This read-only preflight
query must return no rows; if it finds duplicates, reconcile them before applying
it (do not discard payment records automatically):

```sql
select provider, gateway_ref, count(*)
from public.payments
where gateway_ref is not null
group by provider, gateway_ref
having count(*) > 1;
```

From the project directory, after verifying the CLI is linked to the correct
Supabase project, deploy all four updated functions:

```sh
supabase functions deploy create-bill
supabase functions deploy create-bill-public
supabase functions deploy create-subscription-bill
supabase functions deploy payment-callback
```

`supabase/config.toml` declares JWT behavior. Authenticated checkout functions
validate the bearer token using `auth.getUser()` inside the handler. Public
customer checkout derives the amount from the saved job balance. The callback
accepts ToyyibPay's signed POST without a Supabase JWT. Its URL is included in each
bill automatically:

```text
https://<project-ref>.supabase.co/functions/v1/payment-callback
```

Rebuild/redeploy the frontend using the site's existing hosting workflow to apply
the landing toggle and payment-modal fixes. No hosting configuration is supplied
in this repository.

## Settlement rules

`createBill.billAmount` is integer sen. `getBillTransactions.billpaymentAmount`
is decimal MYR. Checkout calculates job total minus discount minus previous
payments on the server; it does not use a browser-supplied amount. Online checkout
requires a balance of at least RM1; smaller balances can be recorded manually.

The callback validates ToyyibPay's documented MD5 callback hash, then looks up the
transaction at the original sandbox/live endpoint. It requires the local
reference, successful status, MYR currency and exact expected amount. Browser
return parameters do not mark anything paid. Missing/unavailable verification or
a database failure returns a non-success HTTP response so the callback can retry.

`settle_toyyibpay_payment` is callable only by `service_role`. It locks the payment
and affected job/workshop, updates both in a single transaction, and ignores an
already-settled payment. A job's discount counts toward settlement. Actual
receipts above the current balance remain visible for refund/reconciliation.
Subscriptions extend from the latest of now, existing paid expiry, or trial
expiry. Owners can read their payment records but cannot alter the ledger.

The original gateway environment is saved on new payments. Existing pending
payments with no environment snapshot use the current configuration. Complete
or reconcile outstanding bills before rotating merchant secrets or switching
legacy bills between sandbox and live.

## Sandbox acceptance check

1. Configure a separate sandbox project and matching ToyyibPay sandbox account.
2. Create a job with total RM100, discount RM10 and prior payment RM20. Both owner
   checkout and customer checkout should request RM70 (7000 sen).
3. Pay through ToyyibPay's bank simulator. Confirm exactly one paid ledger record
   for RM70, job downpayment RM90, and `paid = true`.
4. Replay the signed callback; neither balance nor subscription expiry may change
   again. A modified hash must return 401 without payment writes.
5. Test failed/pending payments, an invalid category, both subscription intervals,
   and a provider-verification failure followed by a successful retry.
6. Verify the browser redirect alone never unlocks a plan or pays a job.

These changes do not repair historical records automatically. Reconcile old
`underpaid` subscriptions and job payments recorded at 1/100 of their actual
amount against ToyyibPay before correcting balances or entitlements. Do not simply
replay callbacks for records already marked paid: the new handler correctly
regards those as previously settled.

Multiple separate bills may still be payable for a job (including older shared
links). Review/refund any genuine overpayment; do not discard the extra receipt.
The public checkout endpoint does not yet have a rate limiter.

References: [ToyyibPay API](https://toyyibpay.com/apireference/) and
[Supabase function configuration](https://supabase.com/docs/guides/functions/function-configuration).
