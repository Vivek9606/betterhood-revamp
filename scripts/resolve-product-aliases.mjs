// Articles link to betterhood products by handle, and some links use handles that have since been renamed in
// Shopify (Shopify redirects the old ones). This resolves every betterhood shop handle found in the articles
// that isn't in products.json by following Shopify's redirect, and writes src/data/product-aliases.json:
//   { "aliases": { "<old handle>": "<current handle>" }, "broken": ["<handle that 404s>"] }
// Used by Betty (src/components/Betty.astro) to know which product a link points at.
//
//   node scripts/resolve-product-aliases.mjs
import fs from "node:fs";
import * as cheerio from "cheerio";

const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const products = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
const known = new Set(products.map((p) => p.handle));
// only betterhood's own shop counts; articles also link to other stores' /products/ pages
const SHOP = /^https?:\/\/(shop\.betterhood\.in|betterhood-shop\.myshopify\.com|(www\.)?betterhood\.in)\/(?:collections\/[^/]+\/)?products\/([^/?#&]+)/i;

const unknown = new Map();
for (const p of posts) {
  const $ = cheerio.load(p.html || "");
  $("a[href]").each((_, a) => {
    const m = ($(a).attr("href") || "").match(SHOP);
    if (m && !known.has(m[3])) unknown.set(m[3], (unknown.get(m[3]) || 0) + 1);
  });
}

const aliases = {};
const broken = [];
for (const [handle] of unknown) {
  const res = await fetch(`https://shop.betterhood.in/products/${handle}`, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (betterhood-revamp content sync)" } });
  const now = res.url.match(/\/products\/([^/?#]+)/)?.[1];
  if (res.ok && now && known.has(now)) aliases[handle] = now;
  else broken.push(handle);
}
fs.writeFileSync("src/data/product-aliases.json", JSON.stringify({ aliases, broken }, null, 2) + "\n");
console.log(`aliases: ${Object.keys(aliases).length}, broken: ${broken.length}`, broken);
