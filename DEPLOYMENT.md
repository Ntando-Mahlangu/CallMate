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

## 9. Autonomous Growth Mode

An Owner/Admin can flip a per-campaign toggle so newly-generated outreach
sends automatically instead of waiting for a manual Send click — capped
by a daily limit they set. It's deliberately narrow: it only sends within
a campaign someone already reviewed and launched; it never generates or
launches a campaign on its own.

This needs a scheduler hitting `GET /api/cron/autonomous-send` — without
one configured, the toggle can be turned on but nothing will actually
send over time (the campaign page shows "last checked" so this is visible
rather than silently assumed). Two ways to wire it up:

- **Vercel**: `vercel.json` already defines a cron pointed at that route.
  Set the `CRON_SECRET` environment variable in your Vercel project —
  Vercel automatically attaches it as `Authorization: Bearer $CRON_SECRET`
  on every cron-triggered request, which the route checks. Note Vercel's
  Hobby plan only allows once-daily cron schedules; the 30-minute interval
  in `vercel.json` needs a paid plan.
- **Any other host**: `.github/workflows/autonomous-send.yml` runs every
  30 minutes and calls the same endpoint. Set the `APP_URL` and
  `CRON_SECRET` repository secrets in GitHub (Settings → Secrets and
  variables → Actions) — without both, the workflow logs a message and
  exits without calling anything.

Without `CRON_SECRET` set at all, the endpoint refuses every request
(`501`) rather than running unauthenticated — there is no way to trigger
real sends without deliberately configuring this.

## 9a. Strategic Reviews

docs/outrun/10 "STRATEGIC REVIEWS" — weekly, monthly, and quarterly
reviews generated from real events, campaign activity, and Growth
Blueprint score changes in that period. Owners can generate one on demand
from `/ceo-agent/reviews`, but "generate automatically" needs the same
kind of scheduler as Autonomous Growth Mode above, hitting
`GET /api/cron/strategic-reviews` once a day — it checks every workspace
and only generates a review once enough time has passed since that
period's last one, so a daily cadence is enough even for weekly reviews.

- **Vercel**: `vercel.json` already defines this cron. Same `CRON_SECRET`
  as the autonomous-send cron above.
- **Any other host**: `.github/workflows/strategic-reviews.yml` runs
  daily and calls the same endpoint, using the same `APP_URL` and
  `CRON_SECRET` repository secrets.

Without `CRON_SECRET` set, this endpoint also refuses every request
(`501`) — reviews can still be generated manually from the UI regardless.

## 10. Rate limiting

docs/outrun/15 "RATE LIMITING". Authentication (sign-in, sign-up,
password reset) is protected by Better Auth's own built-in limiter
(`src/lib/auth.ts`), explicitly enabled with Postgres-backed storage so
limits hold across serverless instances rather than resetting per cold
start. AI generation endpoints, prospect search, data exports, and
webhook endpoints (Paddle, the autonomous-send and strategic-reviews
crons) are protected by a
separate app-level limiter (`src/lib/rate-limit.ts`, also Postgres-backed,
fixed-window). No configuration needed — both work out of the box against
the same `DATABASE_URL` already required for everything else.

## 11. Backups and disaster recovery

docs/outrun/15 "BACKUPS" / "DISASTER RECOVERY". Outrun has exactly one
piece of durable state: the Postgres database. There's no queue, no
background worker, no separate cache to back up — every job in this app
(Blueprint generation, outreach sends, the autonomous-send tick) runs
synchronously inside a request, so the recovery story is really "how do
we get Postgres back."

**Backups.** Don't build a custom backup job — every provider listed in
section 2 already does this better than a hand-rolled `pg_dump` cron:

| Provider | Automated backups | Point-in-time recovery |
|---|---|---|
| Neon | Yes, included | Yes (retention depends on plan) |
| Supabase | Yes, daily on paid plans | Yes on paid plans |
| Railway | Yes, via volume snapshots | Limited — check current plan docs |
| Amazon RDS | Yes, configurable window | Yes, up to the retention period |

Whichever you use: turn on automated backups and PITR in that provider's
dashboard, and set the retention window to at least 7 days. Encryption at
rest is the provider's default on all four — verify it's on rather than
assuming.

**Recovery testing.** A backup nobody has restored is a hope, not a
backup. Quarterly (or before any major migration), restore the latest
backup into a throwaway database and run:

```bash
DATABASE_URL="<restored-db-url>" npx prisma migrate deploy
DATABASE_URL="<restored-db-url>" npx prisma studio
```

Confirm the migration history applies cleanly and spot-check a few
tables (organizations, memberships, growth blueprints) for plausible
data. Record how long the restore took — that number is your actual RTO,
not an estimate.

**Disaster scenarios this app can actually hit:**

- **Database failure/corruption** — restore from the provider's latest
  backup/PITR checkpoint as above; there's no secondary datastore to fail
  over to, so this is the one true single point of failure. Mitigate by
  keeping backup retention long enough to catch corruption that isn't
  noticed immediately.
- **AI provider outage** (Anthropic) — every AI-backed route already
  fails closed with a friendly, specific error (`UserFacingError`) rather
  than a stack trace; nothing else in the app depends on it, so Mission
  Control, Prospects, Campaigns (browsing/sending), Billing, and Teams
  all keep working normally during an outage.
- **Email provider outage** (Resend) — `sendEmail()` throws, which
  surfaces as a friendly "couldn't send" error on outreach sends and
  billing notifications; auth verification/reset emails fail the same
  way. No feature silently pretends to have sent something that didn't
  go out.
- **Lead data provider outage** (Google Places) — prospect search fails
  with a friendly error; previously-saved companies and all other
  features are unaffected.
- **Payment provider outage** (Paddle) — checkout/portal links fail
  gracefully; existing `planTier` stays whatever it was last set to by a
  verified webhook, so an outage can't silently downgrade or upgrade
  anyone.
- **Hosting/cloud outage** — covered by whatever multi-region/failover
  the host (Vercel/Railway/Fly/Render) provides; this app has no
  self-managed infrastructure to fail over.

There's no worker or queue in this build, so "Worker Failure" and "Queue
Failure" from the spec don't apply yet — they'll need real runbooks once
either exists.

## 12. Incident response

docs/outrun/15 "INCIDENT RESPONSE". A lightweight runbook so an incident
has a shape instead of everyone improvising in the moment. For each
category below: **detect** (how you'd find out) → **contain** (stop it
getting worse) → **communicate** (who needs to know, and what you tell
them) → **resolve** → **postmortem** (timeline, root cause, resolution,
preventive actions — write this down every time, even for small
incidents; it's the only way patterns become visible).

- **Security incident / data breach** — Detect via `captureError()`
  reports (Sentry, if configured) or a report from a user/researcher.
  Contain: rotate the affected secret(s) immediately (`BETTER_AUTH_SECRET`,
  `PADDLE_WEBHOOK_SECRET`, `CRON_SECRET`, API keys) and force-expire
  sessions if account compromise is suspected (`prisma.session.deleteMany`
  scoped to the affected user, or all sessions if the auth secret itself
  was exposed). Communicate: notify affected workspace owners directly;
  for a confirmed breach of personal data, legal counsel determines
  disclosure obligations (see `/privacy`) — don't self-diagnose this.
- **Provider outage** (Anthropic, Resend, Google Places, Paddle) — Detect
  via `captureError()` volume for that scope (`ai.*`, `billing.*`,
  `prospects.search`, etc.) or the provider's own status page. Contain:
  nothing to do — every dependency already fails closed with a friendly
  error rather than cascading (see section 11). Communicate only if it's
  prolonged enough that users will notice a pattern (e.g. a banner on
  the affected page). Resolve: wait for the provider, or swap
  credentials if the outage is account-specific.
- **Deployment failure** — Detect via CI (`.github/workflows/ci.yml`)
  failing, or `GET /api/health` returning `503` post-deploy. Contain:
  roll back to the last known-good deployment (your host's rollback —
  Vercel/Railway/Fly/Render all support one-click revert to a previous
  build). Never debug a bad deploy live in production; roll back first,
  investigate after.
- **Performance degradation** — Detect via slow `/api/health` responses
  or elevated error rates in `captureError()` logs. Contain: check
  Postgres connection pool exhaustion first (the most likely cause given
  this app's single-database architecture) — look at the provider's
  connection dashboard. Resolve: scale the database plan, or add
  connection pooling (e.g. PgBouncer / Neon's built-in pooler) if not
  already in front of it.
- **Critical bug** — Detect via error reports or user reports. Contain:
  if it's actively harming users (e.g. sending wrong outreach content,
  double-charging), disable the specific feature rather than the whole
  app where possible — most AI/billing routes are isolated enough that
  this is surgical (e.g. temporarily unsetting `RESEND_API_KEY` disables
  all outbound email without taking down anything else). Fix forward
  with a real commit, not a hotfix patched directly in production.
