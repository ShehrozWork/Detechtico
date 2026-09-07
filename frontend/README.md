# Detechtico

Next.js frontend and FastAPI backend for explainable financial-statement fraud review.

## Stack

- Frontend: Next.js (port 3000)
- API: FastAPI + custom auth (port 8000)
- Database: Postgres 16 (Docker)
- Billing: Stripe Checkout + Customer Portal (Essential / Professional)

Do not use Clerk or Supabase.

## Run locally

Docker Desktop on Windows often cannot use the published Postgres port from the host. Run the API in Compose on the same network as Postgres.

```bash
docker compose -f frontend/docker-compose.yml --project-directory . up -d --build
```

That starts Postgres, applies Alembic migrations, and serves the API at http://127.0.0.1:8000.

2. Copy env files:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Set `JWT_SECRET` in `backend/.env` to at least 32 random characters:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add `ANTHROPIC_API_KEY` for Claude review. Without it, deterministic rules still run.

### Stripe (subscriptions)

1. In Stripe Dashboard (test mode), create products **Essential** and **Professional** with monthly and annual recurring Prices matching marketing copy.
2. Copy the four Price IDs and your Secret key into `backend/.env` (`STRIPE_PRICE_*`, `STRIPE_SECRET_KEY`).
3. Point the Stripe webhook endpoint at the **API host** (never the Next.js/Vercel origin):

   - Production: `https://<api-host>/webhooks/stripe`
   - Local: `stripe listen --forward-to localhost:8000/webhooks/stripe`

   Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

4. Enable Customer Portal (cancel / update payment; optionally allow switching among the four Prices only).

Subscribe events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`, `checkout.session.expired`.

After trial (3 days) expires, product APIs return `403 subscription_required` until the user has an `active` / `trialing` / `past_due` subscription.

3. Apply migrations:

```bash
cd backend
.venv\Scripts\alembic upgrade head
```

4. Backend:

```bash
cd backend
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

5. Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, create an account, then use Statement Analysis.

Password reset links are written to the API log in development only.

Vercel `API_PROXY_TARGET` rewrites include `/billing/*` only — **do not** proxy `/webhooks/stripe` through Next.js.

## Security notes

- Bind the API to `127.0.0.1` in development.
- In production set `ENVIRONMENT=production`, `COOKIE_SECURE=true`, a unique `JWT_SECRET`, and `TRUST_PROXY=true` only behind a known reverse proxy.
- Production uses a non-superuser database role (`detechtico_app`) with row-level security on documents, jobs, findings, and subscriptions.
- Stripe secrets stay server-side only. Checkout uses server-mapped Price IDs (never client-supplied).
