# betterhood.in — revamp

A full rebuild of betterhood.in as a fast static site (Astro). Every URL from the current WordPress
site keeps its exact slug, and all of its content is carried over: 758 articles, 1,817 physio
profiles, every taxonomy archive, all pages, the assessments with their original scoring, and the
media library.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/ (+ dist/_redirects for 301s)
npm run preview
```

Node 20+ is required.

## What's where

| Path | What |
| --- | --- |
| `src/pages/index.astro` | Homepage (hero, "where does it hurt?" body map, bestsellers, physios, age timeline…) |
| `src/pages/learn/[slug].astro` | All 758 articles at `/learn/{slug}/` |
| `src/pages/learn/index.astro` | Learn hub with search + filters (type, what's inside, concern, solution) |
| `src/pages/learn/[tax]/[term].astro` | Every archive at `/learn/{taxonomy}/{term}/`: category, by-health-concern, by-solution, by-what-inside, post-section-tags, podcast-season, physio-city, physio-state, physio_location, physio_speciality, physio_experience, physio_qualification |
| `src/pages/physio/[slug].astro` | All 1,817 physio profiles at `/physio/{slug}/` |
| `src/pages/physio-directory.astro` | Directory with state/city/area/mode filters; old `?state=&city=&area=` links still work |
| `src/pages/assessment-*.astro` | The 9 assessments, rebuilt as a step-by-step UI |
| `src/pages/result-*.astro` | The 16 diagnosis result pages |
| `src/pages/better-you-corner-*.astro` | betterYou corner (personal dashboard) |
| `src/pages/[legal].astro` | Privacy, terms, shipping, return(s), EEO policies |
| `src/lib/site.ts` | Contact details, navigation, offers ticker, shop links |
| `src/styles/global.css` | Design tokens and base styles |

## Design & motion

- **Homepage story** (`src/components/story/*.tsx`, styles in `src/styles/story.css`): React islands
  animated with [Motion](https://motion.dev) (Framer Motion). The page is told in chapters: the hero
  expands into the brand promise; a figure slouches decade by decade (20s → 50s+); the founders' quote
  fills in word by word; a pinned horizontal scroll walks through how products are made; then the
  interactive pain map, expanding use-case panels, proof (count-ups, draggable reels with a
  shared-element video player), physios fanning out of a deck, a tilt-card bestseller carousel, and
  a finale where the figure stands tall again.
- **Every other page** gets motion from `src/scripts/motion-site.ts` (vanilla Motion, no React):
  Lenis smooth scrolling, word-by-word headline reveals, cascading card grids, image parallax and
  page-to-page view transitions. The header hides on scroll down and returns on scroll up.
- `prefers-reduced-motion` is respected everywhere: pinned sections become static and animations are
  skipped.

## How the assessments work

The old Gravity Forms quizzes are converted into JSON by `scripts/extract-forms.mjs` (fields,
calculation formulas, conditional logic). `src/scripts/quiz-engine.ts` runs that logic in the
browser, so the scores and diagnosis are the same as on the old site:

- **Pain assessments (level 1):** the highest of the four category totals (muscle / nerve / bone /
  joint) decides the result page; the "critical advisory" note is shown when the original rules fire.
- **Health assessments (level 2) and longevity goals:** strength, balance, mobility and overall
  scores out of 10 are shown at the end and in betterYou corner.

The old betterYou corner required a WordPress login. The new one needs no account: results are saved
in the visitor's browser (localStorage) on their device.

## Forms (action needed)

The site is static, so form submissions need somewhere to go. Set `PUBLIC_FORM_ENDPOINT` to any
webhook that accepts JSON (Google Apps Script, Make, Zapier, Formspree, your CRM). The forms are
contact, corporate wellness, newsletter, Slouch Catcher waitlist, eBook / cheat-sheet requests and
assessment leads. Every payload includes `form`, `page` and `submittedAt`.

If no endpoint is set, forms open a pre-filled email to care@betterhood.in instead. Assessment leads
are only sent when an endpoint exists, so the quiz is never interrupted by an email window.

See `.env.example`.

## Visitor journey tracking

`src/scripts/tracker.ts` records each visitor's journey (page views, time on page, scroll, clicks, searches,
assessment funnel, form submissions, Web Vitals) and sends it to the service in `backend/`, which stores it in
Supabase and serves an internal dashboard. Set `PUBLIC_TRACK_ENDPOINT` to turn it on. See
[backend/README.md](backend/README.md).

## Shop

The shop already runs on Shopify (`shop.betterhood.in`). Product cards, prices and images come
from Shopify's public `products.json`; cart, checkout and account all link to Shopify.
`/shop/`, `/cart/`, `/checkout/`, `/my-account/` and `/wishlist/` redirect there.

## Media

All 2,700+ uploads the site uses are mirrored into `public/wp-content/uploads/` with the **same paths**
as WordPress (about 290 MB), so image URLs don't change. Commit this folder: once WordPress is switched
off it will be the only copy. To re-download, run `npm run mirror:media` (it skips files you already
have and needs the old site to be online).

## Re-syncing content from WordPress (before cutover)

```bash
npm run sync         # REST API + Shopify + physio/SEO scrapes + rebuild src/data
npm run mirror:media
```

## Redirects

These are defined in `astro.config.mjs` and written to `dist/_redirects` (Netlify / Cloudflare Pages)
and `dist/vercel-redirects.json`. They cover the old homepages, test pages and the WooCommerce
pages (now on Shopify), plus `/longevity-goals/` → `/longevity-goals-before/`, which the live site
already redirects.

## Deploy / cutover checklist

1. Set `PUBLIC_FORM_ENDPOINT` and `PUBLIC_TRACK_ENDPOINT` in the host's environment (deploy `backend/` first).
2. Run `npm run sync && npm run mirror:media` once more, then `npm run build`.
3. Deploy `dist/` (Cloudflare Pages, Netlify, Vercel or any static host).
4. Point betterhood.in at the new host.
5. Submit `https://betterhood.in/sitemap-index.xml` in Google Search Console.
