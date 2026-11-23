# Production deploy plan: website + app on betterhood.in (Cloudflare Pages)

Status: **agreed, not started.** Discussed with the user on 2026-11-23. Nothing has been built or changed yet.

## Goal

Serve the website and the app from one domain, split by path:

- `betterhood.in/`: website (this repo, Astro 5, static build)
- `betterhood.in/app/`: app (`Vivek9606/capacitor-app`, the web build of React 18 + Vite + Capacitor)

The backend stays on DigitalOcean. Today the test deploys are GitHub Pages (website), Vercel (app) and
DigitalOcean (backend). See the memory note / session log for the URLs.

Why one domain: the user prefers it. A side benefit is that the website and the app share one origin, so the
`?embed=app` iframes stop being cross-origin and the X-Frame-Options problem goes away.

## Agreed architecture: two source repos, one deploy repo

```
betterhood-revamp (website)          capacitor-app (app)
   push to main                         push to main
        │                                    │
  Action: build Astro                  Action: build Vite with VITE_BASE=/app/
        ▼                                    ▼
   ┌──────────── betterhood-dist (deploy repo, build output only) ─┐
   │  /            ← website files (everything except app/)        │
   │  /app/        ← app files                                     │
   │  _redirects   ← owned by the website; has /app/* → /app/index.html 200 │
   └────────────────────────┬──────────────────────────────────────┘
                            ▼
              Cloudflare Pages (no build command) → betterhood.in
```

The rules agreed with the user:
- The two source repos stay separate. Each one gets a workflow that builds **only itself** on push to `main` and
  commits its output to **its own part** of `Vivek9606/betterhood-dist` (name proposed, not yet confirmed).
- The website deploy replaces everything except `app/`. The app deploy replaces only `app/`. Neither can wipe the other.
- If both push at about the same time, the second deploy pulls the latest, re-applies its files and pushes again
  (retry on non-fast-forward). No deploy is lost.
- Each deploy commit message names its source, e.g. `website@<sha>` / `app@<sha>`, so it traces back to the
  source commit and each half can be rolled back on its own.
- Each source repo gets its own deploy key (SSH, write access to betterhood-dist only) stored as a secret.
- Cloudflare Pages is connected to betterhood-dist with an **empty build command** and the repo root as output.
  Branches of the deploy repo can give preview URLs later if staging is wanted.
- The native Android/iOS build is separate and unchanged: it still uses `VITE_BASE=/`.

## Facts checked in the code (2026-11-23)

- The app already supports a sub-path: `vite.config.ts` reads `base` from `VITE_BASE`, and `src/App.tsx` sets
  `BrowserRouter basename` from `import.meta.env.BASE_URL`. The app's `vercel.json` has the SPA rewrite. On
  Cloudflare, `_redirects` replaces it.
- The website has `src/pages/404.astro`, so Cloudflare won't fall back to the SPA automatically. The `_redirects`
  rule for `/app/*` is **required**.
- The website has no `/app` page, so there's no route clash (`/physio-app` is a separate page).
- Website astro `redirects` (old WordPress URLs) are generated as static redirect pages. Consider moving them
  into `_redirects` for real 301s.
- The existing website workflow `.github/workflows/pages.yml` must be carried over or replaced. Keep in mind:
  - It also runs on `repository_dispatch` types `directory-updated` (the API, when a physio edits a listing) and
    `lab-published` (the Content Lab). The new workflow must keep these triggers.
  - The env vars (`PUBLIC_API_URL`, `PUBLIC_APP_URL`, `PUBLIC_FORM_ENDPOINT`, `PUBLIC_MEDIA_ORIGIN`,
    `PUBLIC_TRACK_ENDPOINT`, `LAB_SUPABASE_URL`, `LAB_SUPABASE_KEY`) live as variables on the `github-pages`
    environment. A new environment (e.g. `production`) needs them too.
  - It runs `scripts/rebase-dist.mjs` to prefix the `/betterhood-revamp` sub-path. On the root domain this
    step isn't needed.

## Env changes at cutover

- Website: `PUBLIC_APP_URL=https://betterhood.in/app`
- App web build: `VITE_BASE=/app/`, `VITE_WEBSITE_URL=https://betterhood.in`
- Backend: CORS allow-list must include `https://betterhood.in` (check), and maybe `api.betterhood.in` later.
- After the revamp is live on betterhood.in, remove `VITE_WEBSITE_URL` from `capacitor-app-physio/.env.local`
  (it points the test APK at GitHub Pages).

## Access (as of 2026-11-23)

- Git on this machine can push to both source repos (user `vivekgwork-cmd`).
- `gh` (GitHub CLI) was **not installed**. The user is installing it and will run `gh auth login`. It's needed to
  create betterhood-dist and add the deploy keys and secrets.
- Cloudflare: **the user handles it themselves.** No wrangler or Cloudflare access here. When betterhood-dist
  has files, give them the exact Pages settings (repo, empty build command, output dir `/`).

## Next steps (in order)

1. Confirm `gh auth status` works, and confirm the deploy repo name with the user.
2. Create `Vivek9606/betterhood-dist`, generate two deploy keys, add the public keys to betterhood-dist and the
   private keys as secrets in each source repo.
3. Website: add the deploy workflow (keeping the dispatch triggers and env vars), plus `public/_redirects`.
4. App: add the deploy workflow (`VITE_BASE=/app/`).
5. Run both once so betterhood-dist has content. Hand the Cloudflare settings to the user.
6. Test on the `*.pages.dev` URL: the website, `/app/` deep links on reload, the embedded flows, login.
7. Only after that: point betterhood.in DNS at Cloudflare Pages, and retire GitHub Pages and Vercel.
