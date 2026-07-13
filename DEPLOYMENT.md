# Deploying Outrun

This covers what's needed to run Outrun outside of local development.
Everything here is infrastructure/account setup — no code changes are
required to go live once these are in place.

## 1. Hosting

Next.js deploys cleanly to **Vercel** (zero-config) or any Node host that
can run `npm run build && npm run start` (Railway, Fly.io, Render). Vercel
is the least-friction choice unless you want the app and database on the
same platform.

## 2. Production database

Local dev uses a Postgres instance running in the sandbox — it does not
persist. Before deploying, provision a real Postgres database. Any of
these work with zero code changes (just set `DATABASE_URL`):

- [Neon](https://neon.tech) — serverless Postgres, generous free tier
- [Supabase](https://supabase.com) — Postgres + extras
- [Railway](https://railway.app) — Postgres alongside your app
- Amazon RDS — if you're already on AWS

Once you have a connection string, run the migration history that's
already tracked in `prisma/migrations/`:

```bash
npx prisma migrate deploy
```

Never run `prisma db push` against production — it doesn't produce a
migration history and can silently apply destructive changes. `db push`
is a dev-only convenience; `migrate deploy` is what CI/deploy should run.

## 3. Environment variables

Copy `.env.example` and fill in real values. Every variable is documented
inline there. Summary of what's required vs. optional:

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Production Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes | Generate a **fresh** one per environment: `openssl rand -base64 32`. Never reuse the dev secret. |
| `BETTER_AUTH_URL` | Yes | Your production URL, e.g. `https://app.yourdomain.com` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Enables "Continue with Google"; hidden until set |
| `RESEND_API_KEY` / `EMAIL_FROM` | Recommended | Without it, verification/reset emails log to the server console instead of sending |
| `ANTHROPIC_API_KEY` | Yes | Growth Blueprint, company research, and outreach generation all depend on this |
| `GOOGLE_PLACES_API_KEY` | Yes | Prospect search depends on this |
| `PADDLE_API_KEY` / `PADDLE_WEBHOOK_SECRET` | Yes | Billing |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | Yes | `sandbox` while testing, `production` when live |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Yes | Paddle → Developer Tools → Authentication → Client-side tokens |
| `NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID` | Yes | The Price ID for the Starter product you create in Paddle's Catalog |

## 4. Paddle webhook

In Paddle → Developer Tools → Notifications, add a webhook destination
pointed at:

```
https://<your-domain>/api/billing/webhook
```

Subscribe it to every `subscription.*` event. Copy the signing secret it
gives you into `PADDLE_WEBHOOK_SECRET`.

Every real subscription state change (activated, payment failed, canceled)
emails the workspace owner via `src/lib/billing/notifications.ts` — this
needs `RESEND_API_KEY` set to actually deliver; without it, notifications
log to the server console like every other email in this app.

## 5. Health check

`GET /api/health` returns `200 {"status":"ok"}` when the app can reach the
database, and `503` otherwise. Point your host's uptime/health check at
this endpoint.

## 6. Before taking real signups

- Replace the `[Insert ...]` placeholders in `/privacy`, `/terms`, and
  `/security` with real content, **reviewed by a lawyer** — the current
  copy is a structured starting point, not a legal document.
- Set `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production` and use a live (not
  sandbox) Paddle price ID.
- Confirm `BETTER_AUTH_SECRET` was freshly generated for this environment.

## 7. Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: it spins
up a throwaway Postgres service, applies the migration history with
`prisma migrate deploy`, then runs lint, typecheck, and a full `next
build`. There's no automated test suite yet (see DEPLOYMENT.md's sibling
task list) — the pipeline only runs checks that actually exist today
rather than a placeholder test step.

## 8. Observability

Every server-side catch block calls `captureError()`
(`src/lib/observability.ts`) instead of a bare `console.error`. It always
emits a structured JSON log line — readable by any host's log
aggregation (Vercel, Railway, Fly...) with no extra setup. Set
`SENTRY_DSN` to additionally forward errors to Sentry (or any
Sentry-ingest-compatible service): this uses Sentry's plain HTTP envelope
endpoint directly, no SDK dependency, so it degrades to console-only
logging exactly like `sendEmail()` degrades without `RESEND_API_KEY`.
Render errors that escape every component boundary are caught by
`src/app/global-error.tsx`, which shows a friendly fallback screen (never
a stack trace) and reports through the same pipeline via
`/api/observability/client-error`.
