# Detechtico

Next.js frontend and FastAPI backend for explainable financial-statement fraud review.

## Stack

- Frontend: Next.js (port 3000)
- API: FastAPI + custom auth (port 8000)
- Database: Postgres 16 (Docker)

Do not use Clerk or Supabase.

## Run locally

Docker Desktop on Windows often cannot use the published Postgres port from the host. Run the API in Compose on the same network as Postgres.

```bash
docker compose up -d --build
```

That starts Postgres, applies Alembic migrations, and serves the API at http://127.0.0.1:8000.

2. Copy env files:

```bash
cp .env.example .env.local
cp backend/.env.example backend/.env
```

Set `JWT_SECRET` in `backend/.env` to at least 32 random characters:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add `ANTHROPIC_API_KEY` for Claude review. Without it, deterministic rules still run.

3. Apply migrations:

```bash
cd backend
.venv\Scripts\alembic upgrade head
```

4. Backend:

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

5. Frontend:

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, then use Statement Analysis.

Password reset links are written to the API log in development only.

## Security notes

- Bind the API to `127.0.0.1` in development.
- In production set `ENVIRONMENT=production`, `COOKIE_SECURE=true`, a unique `JWT_SECRET`, and `TRUST_PROXY=true` only behind a known reverse proxy.
- Production uses a non-superuser database role (`detechtico_app`) with row-level security on documents, jobs, and findings.
