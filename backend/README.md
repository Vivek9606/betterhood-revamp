# betterhood backend: visitor journeys

A small Node service that records every visitor's journey on betterhood.in into Supabase Postgres,
plus an internal dashboard to read it.

```
Browser (src/scripts/tracker.ts) ──POST /v1/collect──▶ this service ──▶ Supabase Postgres (schema "analytics")
                                                        └─ /dashboard (password-protected)
```

## Run locally

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL and DASHBOARD_PASSWORD
npm run migrate           # creates/updates the analytics tables
npm run dev               # http://localhost:8787/dashboard
```

In the site's root `.env`, set `PUBLIC_TRACK_ENDPOINT=http://localhost:8787/v1/collect` and run `npm run dev`.
Tracking is off when that variable is empty, and for visitors with Do Not Track or Global Privacy
Control switched on.

## Deploy on Railway

1. New project → Deploy from GitHub repo → set **Root directory** to `backend`. `railway.json` already
   sets the build, runs migrations before each deploy, and adds a `/health` check.
2. Variables:
   - `DATABASE_URL`: Supabase → Project Settings → Database → Connect → **Session pooler**
     (`postgresql://postgres.ltokeuseaidwrocakhys:<password>@aws-1-eu-west-3.pooler.supabase.com:5432/postgres`).
     Don't use the direct `db.<ref>.supabase.co` host: it's IPv6-only. URL-encode the password (`+` → `%2B`).
   - `ALLOWED_ORIGINS`: `https://betterhood.in,https://www.betterhood.in`
   - `DASHBOARD_USER`, `DASHBOARD_PASSWORD`
3. Add a custom domain such as `api.betterhood.in`.
4. On the site's host, set `PUBLIC_TRACK_ENDPOINT=https://api.betterhood.in/v1/collect` and rebuild.

## What gets recorded

| Event | When | Key properties |
| --- | --- | --- |
| `page_view` | every page load | `type` (home/article/physio/assessment/result/…), `prev` |
| `page_leave` | tab hidden / closed | `engaged_ms` (time with the tab visible), `max_scroll` |
| `scroll_depth` | 25 / 50 / 75 / 100 % | `depth` |
| `section_view` | a labelled section (homepage chapters) comes into view | `section` |
| `outbound_click` | shop, product, WhatsApp, phone, email, social, other sites | `kind`, `url`, `text` |
| `painmap_select`, `painmap_cta` | homepage pain map | `spot`, `cta` |
| `search` | Learn hub / physio directory, after typing stops | `where`, `q`, `results` (0 = content gap) |
| `filter` | Learn / physio directory filters | `where` + the filter values |
| `form_start`, `form_submit` | any `form[data-bh-form]` | `form` (the fields go to `leads`) |
| `assessment_start`, `assessment_step`, `assessment_abandon`, `assessment_complete` | assessments | `assessment`, `step`, `total` (scores and answers go to `assessment_results`) |
| `identify` | call `identify({email, phone, name})` | links the browser to a person |
| `web_vital` | LCP, CLS, INP, TTFB | `metric`, `value`, `rating` |
| `js_error` | uncaught errors (max 5 per page) | `message` |

Custom events: `track("name", {...})` from `src/scripts/tracker.ts`, or add
`data-track="event_name" data-track-foo="bar"` to any clickable element.

Each session also stores: landing and exit page, referrer, channel (paid / organic / social / email /
whatsapp / campaign / referral / direct), UTM tags, `gclid`/`fbclid`, device, OS, browser, screen,
language, timezone, and city/region/country. The city comes from the IP address, and the **IP itself
is never stored**.

**Identity.** Each browser gets an anonymous id (localStorage and a first-party cookie). A session ends
after 30 minutes idle or when a new campaign link is opened. When someone submits a form or an
assessment with an email or phone number, they become a `user`, and **all of that browser's earlier
sessions are linked to them**. Email and phone are matched across devices, so two browsers using the
same email become one person. Shopify links get `?bh_aid=…&bh_sid=…` added so orders can be matched
back later.

**Where contact details and health data live.** Names, emails, phones and assessment answers are
stored only in `users`, `leads` and `assessment_results`. They are stripped from the `events` log.
All tables sit in the `analytics` schema, which Supabase's public REST API doesn't expose. Only this
service can read it.

## Tables & views

`analytics.users`, `visitors`, `sessions`, `events`, `leads`, `assessment_results`, plus the views
`v_daily`, `v_assessment_steps` and `v_attribution`. They're useful from the Supabase SQL editor:

```sql
-- one person's full log
select e.ts, e.name, e.path, e.props
from analytics.events e join analytics.visitors v on v.id = e.visitor_id
join analytics.users u on u.id = v.user_id
where u.email = 'someone@example.com' order by e.ts;
```

New migrations go in `migrations/NNN_name.sql`. `npm run migrate` applies the ones that haven't run.

## Dashboard tabs

- **Overview:** KPIs compared with the previous period, a daily trend, channels (with conversion),
  landing pages, pages (with average active time and scroll), devices, cities and referrers.
- **Assessments:** funnel per assessment (opened → started → each step → completed), where people
  leave, and the results given.
- **Behaviour:** searches (zero-result ones highlighted), form start-to-submit rates, pain-map picks,
  physio profiles contacted, outbound clicks, every event, slowest pages, and JS errors.
- **Leads:** assessment results and form leads with their source, CSV export. Click a row to open the journey.
- **Sessions:** latest visits. Click a row to open the journey.
- **Journey:** search by email or phone and see every visit, page and action in order, plus the assessment answers.
