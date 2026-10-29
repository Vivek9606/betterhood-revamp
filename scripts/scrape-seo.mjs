// Captures the live <title>, meta description and og:image for every blog post (Yoast output isn't in the REST API)
import fs from "node:fs";
const SRC = new URL("../content-src/", import.meta.url);
const OUT = new URL("seo.json", SRC);
let posts = [];
for (let i = 1; fs.existsSync(new URL(`api/posts_${i}.json`, SRC)); i++)
  posts.push(...JSON.parse(fs.readFileSync(new URL(`api/posts_${i}.json`, SRC))));
const seo = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : {};
const dec = (s) => (s || "").replace(/&amp;/g, "&").replace(/&#039;|&#8217;/g, "'").replace(/&quot;/g, '"').replace(/&#8211;/g, "–").replace(/&#8212;/g, "—").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const queue = posts.filter((p) => !seo[p.slug]);
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    try {
      const h = await (await fetch(p.link, { headers: { "user-agent": "Mozilla/5.0 betterhood-revamp" } })).text();
      seo[p.slug] = {
        title: dec((h.match(/<title>([^<]*)<\/title>/) || [])[1]),
        description: dec((h.match(/<meta name="description" content="([^"]*)"/) || [])[1]),
        ogImage: (h.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || "",
      };
    } catch (e) { console.error(p.slug, e.message); }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(OUT, JSON.stringify(seo));
console.log("seo", Object.keys(seo).length);
