# Production deploy (Detechtico)

Architecture today:

- **Frontend:** Vercel (`https://detechtico.vercel.app`)
- **API + Postgres:** Docker Compose on Paisol (`docker-compose.prod.yml`, API on host port **8211**)
- Browser → Vercel origin → Next.js rewrites (`API_PROXY_TARGET`) → Paisol API

Do **not** set `NEXT_PUBLIC_API_URL` in Vercel. Leave it empty so cookies stay same-origin on HTTPS.

---

## 1. Fill secrets on the API host

Edit `backend/.env.production` on the server (Compose `env_file`):

| Variable | Required | Notes |
|----------|----------|--------|
| `ADMIN_BOOTSTRAP_EMAILS` | Yes (first staff) | Your real ops email(s), comma-separated. Promotes to `superadmin` on next login if `staff_role` is empty. |
| `ANTHROPIC_API_KEY` | Yes (AI review) | Without it, Claude + AI usage stay empty. |
| `STRIPE_SECRET_KEY` + four `STRIPE_PRICE_*` | Yes (billing) | Live mode for production. |
| `STRIPE_WEBHOOK_SECRET` | Yes (billing) | From Stripe endpoint on the **API host**. |
| `SMTP_*` | Yes (OTP / security mail) | Username, password, from address. |
| `JWT_SECRET` | Already set | Rotate if this file was ever shared. ≥32 chars; no `change`/`replace`/`dev`. |
| `CORS_ORIGINS` | Already set | Must include exact Vercel URL(s). Add custom domain if you use one. |

Compose also injects DB URLs and `CORS_ORIGINS` in `docker-compose.prod.yml` — keep those in sync with Postgres passwords in `backend/docker/init.sql` if you recreate the volume.

---

## 2. Deploy API + DB (Paisol)

From the repo root on the server:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Container start runs `alembic upgrade head` then uvicorn. Confirm:

```bash
curl -sS http://127.0.0.1:8211/health
docker compose -f docker-compose.prod.yml logs api --tail 80
```

Expect migrations through `0009_llm_usage` and a healthy `/health`.

---

## 3. Deploy frontend (Vercel)

Vercel env:

| Variable | Value |
|----------|--------|
| `API_PROXY_TARGET` | `http://<SERVER_PUBLIC_IP>:8211` (or HTTPS origin if you terminate TLS in front of the API) |
| `NEXT_PUBLIC_API_URL` | **unset / empty** |

Redeploy after pulling the `/admin/:path*` rewrite in `frontend/next.config.ts`.

Stripe webhooks must **not** go through Vercel. Point Stripe at:

`http(s)://<api-host>/webhooks/stripe`

---

## 4. Bootstrap staff admin

1. Create (or use) the account whose email is in `ADMIN_BOOTSTRAP_EMAILS`.
2. Log in at `https://detechtico.vercel.app/login` → you should land on `/admin`.
3. Enroll TOTP at `/admin/security` before privileged actions.
4. Clear or tighten `ADMIN_BOOTSTRAP_EMAILS` after bootstrap if you prefer only DB-managed roles.

Do not reuse local/dev admin passwords or TOTP secrets in production.

---

## 5. Smoke test

- Customer: signup/login, upload, analysis (with Anthropic key), billing checkout.
- Staff: `/admin` overview, users, jobs, AI usage (after one LLM job), audit.
- Privileged action: step-up TOTP prompt works.
- Webhook: Stripe Dashboard → recent deliveries succeed against the API host.

---

## 6. Optional hardening

- Put nginx/Caddy TLS in front of `:8211` and point `API_PROXY_TARGET` at HTTPS.
- Stop treating committed `.env.production` as the long-term secret store; inject secrets only on the host.
- Rotate DB passwords + `JWT_SECRET` if they were ever exposed outside the server.
