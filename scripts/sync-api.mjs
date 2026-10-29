// Re-downloads posts, pages, physios and taxonomies from the live WordPress REST API, the product
// catalogue from Shopify, and the rendered HTML of pages whose copy/quiz logic is parsed from markup.
//   npm run sync   (this + the scrapers + npm run content)
import fs from "node:fs";

const SRC = new URL("../content-src/", import.meta.url);
const API = "https://betterhood.in/wp-json/wp/v2";
const UA = { headers: { "user-agent": "Mozilla/5.0 betterhood-revamp" } };
fs.mkdirSync(new URL("api/", SRC), { recursive: true });
fs.mkdirSync(new URL("html/", SRC), { recursive: true });

async function paged(endpoint, prefix, query = "") {
  for (const f of fs.readdirSync(new URL("api/", SRC))) if (f.startsWith(prefix + "_")) fs.rmSync(new URL(`api/${f}`, SRC));
  for (let page = 1; ; page++) {
    const r = await fetch(`${API}/${endpoint}?per_page=100&page=${page}${query}`, UA);
    if (!r.ok) break;
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) break;
    fs.writeFileSync(new URL(`api/${prefix}_${page}.json`, SRC), JSON.stringify(data));
    const total = +r.headers.get("x-wp-totalpages");
    console.log(`${prefix} page ${page}/${total}`);
    if (page >= total) break;
  }
}

await paged("posts", "posts", "&_embed=wp:featuredmedia,author");
await paged("pages", "pages");
await paged("physio", "physio");
for (const t of ["categories", "tags", "by-what-inside", "by-health-concern", "by-solution", "post-section-tags", "podcast-season", "physio_location", "physio_speciality", "physio_experience", "physio_qualification", "physio-state", "physio-city"]) {
  await paged(t, `tax_${t}`);
}

const products = await (await fetch("https://shop.betterhood.in/products.json?limit=250", UA)).json();
fs.writeFileSync(new URL("products.json", SRC), JSON.stringify(products));

const pages = [];
for (let i = 1; fs.existsSync(new URL(`api/pages_${i}.json`, SRC)); i++) pages.push(...JSON.parse(fs.readFileSync(new URL(`api/pages_${i}.json`, SRC))));
for (const p of pages) {
  const h = await (await fetch(p.link, UA)).text();
  fs.writeFileSync(new URL(`html/${p.slug}.html`, SRC), h);
}
fs.copyFileSync(new URL("html/bh-homepage.html", SRC), new URL("html/home-rendered.html", SRC));
console.log(`synced ${pages.length} rendered pages`);
