// Normalises everything pulled from the live WordPress + Shopify sites (content-src/) into the
// compact JSON files the Astro site renders from (src/data/). Re-run after any re-sync:
//   npm run sync     (fetch fresh REST data + scrape)   ->   npm run content
import fs from "node:fs";
import * as cheerio from "cheerio";

const SRC = new URL("../content-src/", import.meta.url);
const OUT = new URL("../src/data/", import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, SRC)));
const exists = (p) => fs.existsSync(new URL(p, SRC));
const pagesOf = (prefix) => {
  const all = [];
  for (let i = 1; exists(`api/${prefix}_${i}.json`); i++) all.push(...read(`api/${prefix}_${i}.json`));
  return all;
};
const write = (name, data) => fs.writeFileSync(new URL(name, OUT), JSON.stringify(data));

const decode = (s = "") =>
  cheerio.load(`<p>${s}</p>`)("p").text().replace(/\s+/g, " ").trim();

const SITE = /https?:\/\/(www\.)?betterhood\.in/g;

// Internal links become root-relative so the site works on any domain; uploads keep their
// /wp-content/uploads path (mirrored into public/ by scripts/mirror-media.mjs, or served from MEDIA_ORIGIN).
function relink(html = "") {
  return html.replace(SITE, "");
}

function cleanPostHtml(html, { stripDivi = false } = {}) {
  const $ = cheerio.load(html, null, false);
  $("script, style, noscript, .et_pb_divider_internal").remove();
  $("[style]").each((_, e) => {
    // keep only text-align, nothing else from the old theme
    const st = $(e).attr("style");
    const keep = (st.match(/text-align:\s*(left|center|right)/) || [])[0];
    keep ? $(e).attr("style", keep) : $(e).removeAttr("style");
  });
  $("img").each((_, e) => {
    const $e = $(e);
    const src = $e.attr("data-src") || $e.attr("src");
    if (src) $e.attr("src", src);
    $e.removeAttr("data-src srcset sizes data-srcset decoding class fetchpriority");
    $e.attr("loading", "lazy");
  });
  $("iframe").each((_, e) => {
    const $e = $(e);
    const src = $e.attr("data-src") || $e.attr("src");
    if (src) $e.attr("src", src);
    $e.removeAttr("width height data-src class");
    $e.attr("loading", "lazy");
  });
  $("p").each((_, e) => { if (!$(e).text().trim() && !$(e).find("img,iframe").length) $(e).remove(); });
  if (stripDivi) {
    // unwrap Divi builder wrappers, keep the semantic content inside
    let changed = true;
    while (changed) {
      changed = false;
      $("div, span").each((_, e) => {
        const c = $(e).attr("class") || "";
        if (/et_pb|et-l|et_builder|et_section|clearfix/.test(c) || (!c && e.tagName === "div")) {
          $(e).replaceWith($(e).contents());
          changed = true;
        }
      });
    }
    $("p:empty").remove();
  }
  $("*").each((_, e) => {
    const c = $(e).attr("class");
    if (c) {
      const keep = c.split(/\s+/).filter((x) => /^(wp-block-(table|quote|image|embed|button|buttons|columns|column|separator|pullquote)|has-text-align-\w+|aligncenter|alignleft|alignright)$/.test(x));
      keep.length ? $(e).attr("class", keep.join(" ")) : $(e).removeAttr("class");
    }
    $(e).removeAttr("id data-id data-type");
  });
  return relink($.html()).replace(/\n{3,}/g, "\n\n").trim();
}

const words = (html) => cheerio.load(html).text().split(/\s+/).filter(Boolean).length;

// ---------------- taxonomies ----------------
const taxNames = {
  categories: "category", tags: "tag", "by-what-inside": "by-what-inside", "by-health-concern": "by-health-concern",
  "by-solution": "by-solution", "post-section-tags": "post-section-tags", "podcast-season": "podcast-season",
  physio_location: "physio_location", physio_speciality: "physio_speciality", physio_experience: "physio_experience",
  physio_qualification: "physio_qualification", "physio-state": "physio-state", "physio-city": "physio-city",
};
const taxonomies = {};
const taxById = {};
for (const [file, key] of Object.entries(taxNames)) {
  const terms = pagesOf(`tax_${file}`).map((t) => ({
    id: t.id, slug: t.slug, name: decode(t.name), count: t.count, description: decode(t.description), parent: t.parent || 0,
  }));
  taxonomies[key] = terms;
  taxById[key] = Object.fromEntries(terms.map((t) => [t.id, t]));
}

// ---------------- posts ----------------
const extras = exists("post-extras.json") ? read("post-extras.json") : { videos: {}, authors: {} };
const seo = exists("seo.json") ? read("seo.json") : {};
const slugsOf = (key, ids = []) => ids.map((id) => taxById[key][id]?.slug).filter(Boolean);

const posts = pagesOf("posts")
  .map((p) => {
    const media = p._embedded?.["wp:featuredmedia"]?.[0];
    const html = cleanPostHtml(p.content.rendered, { stripDivi: p.content.rendered.includes("et_pb_") });
    const s = seo[p.slug] || {};
    const excerpt = decode(p.excerpt.rendered).replace(/\s*\[…\]|\s*\[&hellip;\]/, "…");
    return {
      id: p.id,
      slug: p.slug,
      title: decode(p.title.rendered),
      date: p.date,
      modified: p.modified,
      excerpt,
      html,
      videos: extras.videos[p.slug] || [],
      image: media?.source_url
        ? {
            src: relink(media.source_url),
            alt: decode(media.alt_text || "") || decode(p.title.rendered),
            w: media.media_details?.width || 0,
            h: media.media_details?.height || 0,
            thumb: relink(media.media_details?.sizes?.medium_large?.source_url || media.media_details?.sizes?.large?.source_url || media.source_url),
          }
        : null,
      author: extras.authors[p.author] || "betterhood",
      category: slugsOf("category", p.categories),
      concern: slugsOf("by-health-concern", p["by-health-concern"]),
      inside: slugsOf("by-what-inside", p["by-what-inside"]),
      solution: slugsOf("by-solution", p["by-solution"]),
      section: slugsOf("post-section-tags", p["post-section-tags"]),
      season: slugsOf("podcast-season", p["podcast-season"]),
      tags: slugsOf("tag", p.tags),
      minutes: Math.max(1, Math.round(words(html) / 220)),
      seo: { title: s.title || "", description: s.description || excerpt.slice(0, 160) },
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
write("posts.json", posts);
// lightweight index for client-side search/filter on /learn/
write("posts-index.json", posts.map((p) => ({
  s: p.slug, t: p.title, d: p.date.slice(0, 10), e: p.excerpt.slice(0, 140), i: p.image?.thumb || "",
  c: p.category, h: p.concern, w: p.inside, o: p.solution, m: p.minutes, v: p.videos.length > 0,
})));

// ---------------- physios ----------------
const physioRaw = exists("physios.json") ? read("physios.json") : {};
const physios = pagesOf("physio").map((p) => {
  const d = physioRaw[p.slug] || {};
  const practice = Object.fromEntries((d.practice || []).map((x) => [x.label, x.value]));
  const badges = d.badges || [];
  const expBadge = badges.find((b) => /experience/i.test(b));
  const tax = (key, k) => slugsOf(key, p[k]);
  // ~30% of profiles weren't tagged in WordPress; infer city/state from the location they list
  const placeText = [badges.find((b) => b !== expBadge), practice["Practice Location"], decode(p.title.rendered)].join(" ").toLowerCase();
  const guess = (key) => taxonomies[key].find((t) => new RegExp(`\\b${t.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(placeText))?.slug || "";
  const city = tax("physio-city", "physio-city")[0] || guess("physio-city");
  const state = tax("physio-state", "physio-state")[0] || guess("physio-state");
  return {
    slug: p.slug,
    name: d.name || decode(p.title.rendered).split(",")[0],
    title: decode(p.title.rendered),
    degree: d.degree || "",
    image: relink(d.image || ""),
    place: badges.find((b) => b !== expBadge) || "",
    years: expBadge ? parseInt(expBadge) || 0 : 0,
    about: relink(d.about || ""),
    specializations: d.specializations || [],
    modes: d.modes || [],
    education: d.education || [],
    certifications: d.certifications || [],
    experience: d.experience || [],
    location: practice["Practice Location"] || d.address || "",
    fee: practice["Consultation Fee"] || "",
    practice: d.practice || [],
    address: d.address || "",
    awards: d.awards || [],
    city, state,
    area: tax("physio_location", "physio_location"),
    speciality: tax("physio_speciality", "physio_speciality"),
    experienceBand: tax("physio_experience", "physio_experience"),
    qualification: tax("physio_qualification", "physio_qualification"),
    date: p.date,
    seo: { title: d.seoTitle || "", description: d.metaDescription || "" },
  };
});
write("physios.json", physios);
write("physios-index.json", physios.map((p) => ({
  s: p.slug, n: p.name, g: p.degree, i: p.image, p: p.place, y: p.years, c: p.city, st: p.state, a: p.area,
  sp: p.specializations.slice(0, 3), m: p.modes, f: p.fee,
})));
write("taxonomies.json", taxonomies);

// ---------------- products (Shopify) ----------------
if (exists("products.json")) {
  // ratings + bestseller order as shown on the live homepage product rails
  const ratings = {};
  if (exists("html/home-rendered.html")) {
    const $ = cheerio.load(fs.readFileSync(new URL("html/home-rendered.html", SRC), "utf8"));
    $(".bh-cprod-card").each((i, a) => {
      const handle = ($(a).attr("href") || "").split("/products/")[1]?.split(/[?#/]/)[0];
      const m = $(a).find(".bh-cprod-rate").text().match(/([\d.]+)\s*\|\s*(\d+)/);
      if (handle && !ratings[handle]) ratings[handle] = { rating: m ? +m[1] : null, reviews: m ? +m[2] : 0, rank: i };
    });
  }
  const products = read("products.json").products
    .filter((p) => p.handle !== "physio-edge")
    .map((p) => ({
      handle: p.handle,
      title: p.title,
      type: p.product_type,
      price: +p.variants[0].price,
      compare: p.variants[0].compare_at_price ? +p.variants[0].compare_at_price : null,
      image: p.images[0]?.src || "",
      image2: p.images[1]?.src || "",
      tags: p.tags,
      rating: ratings[p.handle]?.rating ?? null,
      reviews: ratings[p.handle]?.reviews ?? 0,
      rank: ratings[p.handle]?.rank ?? 999,
    }))
    .sort((a, b) => a.rank - b.rank);
  write("products.json", products);
}

// ---------------- simple content pages (legal) ----------------
const wpPages = pagesOf("pages");
const legal = {};
for (const slug of ["privacy-policy", "terms-of-services", "shipping-policy", "return-policy", "refund_returns", "equal-employment-opportunity-eeo-policy"]) {
  const p = wpPages.find((x) => x.slug === slug);
  if (!p) continue;
  legal[slug] = { title: decode(p.title.rendered), modified: p.modified, html: cleanPostHtml(p.content.rendered, { stripDivi: true }) };
}
write("legal.json", legal);

console.log(`posts ${posts.length}, physios ${physios.length}, legal ${Object.keys(legal).length}`);
