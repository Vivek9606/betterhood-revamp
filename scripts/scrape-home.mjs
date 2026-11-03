// Pulls every section of the live WordPress homepage into src/data/home.json, so the new homepage
// renders exactly the same copy, products, images and links.
//
//   node scripts/scrape-home.mjs            fetch https://betterhood.in/ (saved to content-src/html/home.html)
//   node scripts/scrape-home.mjs --offline  re-parse the saved copy
//
// Clean-ups applied while extracting (the content itself is untouched):
// - product links on betterhood-shop.myshopify.com are rewritten to shop.betterhood.in
// - uploads become root-relative (/wp-content/uploads/...) so they're served from the mirror
// - empty placeholders (blank physio / reel quotes) are dropped
// - links that pointed at "#" on the old page get a real target (noted in `fixedLinks`)
import fs from "node:fs";
import * as cheerio from "cheerio";
import sharp from "sharp";

const SRC = "content-src/html/home.html";
const OUT = "src/data/home.json";
const SHOP = "https://shop.betterhood.in";

let html;
if (process.argv.includes("--offline")) {
  html = fs.readFileSync(SRC, "utf8");
} else {
  const res = await fetch("https://betterhood.in/", { headers: { "user-agent": "Mozilla/5.0 (betterhood-revamp content sync)" } });
  if (!res.ok) throw new Error(`betterhood.in returned ${res.status}`);
  html = await res.text();
  fs.writeFileSync(SRC, html);
}

const $ = cheerio.load(html);
const home = $(".bh-home").first();
if (!home.length) throw new Error("No .bh-home block found: has the live homepage been rebuilt?");

const txt = (el) => $(el).text().replace(/\s+/g, " ").trim();
const up = (u = "") => u.replace(/^https?:\/\/(www\.)?betterhood\.in(?=\/wp-content\/)/, "");
const link = (u = "") => u.replace(/^https?:\/\/betterhood-shop\.myshopify\.com/, SHOP).replace(/^https?:\/\/(www\.)?betterhood\.in(?=\/)/, "");
const bg = (el) => up(($(el).attr("data-bg") || $(el).attr("style") || "").match(/url\(['"]?([^'")]+)/)?.[1] || "");
const handle = (u = "") => u.match(/\/products\/([^/?#]+)/)?.[1] || "";
// keeps <strong>/<em> emphasis from the old markup as [[b]]…[[/b]] / [[i]]…[[/i]] markers, drops the rest
const rich = (el) => {
  const c = $(el).clone();
  c.find("br").replaceWith(" ");
  c.find("strong,b").each((_, n) => $(n).replaceWith(`[[b]]${$(n).text()}[[/b]]`));
  c.find("em,i").each((_, n) => $(n).replaceWith(`[[i]]${$(n).text()}[[/i]]`));
  return c.text().replace(/\s+/g, " ").replace(/\[\[\/(b|i)\]\]\s*\[\[\1\]\]/g, " ").trim();
};
// the old page repeats track items 3x for its infinite scroller; keep the first copy
const uniq = (arr, key) => { const seen = new Set(); return arr.filter((x) => (seen.has(key(x)) ? false : seen.add(key(x)))); };
const fixedLinks = [];

// ---- hero
const hero = home.find(".bh-hero");
const heroData = {
  title: rich(hero.find("h1")),
  sub: txt(hero.find(".bh-hero-copy p").first()),
  cta: { label: txt(hero.find(".bh-hero-cta a")), href: link(hero.find(".bh-hero-cta a").attr("href")) },
  image: up(hero.find("img.bh-hero-img").attr("src")),
  imageMobile: up(hero.find("picture source").attr("srcset")),
};

// ---- product range strip under the hero
const range = uniq(home.find(".bh-range .bh-prodtile").toArray().map((a) => ({
  href: link($(a).attr("href")),
  handle: handle($(a).attr("href")),
  image: bg($(a).find(".bh-photo")),
  badge: txt($(a).find(".bh-best")) || null,
  cta: txt($(a).find(".bh-view")),
})), (x) => x.href);

// ---- trust stats
const trust = home.find(".bh-trust .bh-stat").toArray().map((s) => ({ value: txt($(s).find(".bh-stat-num")), label: txt($(s).find(".bh-stat-label")) }));

// ---- shop by concern
const concernSec = home.find(".bh-concern");
const concern = {
  eyebrow: txt(concernSec.find(".bh-eyebrow2")),
  more: { label: txt(concernSec.find(".bh-link-more")), href: link(concernSec.find(".bh-link-more").attr("href")) },
  title: rich(concernSec.find("h2")),
  sub: txt(concernSec.find(".bh-sub")),
  tabs: concernSec.find(".bh-cmenu-item").toArray().map((b, i) => {
    const panel = concernSec.find(`.bh-cpanel[data-i="${i}"]`);
    return {
      label: txt(b),
      href: link(panel.find(".bh-cpromo").attr("href")),
      banner: bg(panel.find(".bh-cpromo .bh-photo")),
      products: panel.find(".bh-cprod-card").toArray().map((a) => {
        const rate = txt($(a).find(".bh-cprod-rate")).match(/([\d.]+)\s*\|\s*(\d+)\s*Reviews?/i);
        const price = $(a).find(".bh-cprod-price");
        const compare = txt(price.find("s"));
        price.find("s").remove();
        return {
          title: txt($(a).find(".bh-cprod-name")),
          href: link($(a).attr("href")),
          handle: handle($(a).attr("href")),
          image: bg($(a).find(".bh-cprod-img")),
          rating: rate ? Number(rate[1]) : null,
          reviews: rate ? Number(rate[2]) : 0,
          price: txt(price),
          compare: compare || null,
        };
      }),
      cta: txt(panel.find(".bh-cside > a, .bh-btn").filter((_, a) => /explore/i.test(txt(a))).first()) || "Explore Now",
      note: txt(panel.find("*").filter((_, e) => /^Recommended by/i.test(txt(e)) && !$(e).children().filter((_, c) => /^Recommended by/i.test(txt(c))).length).first()),
    };
  }),
};

// ---- story: co-created with physiotherapists
const storySec = home.find(".bh-story");
const story = {
  title: rich(storySec.find("h2")),
  cards: storySec.find(".bh-postcard").toArray().map((c) => ({ title: txt($(c).find("h3")), text: rich($(c).find("p")), pin: up($(c).find(".bh-pin-img").attr("src")) })),
  background: { desktop: up(storySec.find(".bh-story-bg.is-d").attr("src")), mobile: up(storySec.find(".bh-story-bg.is-m").attr("src")) },
  art: storySec.find(".bh-story-art").toArray().map((i) => up($(i).attr("src"))),
};

// ---- shop by use case
const ucSec = home.find(".bh-usecase");
const usecase = {
  eyebrow: txt(ucSec.find(".bh-eyebrow2")),
  more: { label: txt(ucSec.find(".bh-link-more")), href: link(ucSec.find(".bh-link-more").attr("href")) },
  title: rich(ucSec.find("h2")),
  sub: txt(ucSec.find(".bh-sub")),
  items: uniq(ucSec.find(".bh-ucard").toArray().map((a) => ({ label: $(a).attr("data-tab"), href: link($(a).attr("href")), image: bg($(a).find(".bh-photo")) })), (x) => x.label),
};

// ---- clinically accountable
const clinicSec = home.find(".bh-clinic");
const clinic = {
  title: rich(clinicSec.find("h2")),
  sub: txt(clinicSec.find(".bh-sub")),
  steps: clinicSec.find(".bh-step").toArray().map((s) => ({ text: rich($(s).find(".bh-step-card")), icon: up($(s).find(".bh-step-ic img").attr("src")) })),
};

// ---- physios we work with
const phSec = home.find(".bh-physios");
const physios = {
  title: txt(phSec.find("h2")),
  people: uniq(phSec.find(".bh-physio-card").toArray().map((c) => {
    const quote = txt($(c).find(".bh-physio-quote")).replace(/[“”"\s]/g, "") ? txt($(c).find(".bh-physio-quote")) : null;
    return { name: txt($(c).find(".bh-physio-name")), role: txt($(c).find(".bh-physio-qual")), image: bg($(c).find(".bh-photo")), badge: txt($(c).find(".bh-vchip")), quote };
  }), (x) => x.name),
};

// ---- one place, everything your pain needs (categories + video)
const catSec = home.find(".bh-cat");
const viewAll = catSec.find(".bh-cat-viewall a");
let viewAllHref = link(viewAll.attr("href"));
if (!viewAllHref || viewAllHref === "#") { fixedLinks.push({ section: "categories", label: txt(viewAll), was: "#", now: `${SHOP}/collections/all` }); viewAllHref = `${SHOP}/collections/all`; }
const note = rich(catSec.find(".bh-catvid-note")).replace(/^[“"]\s*|\s*[“”"]$/g, "");
const categories = {
  title: rich(catSec.find("h2")),
  sub: txt(catSec.find(".bh-sub")),
  video: catSec.find(".bh-catvideo").attr("data-video")?.match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/)?.[1] || null,
  note,
  items: catSec.find(".bh-catrow").toArray().map((a) => ({ href: link($(a).attr("href")), image: bg($(a).find(".bh-photo").not(".bh-photo-m")), imageMobile: bg($(a).find(".bh-photo-m")) })),
  viewAll: { label: txt(viewAll), href: viewAllHref },
};

// ---- don't just take our word for it (video reels)
const wSec = home.find(".bh-words");
const words = {
  title: txt(wSec.find("h2")),
  sub: txt(wSec.find(".bh-sub")),
  reels: uniq(wSec.find(".bh-reel-thumb").toArray().map((r) => ({
    id: ($(r).attr("data-video") || "").match(/(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/)?.[1],
    tag: txt($(r).find(".bh-reel-tag")),
    length: txt($(r).find(".bh-reel-len")) || null,
  })), (x) => x.id),
};

// ---- most people wait too long
const ageSec = home.find(".bh-age");
const begin = ageSec.find(".bh-age-outro a");
let beginHref = link(begin.attr("href"));
if (!beginHref || beginHref === "#") { fixedLinks.push({ section: "age", label: txt(begin), was: "#", now: "/quiz-landing-page/" }); beginHref = "/quiz-landing-page/"; }
const age = {
  title: rich(ageSec.find("h2")),
  sub: txt(ageSec.find(".bh-sub").first()),
  intro: rich(ageSec.find("> .bh-wrap .bh-age-intro, .bh-age-wrap2 > .bh-age-intro").first()),
  decades: ageSec.find(".bh-age-row").toArray().map((r) => ({ age: txt($(r).find(".bh-age-dot")), title: txt($(r).find("h4")), text: txt($(r).find("p")) })),
  outro: { title: rich(ageSec.find(".bh-age-outro .bh-age-intro")), text: txt(ageSec.find(".bh-age-outro p").not(".bh-age-intro")), cta: { label: txt(begin), href: beginHref } },
};

// ---- featured in (press)
const pressName = (src) => {
  const known = { "62f108334177a24963a5e023": "Fundz", entrackr: "Entrackr", "bw-disrupt": "BW Disrupt", viestories: "VIE Stories", inshorts: "Inshorts", "deccan-founders": "Deccan Founders", scoopearth: "Scoop Earth", "indian-startup-times": "Indian Startup Times", entrepreneur: "Entrepreneur", yugma: "Yugma", indianweb2: "IndianWeb2", "business-review-live": "Business Review Live", "bharat-fast": "Bharat Fast", "ipo-platform": "IPO Platform", "startup-rise-asia": "Startup Rise Asia", startuptalky: "StartupTalky", "entrepreneur-news-network": "Entrepreneur News Network" };
  const k = Object.keys(known).sort((a, b) => b.length - a.length).find((k) => src.includes(k));
  return k ? known[k] : "";
};
const press = uniq(home.find(".bh-featured .bh-press-link").toArray().map((a) => {
  const src = up($(a).find("img").attr("src"));
  return { name: $(a).attr("aria-label") || $(a).find("img").attr("alt") || pressName(src), href: $(a).attr("href"), logo: src };
}), (x) => x.logo);

// ---- sticky call to action
const sticky = { label: txt(home.find(".bh-sticky a")), href: link(home.find(".bh-sticky a").attr("href")) };

// ---- the old page's metadata, for reference (the new page improves on it; see src/pages/index.astro)
const meta = {
  title: $("title").text().trim(),
  description: $('meta[name="description"]').attr("content") || "",
  ogImage: $('meta[property="og:image"]').attr("content") || "",
  modified: $('meta[property="article:modified_time"]').attr("content") || "",
};

const data = { source: "https://betterhood.in/", scrapedAt: new Date().toISOString(), meta, hero: heroData, range, trust, concern, story, usecase, clinic, physios, categories, words, age, press, sticky, fixedLinks };

// intrinsic sizes of every mirrored upload used above, so the page can set width/height (no layout shift)
const dims = {};
const missing = [];
for (const f of new Set(JSON.stringify({ ...data, meta: null }).match(/\/wp-content\/uploads\/[^"?]+/g) || [])) {
  const file = "public" + f;
  if (!fs.existsSync(file)) { missing.push(f); continue; }
  try { const m = await sharp(file).metadata(); dims[f] = [m.width, m.height]; } catch { /* svg without size etc. */ }
}
data.dims = dims;
if (missing.length) console.warn(`not mirrored yet (run npm run mirror:media or download them):\n  ${missing.join("\n  ")}`);
fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(`home.json: ${range.length} range products, ${concern.tabs.length} concerns (${concern.tabs.reduce((n, t) => n + t.products.length, 0)} products), ${usecase.items.length} use cases, ${physios.people.length} physios, ${words.reels.length} reels, ${press.length} press logos; fixed ${fixedLinks.length} dead links`);
