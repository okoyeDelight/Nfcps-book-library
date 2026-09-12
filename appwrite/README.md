# NFCPS One → Appwrite migration

This folder is the production migration path away from AppDeploy. It is deliberately staged so the currently installed Android APK keeps working throughout the move.

## Safety rules

- AppDeploy remains live until the replacement is verified.
- `nfcps-bootstrap.json` is **not** switched until Appwrite Watch and API health checks pass.
- Android package/signing/version continuity is untouched.
- The existing AppDeploy cron jobs remain authoritative during Stage 1, preventing duplicate reminders or NFCPS Moments.
- The Appwrite jobs function starts in `legacy-shadow` mode and performs no writes.

## Stage 1 architecture

`NFCPS One APK → remote bootstrap → Appwrite Site (/watch) → Appwrite nfcps-api → existing AppDeploy API`

This moves the public Watch host first while preserving current behavior. The API bridge gives us one stable Appwrite endpoint that can be converted route-by-route from legacy proxying to native Appwrite Database/Auth/Realtime/Messaging handlers later.

## Appwrite resources

The free-tier design uses two Functions:

1. `nfcps-api` — monolithic HTTP API. During Stage 1 it proxies existing NFCPS API routes to AppDeploy and exposes a native `/health` endpoint.
2. `nfcps-jobs` — one `*/5 * * * *` scheduler. It internally gates 5-minute Moments, 10-minute Watch refresh, and hourly circulation work. It is non-mutating until the Appwrite database migration is ready.

The Watch site uses the existing static Next.js source in `watch-netlify/`. The folder name is historical; the code is now host-neutral and can run on Appwrite Sites.

## One-time Appwrite Console setup

Create one Appwrite Cloud project, connect GitHub repository `okoyeDelight/Nfcps-book-library`, then create these resources from the `appwrite-migration` branch first:

### Function: NFCPS One API

- Runtime: Node.js 22
- Root directory: `appwrite/functions/nfcps-api`
- Entrypoint: `src/main.js`
- Build command: `npm install`
- Execute access: Any
- Timeout: 30 seconds
- Environment variable (optional because the current value is the built-in migration default):
  - `NFCPS_LEGACY_API_BASE=https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y`

After deployment, copy the generated `https://<function-id>.<region>.appwrite.run` domain.

### Function: NFCPS One Jobs

- Runtime: Node.js 22
- Root directory: `appwrite/functions/nfcps-jobs`
- Entrypoint: `src/main.js`
- Build command: `npm install`
- Schedule: `*/5 * * * *`
- Environment variable: `NFCPS_JOBS_MODE=legacy-shadow`

Do **not** turn off the AppDeploy cron jobs yet.

### Site: NFCPS One Watch

- Framework: Next.js
- Rendering: Static
- Root directory: `watch-netlify`
- Install command: `npm install --no-audit --no-fund`
- Build command: `npm run build`
- Output directory: `out`
- Environment variables:
  - `NEXT_PUBLIC_NFCPS_API_BASE=<generated nfcps-api Appwrite function domain>`
  - `NEXT_PUBLIC_NFCPS_API_FALLBACK=https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y`

The frontend only auto-fails-over read requests. Mutations never replay automatically, avoiding accidental duplicate reservations or writes after an ambiguous timeout.

## Verification before traffic cutover

1. Open `<nfcps-api-domain>/health` and confirm `ok: true`, `platform: appwrite`, `mode: legacy-bridge`.
2. Open the Appwrite Watch site and verify Home/Watch feed, Shorts, search/filtering, video launch, Watch Later, Continue Watching, Scripture Lens, and navigation back to the main app.
3. Confirm browser/API errors are absent in Appwrite logs.
4. Only then replace the `/watch` route origin in `nfcps-bootstrap.json` with the Appwrite Site domain.
5. Keep AppDeploy and Netlify available as rollback targets until Stage 2 is stable.

## Stage 2 and beyond

After Stage 1 is healthy, migrate data and services behind `nfcps-api` in this order:

1. Watch cache/discovery (regenerable, lowest-risk).
2. Ebook/library read APIs.
3. Account sync and authentication.
4. Physical loans, reservations, waitlist, and history.
5. NFCPS Moments preferences and notification identities.
6. Realtime/Watch Together and push messaging.
7. Scheduled jobs, after comparing Appwrite results against the still-running legacy jobs.
8. Finally move the remote bootstrap `app_url` away from AppDeploy and retire the old host.

Transient Watch/sermon caches can be regenerated. Active loans, waitlists, loan history, Moments preferences and member/account state must be copied and verified before their legacy tables are retired.

## CLI configuration

`appwrite.config.example.json` mirrors the intended resources for Appwrite CLI users. It intentionally contains placeholders rather than account-specific project IDs or regions.
