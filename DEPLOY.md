# Deploying Cheffinator — one service, everything included

The app is a single Node process: Express serves the API, the built frontend
(`frontend/dist`), the SQLite database, and uploaded images. No external
database or storage service is required — one host with a persistent disk
runs everything.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `DATA_DIR` | yes* | Directory on a **persistent volume** for `cheffinator.db` + `uploads/` (e.g. `/data`) |
| `ADMIN_SECRET` | strongly recommended | Enables `/api/admin/*` and `tools/admin.html`. Without it the admin API is disabled (safe default). Pick a long random string. |
| `GOOGLE_CLIENT_ID` | recommended | Enables "Continue with Google" sign-up/sign-in. Without it only access-code login shows. |
| `CHEFFINATOR_API` | optional | Anthropic API key for AI nutrition estimation |
| `DATABASE_URL` | alternative to `DATA_DIR` | Use PostgreSQL instead of SQLite |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` | optional | Use Supabase for images instead of local disk |

\* Production refuses to start without `DATA_DIR` or `DATABASE_URL` — SQLite
on ephemeral disk would lose all data on redeploy.

Node **22.5+** is required (`node:sqlite`; the start script passes
`--experimental-sqlite`, harmless on newer Node).

## Option A — Railway (~$5/month)

1. Push the repo (the `railway.json` is already set up; `npm start` is the start command).
2. New project → Deploy from the repo.
3. Add a **Volume**, mount it at `/data`.
4. Set variables: `NODE_ENV=production`, `DATA_DIR=/data`, `ADMIN_SECRET=<random>`, optionally `CHEFFINATOR_API`.
5. Add the custom domain `cheffinator.com` (update the Cloudflare DNS record).

## Option B — Render (~$7/month, Starter instance)

Same idea: Web Service from the repo, build command `npm install` (postinstall
builds the frontend), start command `npm start`, add a **Disk** mounted at
`/data`, set the same environment variables. Note: Render's free tier has no
disks and spins down — the paid Starter instance is the minimum for SQLite.

## Option C — Small VPS (Hetzner ~€4/month, full control)

```bash
git clone <repo> && cd cheffinator
npm run install:all && npm run build
NODE_ENV=production DATA_DIR=/var/lib/cheffinator ADMIN_SECRET=<random> node --experimental-sqlite backend/server.js
```

Run it under systemd, put Caddy in front for HTTPS
(`cheffinator.com { reverse_proxy localhost:3001 }`).

## Google sign-in setup (free, ~5 minutes)

1. Go to https://console.cloud.google.com/ → create a project (e.g. "Cheffinator").
2. **APIs & Services → OAuth consent screen**: External, app name Cheffinator, add your email. No scopes beyond the defaults are needed. Publish the app (or add testers while testing).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://cheffinator.com` and, for local dev, `http://localhost:5173`
   - No redirect URIs needed (the app uses the Google Identity Services button, not a redirect flow).
4. Copy the client ID (`xxxx.apps.googleusercontent.com`) into the `GOOGLE_CLIENT_ID` env var (both locally and on the host).

First-time Google users pick a unique chef name (their public profile handle);
returning users go straight in. Access codes keep working alongside.

## Migrating the local data

The local DB is `backend/cheffinator_local.db`. Copy it to the volume as
`cheffinator.db` (and copy `backend/uploads/` into `<DATA_DIR>/uploads/`),
or re-run `tools/import-cookbook.mjs` against the deployed URL
(`CHEFFINATOR_URL=https://cheffinator.com`, after creating the user).

## Backups

Everything lives in two places: `<DATA_DIR>/cheffinator.db` and
`<DATA_DIR>/uploads/`. Copying those two is a complete backup. The admin
console can also export/import a JSON backup.

## Admin console

Served by the app at `https://cheffinator.com/admin` (locally
`http://localhost:3001/admin`). Enter the API URL (prefilled) and the
`ADMIN_SECRET`; without the secret every admin call is refused. From there:
recipes (rename, transfer, delete, share), users (create with password,
set/reset any user's password — the password-recovery story — sign out
everywhere, rename, delete), tags, storage, and JSON backup/import.

## Static cookbook (optional, free)

`node tools/export-cookbook.mjs --user mrdru3000` regenerates the read-only
cookbook site (bilingual A4 pages + index) from the database — deployable to
Netlify free, independent of the app being up.
