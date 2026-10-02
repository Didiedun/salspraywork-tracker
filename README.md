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

## Database changes of 30 Sep 2026

Both files are already applied to the production project. Apply them, in order,
to any other database before deploying the frontend that uses them:

- `supabase/migrations/20260930120000_quotations.sql`: the `quotations` table
  behind the **Sebut Harga** page. Owner-only; workers and the public have no access.
- `supabase/migrations/20260930120100_attachments_and_secret_hardening.sql`:
  drops the leftover public `workshops.toyyibpay_secret_key` column (the key
  lives only in `workshop_secrets`), and limits uploads and deletes in the
  `attachments` bucket to signed-in members of the workshop that owns the file.
  Reading files stays public.

`tests/quotations-storage.test.mjs` runs both against PGlite with owner, worker,
stranger and logged-out roles.

The customer tracking page (`/w/:slug`) and the landing page counters no longer
read tables directly. They are applied in two steps:

1. `supabase/migrations/20260930130000_tracking_lookup.sql` (already applied to
   production): `track_jobs(slug, plate, phone)` returns exact matches only (the
   full plate, or the full phone number), with the customer's number masked and
   photos only. `platform_stats()` returns the landing page totals.
2. `supabase/migrations/20260930130100_close_public_job_reads.sql`: removes the
   policies that let anyone read every active job, every attachment row and every
   file name in the `attachments` bucket. Apply it only once a frontend that calls
   `track_jobs` is live; the older tracking page reads `jobs` directly and finds
   no cars without those policies.

`tests/tracking-lookup.test.mjs` covers both steps.

## Database changes of 2 Oct 2026

Apply in this order. The first three work with the current frontend, so they can
go in before the deploy; the fourth only after it.

1. `20261002120000_employee_self_service_limits.sql`: workers could change every
   column of their own `employees` row through the API (including the basic salary
   that payroll copies into payslips) and delete it along with their payslips. Now
   they can only fill in IC, EPF/SOCSO and bank details; pay and employment details
   stay with the owner.
2. `20261002120100_public_lookup_minimisation.sql`: `workshop_public(slug)` returns
   only what the tracking page shows, and `track_jobs` returns the customer's first
   name and an initial ("Ahmad F.") instead of their full name.
3. `20261002120200_legal_acceptances.sql`: records which version of the Terms of
   Service and Privacy Notice each user accepted, with the server's time.
4. `20261002120300_close_public_workshop_reads.sql`: removes the policy that let
   anyone list every workshop's phone, address, owner and billing dates. Apply it
   only once the frontend that calls `workshop_public` is live.

`tests/employee-self-service.test.mjs` and `tests/public-lookup.test.mjs` cover them.

## Privacy Notice, Terms and business details

- `/privasi` and `/terma` show the Privacy Notice and Terms of Service in Bahasa
  Melayu and English (`src/legal/content.js`). Keep them in step with what the app
  does, and have a lawyer review changes.
- `src/legal/business.js` holds who runs Digital Depot (name, SSM number once
  registered, email, phone or address). The site footer and both documents read it;
  the Consumer Protection (Electronic Trade Transactions) Regulations 2012 ask for
  these details on the site.
- `LEGAL_VERSION` in the same file is the documents' effective date. Change it when
  either document changes materially: signed-in users then see a one-time banner to
  accept the new version, and new users accept it at onboarding.
- Settings → Data & privacy lets an owner export every job as CSV and email a
  deletion request. Deletion is done by hand after confirming with the owner.

## ToyyibPay setup and deployment

There are two separate merchant accounts/configurations:

- Customer job payments use the workshop's credentials, saved through
  **Settings → Payment Gateway** into the private `workshop_secrets` table.
- Pro subscription payments use the platform's Supabase Edge Function secrets:
  `PLATFORM_TOYYIBPAY_SECRET_KEY`, `PLATFORM_TOYYIBPAY_CATEGORY_CODE`, and
  `PLATFORM_TOYYIBPAY_SANDBOX` (exactly `true` for test mode; unset or any other
  value means live).

Sandbox (test) payments move no real money, so production never accepts them.
Only a project with the secret `TOYYIBPAY_ALLOW_SANDBOX=true` (a separate test
project) creates sandbox bills or lets a sandbox payment mark a job paid or
extend a plan. Everywhere else, sandbox checkouts are refused (owner checkout
returns `409` with `code: "gateway_test_mode"`) and a sandbox payment that still
arrives is recorded as `rejected` with `gateway_status = 'sandbox_blocked'`.

Settings always saves workshop credentials in live mode. Workshops saved while the
old test-mode toggle existed (8 June to 10 July 2026, on by default) can still be
flagged; Settings shows them as **Mod ujian** and their online payments stay off
until the owner saves live credentials from toyyibpay.com. To list them:

```sql
select id, name, toyyibpay_sandbox from public.workshops
where toyyibpay_secret_set and toyyibpay_sandbox is distinct from false;
```

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

### What deploys automatically

- **Website:** Cloudflare Pages builds every push (a preview for pull requests,
  production for `main`).
- **Edge Functions:** `.github/workflows/deploy-supabase-functions.yml` runs the
  tests and then deploys every function whenever function code or
  `supabase/config.toml` reaches `main`. It needs two repository secrets
  (GitHub → Settings → Secrets and variables → Actions): `SUPABASE_ACCESS_TOKEN`
  (from supabase.com/dashboard/account/tokens) and `SUPABASE_PROJECT_REF`. It can
  also be started by hand from the Actions tab (**Run workflow**).
- **Database migrations and function secrets:** never automatic. Apply
  migrations deliberately (see above) and manage secrets with
  `supabase secrets set`.

To deploy by hand instead, from the project directory, after verifying the CLI
is linked to the correct Supabase project, deploy the functions:

```sh
supabase functions deploy create-bill
supabase functions deploy create-bill-public
supabase functions deploy create-subscription-bill
supabase functions deploy payment-callback
supabase functions deploy check-payment
```

`check-payment` backs the owner's **Semak status bayaran** button in *Kutip
Bayaran*: when ToyyibPay's callback never arrives, it looks the job's pending
bills up with ToyyibPay directly and settles verified payments exactly as the
callback would. Only the workshop owner can call it.

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
transaction at the original sandbox/live endpoint. It requires a successful status,
MYR currency and the exact expected amount. The lookup is scoped to the payment's
own bill code; `billExternalReferenceNo` must match when ToyyibPay returns it, but
its absence (the documented response example omits it) no longer blocks settlement. Browser
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

1. Configure a separate sandbox project with `TOYYIBPAY_ALLOW_SANDBOX=true` (and
   `PLATFORM_TOYYIBPAY_SANDBOX=true` for subscriptions) and a matching ToyyibPay
   sandbox account.
2. Create a job with total RM100, discount RM10 and prior payment RM20. Both owner
   checkout and customer checkout should request RM70 (7000 sen).
3. Pay through ToyyibPay's bank simulator. Confirm exactly one paid ledger record
   for RM70, job downpayment RM90, and `paid = true`.
4. Replay the signed callback; neither balance nor subscription expiry may change
   again. A modified hash must return 401 without payment writes.
5. Test failed/pending payments, an invalid category, both subscription intervals,
   and a provider-verification failure followed by a successful retry.
6. Verify the browser redirect alone never unlocks a plan or pays a job.
7. Pay a bill, then press **Semak status bayaran** before the callback lands (or
   with the callback blocked): the job settles once, and a second check or a late
   callback changes nothing.
8. In a project without `TOYYIBPAY_ALLOW_SANDBOX`, a sandbox-flagged workshop
   cannot create bills, the customer portal hides **Bayar Sekarang**, and a
   sandbox callback leaves the job unpaid.

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
