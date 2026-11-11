# Physio city pages: area archives merged into city pages

**Date:** 10 November 2026 · **Branch:** `revamp/physio-city-pages` · **Before/after PDF:** `before-and-after/physio-city-pages-before-after.pdf`

This is the change log for the physio location pages: what changed, and why each change was made. It is a deliberate exception to the like-for-like rule in REVAMP-GUIDELINES.md, approved on 10 November 2026 after Search Console showed the area pages get close to zero clicks.

## 1. Summary

- The 833 neighbourhood archives at `/learn/physio_location/{city}-{area}/` are no longer pages. Each one 301-redirects to its city page, with the area pre-selected as a filter.
- The 66 city pages at `/learn/physio-city/{city}/` keep their URLs and are rebuilt as the one place to find physiotherapists in a city. They have an area filter, a consultation-type filter, key facts, an area index, a FAQ and structured data.
- The old WordPress pagination URLs (`…/page/2/` and later) for city and area archives also redirect to the city page.
- Nothing is lost. Every physio who appeared on an area page now appears on the city page, under that area in both the filter and the area index.

## 2. The problem

### What the area pages contained

| Physiotherapists on the page | Area pages |
| --- | --- |
| 0 (empty) | 29 |
| 1 | 683 |
| 2–3 | 95 |
| 4–9 | 24 |
| 10 or more | 2 |
| **Total** | **833** |

- 712 of the 833 pages (85%) listed one physiotherapist or none.
- None of the 833 had a description: the WordPress area description field is empty on all of them.
- On the live site, the page body was a default WordPress archive. Its only content was the profile title shown as a blog post with the editor's byline ("Dr. Hiren Patel by Fouzia | Apr 27, 2026"), followed by an unrelated "Recent Posts" sidebar. There was no H1 and no meta description. The page declared itself canonical with no noindex, so Google was asked to index it.
- The same physio card already appears on the city page, on the physio's own profile and in the directory filter. So each area page was a near-duplicate of content that exists elsewhere.

### What the live city pages contained

- Title "Ahmedabad Archives - betterhood", no H1 and no meta description.
- Five profile titles per page with the editor's byline, then "Older Entries". Ahmedabad's 91 listings ran over 19 paginated URLs.
- No summary of the city: no count, areas, fees, consultation types or experience.

### Why it mattered

- **Thin and duplicate content at scale.** Hundreds of near-empty pages can lower how Google rates the quality of the whole site, including the articles and profiles.
- **Wasted crawl budget.** Googlebot spent crawls on 833 area pages, plus about 230 pagination URLs, instead of on the pages that matter.
- **Split ranking signals.** Relevance for "physiotherapist in Ahmedabad" was spread across 64 tiny area pages and 19 paginated city pages instead of building up on one page.
- **Soft 404s.** The 29 empty area pages looked like errors to Google.
- **No traffic to lose.** Search Console shows close to zero clicks on `/learn/physio_location/` URLs, so merging them carries no measurable risk.

## 3. Options considered

| Option | What it does | Why it was or wasn't chosen |
| --- | --- | --- |
| 1. Noindex all area pages | Keeps the pages, hides them from Google | Simple, but users still land on one-card pages, and the city pages stay weak. |
| 2. Noindex only the thin ones | Indexes areas with 3+ physios (~121) | Even the bigger area pages are just card lists with no unique content, so there's little to keep. |
| **3. Merge into city pages (chosen)** | 301 each area to its city page, with the area as a filter | Removes the thin pages, passes their link signals to the city page, keeps area browsing for users, and creates one strong page per city. |

## 4. What changed

### URLs

| Old URL | New behaviour | Count |
| --- | --- | --- |
| `/learn/physio_location/{city}-{area}/` with physios | 301 → `/learn/physio-city/{city}/?area={area}` | 798 |
| `/learn/physio_location/{slug}/` that is empty or names the whole city (e.g. `…/bangalore/`) | 301 → `/learn/physio-city/{city}/` | 35 |
| `/learn/physio_location/{slug}/page/{n}/` | 301 → the same target as the area | 17 |
| `/learn/physio-city/{city}/page/{n}/` | 301 → `/learn/physio-city/{city}/` | 216 |
| `/learn/physio-city/{city}/` | Kept, rebuilt (see below) | 66 |

- **How an area maps to its city:** the longest city slug that prefixes the area slug, so `navi-mumbai-vashi` maps to Navi Mumbai, not Mumbai. All 833 areas resolve, including the 6 in two-word cities.
- **The page count matches the live site:** the number of `/page/{n}/` URLs is worked out from WordPress's 5-per-page archives. I checked this live: Ahmedabad `page/19/` returns 200 and `page/20/` returns 404.
- **Canonical:** the filtered URL `?area=…` declares the plain city page as canonical, so only 66 location URLs are indexable.
- **Sitemap:** it lists the 66 city pages and none of the redirected URLs.

### The new city page, section by section

Every number and sentence on the page is worked out at build time from the physio profiles. There's no hand-written copy, so the page stays accurate as profiles are added or edited.

1. **Breadcrumbs: Home › Physio Directory › {State} › {City}.** The state level is new and links to the existing state archive. It shows users and Google where the page sits, and lets Google show a breadcrumb trail in results (BreadcrumbList JSON-LD).
2. **H1 "Physiotherapists in {City}".** The live page had no H1. This is the exact phrase people search for.
3. **Lead sentence**, for example: "106 betterhood-certified physiotherapists in Ahmedabad, Gujarat, across 64 areas. 45 offer clinic visits, 15 offer home visits…". It answers the main question immediately, and in a form that search snippets and AI answers can quote word for word.
4. **Key facts panel:** physiotherapists, areas covered, home visits, online consults, typical fee, median experience and the last-updated date.
   - It lets people judge the city at a glance.
   - It's marked up as a definition list (`<dl>`), so the label/value pairs are easy for machines to extract.
   - The "Updated" date (the newest profile) is a freshness signal.
   - Only facts with data behind them are shown. For example, the fee tile is hidden if no profile lists a fee.
5. **Two buttons.** "See all physiotherapists" jumps to the list. "Open in directory" keeps the existing link to `/physio-directory/?city=…`.
6. **Area filter.**
   - This replaces the 833 area pages.
   - Chips show each area with its physio count, sorted by count. The top 14 are visible, with a "+ N more areas" button.
   - Old area URLs arrive with `?area=` and the filter pre-applied, so anyone with a bookmark or old link still lands on exactly those physios.
7. **Consultation filter** (clinic, home visit, video, hospital, with counts).
   - It answers the most common follow-up question ("can someone come home?").
   - It combines with the area filter.
   - It's only shown when the city has more than one consultation type.
8. **Live result line**, for example: "Showing 1 physiotherapist in Ambawadi, Ahmedabad". It's announced to screen readers (`aria-live`) so filtering is accessible.
9. **Physio grid.**
   - It uses the same physio card as the rest of the revamp.
   - All profiles are in the HTML from the start: 24 are visible, and "Show more" reveals the rest. Search engines and AI crawlers that don't run JavaScript still see and follow every profile link. Before, they were spread over up to 19 paginated URLs.
10. **"Physiotherapists by area in {City}" index.** This is an A–Z list of every area, each with its physios by name and degree, linking to their profiles.
    - It keeps the area-level information (for example, "Ambawadi: Dr. Hiren Patel") as plain, crawlable text on one strong page instead of 833 weak ones. That helps local long-tail searches like "physio in Ambawadi" and gives AI assistants a clear area → physio mapping.
    - Clicking an area name filters the list above.
11. **Common specialisations.** These are the 8 most frequent specialisations on the city's profiles, with counts. The generic "Physiotherapist" is excluded. They add topical relevance, for example "sports injury rehabilitation in Pune".
12. **FAQ, "Physiotherapy in {City}: common questions".** It's built from the data and marked up as FAQPage. It answers how many physios there are, home visits, online consultations, fees (range and median, with how many profiles list a fee) and experience.
    - These are the questions people type into Google and ask AI assistants. Each answer is a complete, factual sentence that can be quoted.
    - A question only appears when there's data to answer it.
    - Google shows FAQ rich results mainly for authoritative health and government sites, so the main gain here is answer engines and AI assistants, not a guaranteed rich result.
13. **Other cities in {State}, then More cities.** These are internal links with physio counts. They help crawlers find every city page and give users a way on when their city is small.

### Structured data (JSON-LD)

- **CollectionPage** with:
  - `about` → City → State → Country, which states clearly to search engines and LLMs which place the page is about
  - `dateModified`
  - `publisher` → the betterhood Organization
  - `mainEntity` → an ItemList of every physio profile URL and name, in page order
- **BreadcrumbList** matching the visible breadcrumbs.
- **FAQPage** matching the visible FAQ exactly. Google requires the markup to match on-page text, and it does.

### Title and meta description

| | Before (live) | After |
| --- | --- | --- |
| Title | Ahmedabad Archives - betterhood | Physiotherapists in Ahmedabad, Gujarat (106 Certified) \| betterhood |
| Meta description | none | Find 106 betterhood-certified physiotherapists in Ahmedabad, Gujarat across 64 areas including Bopal, Satellite and Naranpura. Compare experience, fees, home visits and online consultations. |
| H1 | none | Physiotherapists in Ahmedabad |

Cities with fewer than 3 physios drop the count from the title. "(1 Certified)" reads badly and doesn't help in search results.

### Look and feel

- **Same design system as the rest of the revamp:** the plum/cream palette, the display font, pill chips, the card style and the same physio card. The old pages were default WordPress archives.
- **Hero:** text sits on the left and the key facts on the right. On mobile it stacks into a single column.
- **Filters:** they sit in one white panel with labelled rows, and the chips wrap. On phones, labels sit above their chips, there's no horizontal scrolling and the tap targets are large.
- **Area index:** it flows in up to four newspaper-style columns on desktop and one on mobile.
- **No extra JavaScript libraries.** The filter is about 70 lines of plain script, and the page is static HTML.

### Accessibility

- Filter buttons use `aria-pressed`, and each filter group is labelled.
- The result count updates in a polite live region.
- The breadcrumb marks the current page with `aria-current`.
- Without JavaScript, the full list and the area index still work, and every profile is still reachable.

## 5. Redirect implementation and hosting

- The mapping is in `src/lib/physio-locations.mjs`, and `astro.config.mjs` reads it, so the redirects are regenerated from the taxonomy data on every build.
- The build writes them in three forms:
  - `dist/_redirects`: real 301s on Netlify and Cloudflare Pages
  - `dist/vercel-redirects.json`: for Vercel
  - Astro's meta-refresh fallback pages: for hosts like GitHub Pages
- `scripts/write-redirects.mjs` now rewrites the canonical tag on those fallback pages to the plain city page, without the `?area=`, so even without real 301s, search engines consolidate on the city page.
- **Action needed before launch:** production must use a host that applies `_redirects` (Netlify or Cloudflare Pages) or the Vercel config. GitHub Pages can't send real 301s; the meta-refresh fallback works for users and mostly for Google, but less reliably.

## 6. Data quality found along the way (not changed)

The content rule still applies to the data itself, so these are flagged for editors in WordPress, not fixed in code:

- **Messy area names** in the WordPress taxonomy, for example:
  - "Basement" and "Cbd Mall" are not areas
  - "S.g. Highway" has the wrong capitalisation
  - "Aarohi Arcade" is a building name

  They show exactly as stored. Fixing them in WordPress fixes the filter and the area index on the next sync.
- **Misspelt states** on some profiles ("chandiharg", "punab"). The city page uses the most common state on its profiles, so the breadcrumb is unaffected.
- **227 of the 1,817 profiles have no city,** so they appear on no city page, only in the directory. 747 profiles have no area; these show under "All areas" but not in the area index.
- **Consultation modes:** many profiles don't list any (in Ahmedabad, 45 list clinic visits out of 106), so the counts reflect what profiles state, not what physios offer.
- **Nanded** is a city term with no physios. Its page is built with noindex, as before.

## 7. New copy that needs sign-off

All of it is generated from data, but it's new wording that wasn't on the live site:

- the lead sentence template, and the key facts labels ("Physiotherapists", "Areas covered", "Home visits", "Online consults", "Typical fee", "Median experience", "Updated")
- the filter labels ("Area", "Consultation", "All areas", "Any", "+ N more areas") and the result line
- the "Physiotherapists by area in {City}" heading and its intro sentence
- "Common specialisations in {City}"
- the five FAQ question and answer templates
- "Other cities in {State}" / "More cities"
- the title and meta description templates

## 8. Files

| File | Change |
| --- | --- |
| `src/pages/learn/physio-city/[city].astro` | New city page template |
| `src/lib/physio-locations.mjs` | New: area → city mapping and the redirect list |
| `src/pages/learn/[tax]/[term].astro` | No longer builds city or area pages, and the area code is removed |
| `astro.config.mjs` | Adds the location redirects; the sitemap filter uses a set (about 1,100 redirects now) |
| `scripts/write-redirects.mjs` | Fallback redirect pages get a clean canonical |
| `scripts/before-after.mjs` | Several page pairs and a written change log in one PDF (`--label`, `--notes`, `--summary`) |
| `REVAMP-GUIDELINES.md`, `docs/session-log.md` | Progress, the approved addition and the decision recorded |

## 9. How to check it

- **Build:** `npm run build`. It builds 2,949 pages and writes 1,085 redirects.
- **Redirect:** `dist/learn/physio_location/ahmedabad-ambawadi/index.html` should redirect to `/learn/physio-city/ahmedabad/?area=ambawadi`, and its canonical should be `https://betterhood.in/learn/physio-city/ahmedabad/`.
- **Area filter:** `/learn/physio-city/ahmedabad/?area=ambawadi` should show one physio, with the "Ambawadi" chip selected.
- **Sitemap:** it should contain 66 `physio-city` URLs, no `physio_location` URLs and no `physio-city/…/page/` URLs.
- **Structured data:** paste a city URL into Google's Rich Results Test after deploy. It should find CollectionPage, BreadcrumbList and FAQPage.
- **After launch:** in Search Console, watch the Pages report as the 833 URLs move to "Page with redirect", and watch impressions for "physiotherapist in {city}" queries on the city pages.

## 10. How to undo it

To undo the change, revert the branch. The area archive template code is still in git history (`[tax]/[term].astro` before this change). Because the redirects are generated, removing the `...locationRedirects(...)` line from `astro.config.mjs` removes all of them.
