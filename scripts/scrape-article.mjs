// Pulls the copy around the live article template (everything except the article body, which comes from the
// WordPress REST API) into src/data/article.json, plus each author's archive slug into src/data/authors.json.
//
// Live rules the article page follows (checked against several articles; see REVAMP-GUIDELINES.md):
//   What's Trending   = the 4 newest posts, excluding the one being read
//   Featured Articles = the 3 newest posts that share the article's health concern, excluding itself
//   Featured Products = the same Shopify products, in the same order, on every article
//
//   node scripts/scrape-article.mjs            fetch live pages (saved under content-src/html/articles/)
//   node scripts/scrape-article.mjs --offline  re-parse the saved copies
import fs from "node:fs";
import * as cheerio from "cheerio";
import { headingParts, text, relative, fetchLive } from "./lib/divi.mjs";

const SAMPLE = "sciatica-red-flags";
const DIR = "content-src/html/articles";
const offline = process.argv.includes("--offline");
fs.mkdirSync(DIR, { recursive: true });

async function page(slug) {
  const file = `${DIR}/${slug}.html`;
  if (offline && fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const html = await fetchLive(`https://betterhood.in/learn/${slug}/`);
  fs.writeFileSync(file, html);
  return html;
}

const $ = cheerio.load(await page(SAMPLE));
const S = $(".et_builder_inner_content > .et_pb_section");
const need = (cond, what) => { if (!cond) throw new Error(`Live article template changed: couldn't find ${what}`); };
const section = (re) => S.filter((_, x) => re.test(text($, $(x).find(".et_pb_text").first())));

const banner = S.filter(".banner_section");
need(banner.length, "banner section");
const crumbs = banner.find(".custom-breadcrumb a").map((_, a) => text($, a)).get();
const heads = banner.find(".h2_center_heading");
const nlHead = heads.filter((_, h) => /newsletter/i.test(text($, h))).first();
const trHead = heads.filter((_, h) => /trending/i.test(text($, h))).first();
const form = banner.find(".mc4wp-form").first();
const meta = banner.find(".et_pb_title_meta_container").first();

const fa = section(/Featured\s+Articles/i);
const fp = section(/Featured\s+Products/i);
need(fa.length && fp.length, "Featured Articles / Featured Products");
const fpText = fp.find(".et_pb_text").first();
const offer = fpText.find("p").first();
const items = fp.find(".custom-product-item");
need(items.length, "product slider");

const data = {
  source: `https://betterhood.in/learn/${SAMPLE}/`,
  scraped: new Date().toISOString().slice(0, 10),
  breadcrumb: crumbs,
  meta: { by: (text($, meta).match(/^(\S+)\s/) || [, "by"])[1], separator: "|" },
  newsletter: { heading: headingParts($, nlHead), placeholder: form.find("input[type=email]").attr("placeholder"), submit: form.find("input[type=submit]").attr("value") },
  trending: { heading: headingParts($, trHead), count: banner.find(".cus-whats-trending article").length },
  featuredArticles: { heading: headingParts($, fa.find(".et_pb_text").first()), count: fa.find(".related-blog").length || 3 },
  featuredProducts: {
    heading: headingParts($, fpText),
    // "Flat 10% off sitewide with <strong>betterhood10</strong>"
    offer: offer.contents().map((_, n) => ({ t: $(n).text(), ...(n.type === "tag" && /^(strong|b)$/.test(n.name) && { bold: true }) })).get().filter((p) => p.t),
    cta: text($, items.first().find(".select-option-button")),
    handles: items.map((_, it) => ($(it).find("a").attr("href") || "").split("/products/")[1]?.replace(/[/?#].*$/, "")).get().filter(Boolean),
  },
  socials: [...new Set($("a[href]").map((_, a) => $(a).attr("href")).get().filter((h) => /linkedin\.com\/company|instagram\.com\/betterhood|youtube\.com\/@mybetterhood|facebook\.com\/people/.test(h)))].map(relative),
};
data.featuredProducts.handles = [...new Set(data.featuredProducts.handles)];
fs.writeFileSync("src/data/article.json", JSON.stringify(data, null, 2) + "\n");
console.log("wrote src/data/article.json");

// ---- author archive slugs: read the byline link on one article per author
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const firstByAuthor = {};
posts.forEach((p) => (firstByAuthor[p.author] ??= p.slug));
const authors = {};
for (const [name, slug] of Object.entries(firstByAuthor)) {
  const h = await page(slug);
  const m = h.match(/href="https:\/\/betterhood\.in\/learn\/author\/([^/"]+)\/" title="Posts by ([^"]+)"/);
  need(m, `author link for ${name}`);
  authors[name] = { slug: m[1], name: m[2] };
}
fs.writeFileSync("src/data/authors.json", JSON.stringify(authors, null, 2) + "\n");
console.log("wrote src/data/authors.json", authors);
