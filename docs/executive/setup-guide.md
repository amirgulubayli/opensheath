# Full Setup Guide (Fresh Clone)

Date: 2026-02-07

This is a step-by-step guide for a brand‑new developer to get the full app running locally.

## 1) Prerequisites

- Node.js 20+ (recommended LTS)
- npm 10+
- Docker Desktop (for Postgres)
- Git

## 2) Clone the repo

```bash
git clone <your-repo-url>
cd opensheath
```

## 3) Install dependencies (monorepo)

From the repo root:

```bash
npm install
```

## 4) Configure environment variables

Copy the example file and update values as needed:

```bash
cp .env.example .env
```

Recommended local defaults (make sure ports do not conflict):

```dotenv
# API server port
PORT=3001

# Web app → API connection
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Feature toggles (keep off unless you have keys)
ENABLE_AI_FEATURES=false
ENABLE_BILLING=false
```

If you set `ENABLE_AI_FEATURES=true`, you must set `OPENAI_API_KEY`.
Optional: set `OPENAI_MODEL` to override the default (`gpt-4.1-mini`).
If you set `ENABLE_BILLING=true`, you must set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

## 5) Start Postgres (Docker)

From the repo root:

```bash
docker compose up -d
```

This starts a local Postgres 16 + pgvector instance at `localhost:5432`.

## 6) Run database migrations

From the repo root:

```bash
npm run -w @ethoxford/persistence migrate
```

## 7) Start the API server

From the repo root:

```bash
npm run -w @ethoxford/api dev
```

The API should now be running at `http://localhost:3001`.

Health check:

```bash
curl http://localhost:3001/health
```

## 8) Start the web app

Open a second terminal at the repo root:

```bash
npm run -w @ethoxford/web dev
```

The UI should now be running at `http://localhost:3000`.

### Demo credentials

The local auth service is in‑memory and seeds a default user:

- Email: `admin@example.com`
- Password: `password123`

## 9) Validate everything (optional but recommended)

Run the full local quality gate:

```bash
npm run ci
```

Or run each check separately:

```bash
npm run lint
npm run validate:env
npm run validate:ai-runtime
npm run typecheck
npm run test
npm run build
```

## 10) Troubleshooting

- **API not reachable**: confirm `PORT=3001` in `.env` and that nothing else is using the port.
- **Web can’t call API**: verify `NEXT_PUBLIC_API_BASE_URL` and restart `@ethoxford/web` after edits.
- **Migrations fail**: confirm Postgres is running (`docker compose ps`) and `DATABASE_URL` is correct.
- **AI/Billing errors**: ensure feature toggles are `false` unless you provided keys.

## 11) Shutdown

Stop the app processes with Ctrl+C. Stop Postgres with:

```bash
docker compose down
```
