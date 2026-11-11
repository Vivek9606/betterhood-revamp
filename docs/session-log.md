# Session log

A running record of what was done in each working session, what was decided, and what's still open. Newest
first. The rules for the revamp itself are in [REVAMP-GUIDELINES.md](../REVAMP-GUIDELINES.md).

---

## 2026-11-11: Website ↔ app wiring (one assessment flow, physio directory sign-up), test deploy

**Merged to `main` and deployed** (with the city pages work from 2026-11-10). Three repos are involved:
- website: this repo → GitHub Pages, https://vivek9606.github.io/betterhood-revamp
- backend: `capacitor-app/capacitor-app-backend` → DigitalOcean, https://lionfish-app-snwe2.ondigitalocean.app
- app: `capacitor-app/capacitor-app-physio` → Vercel, https://capacitor-app-three.vercel.app

This is a **testing** deploy: WhatsApp messages are only logged, and the OTP code is always `123456`. The database
is the production Supabase, though.

### Asked for
1. Connect the website's assessments to the app's patient journey, and the physio directory sign-up to the app's
   physio flow.
   - **Physio directory:** a physio visiting the website can list themselves in the directory with a full form. On
     submit, the profile goes live on the website and the physio is shown its URL.
   - **Assessments:** keep one assessment flow. Taken in the app, it opens inside the app (the user never leaves)
     and the result is saved to their account. No duplication.
2. What's needed to make it live, then the full env set to copy-paste (testing deploy, not production).
3. Commit and push all three repos to trigger the builds, then fix what came up in testing.
4. A CTA on the result page telling patients to get the app.

### Done
- **One assessment flow.**
  - The website owns the assessments. The app opens them in an in-app frame (`WebFlow`) with `?embed=app`, which
    hides the site's chrome.
  - The page and the app talk over postMessage: `bh:ready`, `bh:context`, `bh:assessment-result`, `bh:ack` and
    `bh:directory-published` (`src/scripts/embed.ts` here, `src/lib/web.ts` in the app).
  - The app's own quiz engine and form copies were deleted. All 9 website assessments (pain, health, longevity)
    save to the patient's account. Only pain results trigger a physio match.
- **Physio directory sign-up, `/physio-directory/join/`.**
  - Steps: WhatsApp OTP, then the full listing form, then publish. Publishing shows the profile URL and checks it
    until it is live. Listed physios can come back to edit.
  - Signing up creates the same physio account the app uses. In the app, Profile has a "betterhood.in directory"
    card that opens this same page.
  - Listings are stored in the backend's `directory_profiles` table (migration 005).
  - The site build pulls them in through `scripts/sync-directory.mjs` and renders them at `/physio/{slug}/`. They
    get the badge "Listed on betterhood", or "Registration verified" once checked; never "certified".
  - Each publish asks GitHub to rebuild the site (`repository_dispatch` with the event `directory-updated`).
- **Website results open the app.**
  - The CTAs: pain result pages get a "Save it in the app" card; health and longevity scores get a "Track it in
    the betterhood app" button.
  - The result travels in the URL fragment (`/welcome#import=…`), without the name or contact details. The app
    saves it once the visitor signs in as a patient.
- **Fixes found while testing the live deploy:**
  - `PUBLIC_API_URL` and `PUBLIC_APP_URL` are variables on the `github-pages` environment, so the build job now
    uses that environment. Without it, the join page showed "Listing isn't available right now".
  - The join page read the phone and code fields from the wrong form, so "Send code on WhatsApp" crashed.
  - Links built in the browser didn't get the `/betterhood-revamp/` prefix, so result pages 404'd. Fixed with the
    `<meta name="bh-base">` tag and `src/scripts/base.ts`.

### Still open
- [ ] **Test the deployed flows end to end** (the user is starting tomorrow):
  - an assessment taken in the app
  - a physio sign-up on the website, the URL going live, then logging in to the app with the same number
  - editing the listing from the app
  - admin hide/show of listings
  - the website result CTA landing in the app
- [ ] If a listing never goes live, check the DigitalOcean logs for `directory: site rebuild request failed`. That
      would mean the `SITE_REBUILD_TOKEN` can't dispatch to `Vivek9606/betterhood-revamp`.
- [ ] A second GitHub Actions job, **"pages build and deployment"** (Jekyll), fails on every push. It's harmless:
      the real deploy is "Deploy to GitHub Pages". Set **Settings → Pages → Source** to **GitHub Actions** to stop
      it. Don't add a root `.nojekyll`, or that job would publish the raw source.
- [ ] Before production:
  - real WhatsApp provider; remove `OTP_DEV_CODE`
  - `PUBLIC_SITE_URL` set to betterhood.in, and the app's `VITE_WEBSITE_URL` likewise
  - CORS for betterhood.in
- [ ] Not tested on a device yet: the in-app frame inside the native Capacitor shell (iOS/Android). It has only
      been tested in the browser build.
- [ ] This log entry isn't committed yet. It goes in with the next push.

---

## 2026-11-10: Physio city pages (area archives merged)

**Merged to `main` and deployed on 2026-11-11** (branch `revamp/physio-city-pages`).

### Asked for
1. "What next to work on". I recommended the physio directory and profile template, and raised the thin
   `/learn/physio_location/` pages that need a decision first.
2. An explanation of the thin location pages problem, then whether those pages have any content value. They
   don't: none has a description, 712 of the 833 list one physio or none, and on the live site the body is a
   WordPress archive showing "{physio} by Fouzia | {date}".
3. "Close to zero" Search Console clicks, so go with option 3: merge the area pages into city pages, "in the most
   SEO friendly way and also in terms of look and feel and in terms of user and LLM visibility". Record every change in a
   before/after PDF, and log in detail why each change was made.

### Done
- **City pages, `/learn/physio-city/{city}/`** (`src/pages/learn/physio-city/[city].astro`, a new template; the
  66 URLs are unchanged).
  - New sections: an area filter and a consultation filter (synced to `?area=&mode=`), a key facts panel, the full
    physio grid in HTML, an A–Z area index, common specialisations, a FAQ, and links to other cities.
  - Everything is worked out from the profiles, with no hand-written copy.
  - Structured data: CollectionPage (about City → State, an ItemList of profiles, dateModified), BreadcrumbList and
    FAQPage.
  - New title and meta description templates. The live page had "{City} Archives", no description and no H1.
- **Area archives removed.** The 833 `/learn/physio_location/…` URLs 301-redirect:
  - 798 go to `/learn/physio-city/{city}/?area={area}`.
  - 35 empty or city-wide ones go to the plain city page.
  - 233 old `/page/N/` URLs for city and area archives redirect too. The page counts come from the live 5-per-page
    archives.
  - In total, 1,085 redirects are generated from the data by `src/lib/physio-locations.mjs`.
- **Fallback redirects:** the fallback redirect pages now point their canonical at the clean city URL
  (`scripts/write-redirects.mjs`).
- **The generic archive template** (`[tax]/[term].astro`) no longer builds city or area pages.
- **Before/after tool:** it can now put several page pairs and a written change log into one PDF (`--label`,
  `--notes`, `--summary`).
- **Before/after PDF:** `before-and-after/physio-city-pages-before-after.pdf`. It covers the Ahmedabad city page,
  and the Ambawadi area page next to the filtered city page, on desktop and mobile. Its rationale section is
  `docs/physio-city-pages.md`.
- **Build:** 2,949 pages and 1,085 redirects. The sitemap has 66 city URLs and no area URLs.

### Decisions
- **Merge, don't noindex** (option 3). The area pages have no unique content and no traffic. Recorded under
  "Approved additions" in REVAMP-GUIDELINES.md.
- Old area URLs land on the city page with the filter pre-applied, while the canonical stays the plain city page.
- Profile pages keep their existing "Top areas" links to `/physio-directory/?area=…`, as on the live site.

### Open: needs a decision or input
- [ ] **Hosting:** real 301s need Netlify, Cloudflare Pages (`_redirects`) or Vercel. GitHub Pages only gets the
      meta-refresh fallback.
- [ ] **Copy sign-off** for the generated city page wording (list in `docs/physio-city-pages.md` §7).
- [ ] **WordPress data clean-up:**
  - Area names that aren't areas ("Basement", "Cbd Mall") or are badly capitalised ("S.g. Highway").
  - Misspelt states ("chandiharg", "punab").
  - 227 profiles with no city.
- [ ] **Paginated archives elsewhere:** other `/page/N/` archives (categories, tags) from the live site aren't
      built or redirected either. Check them when those archives are redesigned.

---

## 2026-11-09: Learn hub, article template, author archives, Betty

**Merged to `main` as `efa8d0e`** (fast-forward from branch `revamp/learn-articles-betty`). The push triggers the
GitHub Pages deploy.

### Asked for
1. Ideas for the article page design, and how to categorise the existing blogs so LLMs can find them.
2. "Revamp the https://betterhood.in/learn/ page first and then the individual articles page."
3. Introduce **Betty** on articles. Betty is the mascot: a Himalayan red panda in a hoodie with the betterhood
   logo. She should interact with readers, and when a paragraph coming up mentions a betterhood product, push a
   surprise box into the bottom of the screen (or onto the sentence). Clicking it shows the product.
4. Remove all analytics events and dashboard code. This repeats the 2026-11-03 instruction; see Decisions.

### Done
- **Learn hub, `/learn/`** (`src/pages/learn/index.astro`). All copy comes from the live page through
  `scripts/scrape-learn.mjs` → `src/data/learn.json`.
  - Sections: featured article, newsletter, trending, then a filterable grid with search and "Load More".
    Filters cover body area, health concern, solution and type, and they sync to the URL. Then Must Knows, the
    expert section and a newsletter band.
  - Structured data: CollectionPage and BreadcrumbList JSON-LD.
  - Before/after PDF: `before-and-after/learn-before-after.pdf`.
- **Article template, `/learn/{slug}/`** (`src/pages/learn/[slug].astro`, `src/lib/article.ts`). The live
  page's elements come through `scripts/scrape-article.mjs` → `src/data/article.json` and `authors.json`.
  - Layout: new design, a sidebar (newsletter, trending, socials, contents list), Featured Articles and the
    Featured Products rail.
  - Body processing: each article body gets heading ids and a scroll wrapper on tables, and its FAQ and
    references sections are styled. The text of all 758 articles is verified unchanged.
  - Structured data: MedicalWebPage, BlogPosting/VideoObject, BreadcrumbList and FAQPage JSON-LD.
    - 634 articles get a FAQPage.
    - 625 get citations.
  - Before/after PDF: `before-and-after/article-before-after.pdf`.
- **Author archives, `/learn/author/{slug}/`**: these existed on the live site but were missing from the
  revamp, so they're restored (noindex, as on live). They haven't been redesigned yet.
- **Before/after tool**: `scripts/before-after.mjs` takes full-page desktop and mobile screenshots of the live
  page and the new page and puts them side by side in a PDF. It triggers the live site's delayed CSS with real
  mouse events.
- **Betty** (`src/components/Betty.astro`, `src/lib/betty.ts`, `src/data/betty.json`):
  - She peeks from the bottom-left corner, says hi once per session and cheers at the end of the article.
  - A paragraph that mentions a product triggers a surprise as it scrolls into the reading area: Betty pushes in
    a gift box, and a gift button appears next to the product name. Either one opens a product card with price,
    saving, the betterhood10 offer and View Product.
  - Up to 3 surprises per article. Unopened ones collect in Betty's tray, which also has "Hide Betty".
  - Mentions are found at build time. They're either links to betterhood shop products or product names that
    editors have used as link text elsewhere.
    - Coverage: 271 of 758 articles, 410 surprises.
    - Old Shopify handles are mapped to current products by `npm run resolve:products` →
      `src/data/product-aliases.json`.
  - Switch Betty off with `"enabled": false` in `betty.json`.
- **Analytics removed**: Betty's events and the UTM tags on her shop links are gone. There's no analytics or
  dashboard code anywhere in the site.

### Decisions
- **No analytics, tracking events, UTM tags, data collection or dashboards** anywhere in the revamp (2026-11-03,
  restated 2026-11-09).
- **Betty is an approved addition beyond like-for-like content.** She's flag-gated, and all her copy is new and
  needs sign-off. Recorded in REVAMP-GUIDELINES.md under "Approved additions".
- Product names and prices come from Shopify (`products.json`), even where an old article cache differs.
- Work is committed on a branch first, because a push to `main` deploys.

### Open: needs a decision or input
- [ ] **Betty artwork.** The current one is an original SVG stand-in; swap in the official art (SVG preferred).
- [ ] **Betty copy sign-off.** Every line is in `src/data/betty.json`.
- [ ] **Broken product link in WordPress.** `betterhood-menthol-magnesium-pain-relief-recovery-patch` 404s on
      the shop. Fix it in the live articles.
- [ ] **"In this article" contents list.** It's not on the live page; sign off, or switch off with `SHOW_TOC` in
      `[slug].astro`.
- [ ] **Learn hub additions.** The hidden "Learn" h1 and the "Sorry, no content found." empty-state text both
      need sign-off.
- [ ] **Shopify title typo**: "Teck Neck" should be "Tech Neck". Fix it in Shopify.
- [ ] **Invented copy** still in the global Newsletter component and the footer pre-CTA; replace it with live
      copy or get it signed off.
- [ ] **`/physio/__trashed/`** is a deleted WordPress profile that's being built and set to be indexed. Drop or
      redirect it.
- [ ] **833 thin `/learn/physio_location/…` pages** are set to be indexed. Decide whether to merge them into
      city pages or noindex them when the physio directory is redesigned.
- [ ] **Topic classification spreadsheet** (body area / condition / article type for LLM visibility). It was
      proposed, then paused.

### Notes
- The build makes about 3,800 pages:
  - 1,817 physio profiles
  - 758 articles
  - about 1,050 physio directory archive pages (location, city, speciality, qualification, state, experience)
  - 80 author archive pages
  - about 20 blog archives
  - about 76 standalone pages
- Next pages in the plan: the physio directory and the physio profile template (see Progress in
  REVAMP-GUIDELINES.md).
