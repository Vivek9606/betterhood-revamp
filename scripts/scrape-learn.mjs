// Pulls the copy of the live Learn hub (https://betterhood.in/learn/) into src/data/learn.json, so the new
// /learn/ page renders exactly the same headings, labels, expert card, newsletter text and links.
// The post lists themselves (featured, trending, grid, must knows, expert) come from posts.json using
// the same rules as the live page; this file only holds the page's own copy.
//
//   node scripts/scrape-learn.mjs            fetch the live page (saved to content-src/html/learn.html)
//   node scripts/scrape-learn.mjs --offline  re-parse the saved copy
import fs from "node:fs";
import * as cheerio from "cheerio";
import { headingParts } from "./lib/divi.mjs";

const SRC = "content-src/html/learn.html";
const OUT = "src/data/learn.json";

let html;
if (process.argv.includes("--offline")) {
  html = fs.readFileSync(SRC, "utf8");
} else {
  const res = await fetch("https://betterhood.in/learn/", { headers: { "user-agent": "Mozilla/5.0 (betterhood-revamp content sync)" } });
  if (!res.ok) throw new Error(`betterhood.in/learn/ returned ${res.status}`);
  html = await res.text();
  fs.writeFileSync(SRC, html);
}

const $ = cheerio.load(html);
const txt = (el) => $(el).text().replace(/\s+/g, " ").trim();
const up = (u = "") => u.replace(/^https?:\/\/(www\.)?betterhood\.in(?=\/wp-content\/)/, "");
const rel = (u = "") => u.replace(/^https?:\/\/(www\.)?betterhood\.in(?=\/)/, "");
const S = $(".et_builder_inner_content > .et_pb_section");
const need = (cond, what) => { if (!cond) throw new Error(`Live /learn/ changed: couldn't find ${what}`); };

const parts = (el) => headingParts($, el);

// ---- banner: featured post + sidebar (newsletter, trending)
const banner = S.filter(".banner_section");
need(banner.length, "banner section");
const featured = banner.find(".cus-single-post-grid").first();
const featuredSlug = (featured.find("a[href*='/learn/']").attr("href") || "").split("/learn/")[1]?.replace(/\/$/, "");
need(featuredSlug, "featured post");
const heads = banner.find(".h2_center_heading");
const nlTop = heads.filter((_, h) => /newsletter/i.test(txt(h))).first();
const trendHead = heads.filter((_, h) => /trending/i.test(txt(h))).first();
const nlForm = banner.find(".mc4wp-form").first();

// ---- browse: facets
const browse = S.eq(2);
const facets = browse.find(".wpgb-facet");
const facet = (title) => {
  const f = facets.filter((_, x) => txt($(x).find("h4, legend, .wpgb-facet-title").first()) === title).first();
  need(f.length, `facet "${title}"`);
  return f;
};
const checks = (title) => facet(title).find(".wpgb-checkbox").map((_, c) => ({
  value: $(c).find("input").attr("value"),
  label: txt($(c).find(".wpgb-checkbox-label")),
})).get();
const typeFacet = facet("Learn Page Category Type");
const searchFacet = facets.filter((_, f) => $(f).find("input[type=search]").length).first();

// Facet icons are set in the theme's CSS (background images on each checkbox), not in the HTML.
// Read from the rendered live page; keep in sync if the live icons change.
const ICONS = {
  science: "/wp-content/uploads/2024/10/science.svg",
  protocol: "/wp-content/uploads/2024/11/protocols_icon.svg",
  "back-pain": "/wp-content/uploads/2024/10/back_pain_icon-2.svg",
  "feet-pain": "/wp-content/uploads/2025/06/Feet-Pain.svg",
  "joint-pain": "/wp-content/uploads/2024/10/knee_pain.svg",
  "knee-pain": "/wp-content/uploads/2024/10/knee_pain.svg",
  "neck-pain": "/wp-content/uploads/2024/10/neck_pain_icon.svg",
  "shoulder-pain": "/wp-content/uploads/2024/10/shoulder_pain_icon.svg",
  posture: "/wp-content/uploads/2024/10/posture_icon.svg",
  recovery: "/wp-content/uploads/2024/10/recovery_icon.svg",
};
const withIcons = (list) => list.map((x) => ({ ...x, icon: ICONS[x.value] ?? "" }));

// ---- must knows + expert
const must = S.filter(".absolute_must_know");
const expert = S.filter(".expert_section");
need(must.length && expert.length, "must-knows / expert sections");
const expertText = expert.find(".et_pb_text").not(".h2_center_heading").first();
const expertLines = (expertText.find(".et_pb_text_inner").html() || "").split(/<br\s*\/?>/i).map((l) => cheerio.load(l).text().replace(/\s+/g, " ").trim()).filter(Boolean);

// ---- newsletter band + social links
const band = S.eq(5);
const bandHead = band.find(".h2_center_heading").first();
const socials = band.find("a[href]").map((_, a) => ({ href: $(a).attr("href"), icon: up($(a).find("img").attr("src") || "") })).get()
  .filter((s) => /linkedin|instagram|youtube|facebook/.test(s.href));

const data = {
  source: "https://betterhood.in/learn/",
  scraped: new Date().toISOString().slice(0, 10),
  seo: { title: txt($("title")), description: $("meta[name=description]").attr("content") ?? "" },
  breadcrumb: txt(banner.find(".et_pb_text").first()).split(">").map((s) => s.trim()),
  featured: {
    slug: featuredSlug,
    cta: txt(featured.find("a").filter((_, a) => /read/i.test(txt(a))).first()) || "Read Article",
    byline: (txt(featured).match(/By [^]+$/) || ["By betterhood"])[0].trim(),
  },
  newsletterTop: { heading: parts(nlTop), placeholder: nlForm.find("input[type=email]").attr("placeholder"), submit: nlForm.find("input[type=submit]").attr("value") },
  trending: { heading: parts(trendHead), count: banner.find(".cus-whats-trending article").length },
  browse: {
    filterLabel: "Filter",
    reset: txt(facets.find("button").filter((_, b) => /reset/i.test(txt(b))).first()),
    groups: [
      { key: "w", tax: "by-what-inside", title: "By What's Inside", terms: withIcons(checks("By What's Inside")) },
      { key: "h", tax: "by-health-concern", title: "By Health Concern", terms: withIcons(checks("By Health Concern")) },
      { key: "o", tax: "by-solution", title: "By Solution", terms: withIcons(checks("By Solution")) },
    ],
    types: typeFacet.find("[data-value], li, button").map((_, b) => ({ value: $(b).attr("data-value") ?? $(b).find("input").attr("value") ?? "", label: txt(b) })).get()
      .filter((t, i, a) => t.label && a.findIndex((x) => x.label === t.label) === i),
    searchPlaceholder: searchFacet.find("input[type=search]").attr("placeholder"),
    searchLabel: txt(searchFacet.find("label").first()),
    clear: txt(searchFacet.find("button").first()),
    loadMore: txt(facets.find("button").filter((_, b) => /load more/i.test(txt(b))).first()),
    perPage: browse.find(".wpgb-card").length,
  },
  mustKnows: { heading: parts(must.find(".h2_center_heading").first()), count: 10 },
  expert: {
    heading: parts(expert.find(".h2_center_heading").first()),
    image: up(expert.find(".expert_img img").attr("src")),
    name: expertLines[0],
    roles: expertLines.slice(1),
  },
  newsletter: {
    heading: parts(bandHead),
    text: txt(bandHead.find("p").first()),
    placeholder: band.find("input[type=email]").attr("placeholder"),
    submit: band.find("input[type=submit]").attr("value"),
  },
  socials: socials.filter((s, i, a) => a.findIndex((x) => x.href === s.href) === i).map((s) => ({ ...s, href: rel(s.href) })),
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(`wrote ${OUT}`);
console.log(JSON.stringify(data, null, 2));
