# Revamp guidelines

Read this before changing any page in this project.

## What this project is

This is a **revamp of the live site at [betterhood.in](https://betterhood.in)**. It is not a new website. The live
site runs on WordPress. This project rebuilds it as a fast static site (Astro) that will replace the live site
at the same domain and URLs.

We redesign the site **one page at a time**. Each page is finished, reviewed against the live page, and
recorded with a before/after PDF before we move on to the next one.

## The one rule: content stays exactly the same

The revamp changes **only two things**:

1. **Design:** layout, typography, colour, spacing, imagery treatment, motion, responsiveness.
2. **Technical SEO:** how the page is built and marked up (see below).

Everything a visitor reads or acts on must match the live page **exactly**:

| Must stay identical to the live site | Notes |
| --- | --- |
| All text | Headlines, body copy, button labels, captions, testimonials, FAQs, legal text. Copy it exactly, including spelling, capitalisation and punctuation. Do not reword, shorten, "improve" or summarise. |
| Sections and their order of content | Every section on the live page exists on the new page. Nothing is dropped and nothing new is invented. |
| Products, prices, offers, codes | Pulled from Shopify / the live data, never typed by hand. |
| Links and CTAs | Same destinations. Internal links keep their exact slugs. |
| Images and media | Same images (mirrored under `public/wp-content/uploads/` with the same paths). Cropping and framing may change to fit the design. The image itself does not. |
| Forms and assessments | Same fields, options, scoring and results. |
| URLs | Every page keeps its live slug. Removed or merged pages get a 301 in `astro.config.mjs`. |

If you think content on the live site is wrong or could be better, **raise it with the team. Don't change it
here.** Content changes are a separate decision and happen after the revamp ships.

Wherever possible, content is **read from data scraped from the live site** (e.g. `src/data/home.json`,
`content-src/`) instead of being retyped into components. That keeps the copy identical and makes it easy to
re-sync before cutover (`npm run sync`, `npm run scrape:home`).

## What "technical SEO" covers

Changes in this area are allowed, and encouraged:

- Unique `<title>`, meta description, canonical URL and robots tag per page (same title/description wording as
  the live site unless the team agrees otherwise)
- Open Graph and Twitter card tags, with a proper share image
- Structured data (JSON-LD): Organization, Product, Article, Breadcrumb, FAQ, etc.
- One `<h1>` per page and a logical heading order
- Semantic HTML, alt text, accessible labels and landmarks
- Performance / Core Web Vitals: static HTML, responsive and lazy-loaded images, explicit image sizes, minimal
  JavaScript, `prefers-reduced-motion` support
- XML sitemap, trailing-slash consistency and 301 redirects for any old URLs
- Clean internal linking (no broken links, no redirect chains)

Most of this lives in `src/layouts/Base.astro` and `astro.config.mjs`.

## Page-by-page workflow

1. **Capture the live page.** Screenshot it at desktop and mobile widths and scrape its content into the data
   files.
2. **Redesign** the page in this project using that content as-is.
3. **Check the content against the live page** section by section: text, links, images, products, forms.
4. **Check the technical SEO** items above.
5. **Check the layout** at common desktop sizes (1280×720, 1366×768, 1440×900, 1920×1080) and on mobile.
6. **Make the before/after PDF** (see below) and commit it together with the page.
7. Mark the page as done in the progress table below.

## Before/after PDFs

Every redesigned page gets a PDF in [`before-and-after/`](before-and-after/) showing the live page ("before")
next to the redesigned page ("after"). The PDF is the record for review and sign-off. It also shows that the
content is unchanged and only the design differs.

- Name: `<page-slug>-before-after.pdf` (the homepage is `homepage-before-after.pdf`)
- Include desktop views and, where the layout differs a lot, mobile views
- Regenerate the PDF if the page design changes after sign-off
- Generate it with `node scripts/before-after.mjs --name <slug> --live <live url> --local <local url>` against
  `npm run build && npm run preview` (the dev toolbar is hidden automatically). It captures desktop (1440) and
  mobile (390) full pages of both and prints them side by side. The live WordPress site delays some CSS until a
  real user interaction; the script sends real input events so its grids and carousels render properly.

## Progress

| Page | URL | Status | Before/after PDF |
| --- | --- | --- | --- |
| Homepage | `/` | Redesigned, in review | [homepage-before-after.pdf](before-and-after/homepage-before-after.pdf) |
| Learn hub | `/learn/` | Redesigned, in review | [learn-before-after.pdf](before-and-after/learn-before-after.pdf) |
| Article template | `/learn/{slug}/` | Redesigned, in review | [article-before-after.pdf](before-and-after/article-before-after.pdf) |
| Author archives | `/learn/author/{slug}/` | Restored (were missing), not yet redesigned | – |
| Physio city pages | `/learn/physio-city/{city}/` | Redesigned, in review; the 833 area archives are merged in (see Approved additions) | [physio-city-pages-before-after.pdf](before-and-after/physio-city-pages-before-after.pdf) |
| Physio area archives | `/learn/physio_location/{slug}/` | Removed: 301 to the city page with the area filter set | (in the city pages PDF) |
| Physio directory | `/physio-directory/` | To do | – |
| Physio profile template | `/physio/{slug}/` | To do | – |
| Assessments & results | `/assessment-*/`, `/result-*/` | To do | – |
| betterYou corner | `/better-you-corner-*/` | To do | – |
| Protocol pages | `/*-protocols/` | To do | – |
| Other pages | About, Contact, Corporate wellness, Slouch Catcher, Longevity toolkit, Wellness hub, PhysioEdge course, legal | To do | – |

## Approved additions (beyond like-for-like)

Features the team asked for that add new copy or UI. Each one can be switched off, and its new copy needs
sign-off before launch.

- **Betty on article pages.** Betty is the betterhood red panda in a betterhood hoodie
  (`src/components/Betty.astro`; config and every line of copy in `src/data/betty.json`; switch off with
  `"enabled": false`).
  - Betty peeks from the bottom-left corner. She says hi once per session and cheers when the reader finishes.
  - When a paragraph that mentions a betterhood product (a link to the product, or its name) scrolls into the
    reading area, Betty pushes in a surprise box and a small gift appears on that sentence. Opening either one
    reveals the product card, which links to the product page in the shop.
  - Up to 3 surprises per article. Unopened ones collect in Betty's tray.
  - The article text is unchanged: the build only adds attributes, plus a `<span>` around an unlinked product
    name.
  - The artwork is an original stand-in drawn in SVG, to be replaced with the official Betty art.
  - Renamed product links are mapped to current products by `npm run resolve:products`, which writes
    `src/data/product-aliases.json`.

- **Physio area archives merged into city pages** (approved 10 November 2026, after Search Console showed close
  to zero clicks on the area URLs). This one changes URLs and adds page content, so it goes beyond like-for-like.
  - The 833 `/learn/physio_location/{city}-{area}/` archives (712 of them listed one physio or none) now
    301-redirect to `/learn/physio-city/{city}/?area={area}`. The old `/page/N/` archive URLs redirect too.
  - City pages (`src/pages/learn/physio-city/[city].astro`) gained an area filter and a consultation-type filter,
    a key facts panel, an A–Z area index, common specialisations, a FAQ, and links to other cities. All of it is
    worked out from the profile data, and the wording needs sign-off.
  - Mapping and redirects: `src/lib/physio-locations.mjs`. The full change log and the reasons are in
    [docs/physio-city-pages.md](docs/physio-city-pages.md), and also in the before/after PDF.

See [README.md](README.md) for how to run, build and deploy the project.
