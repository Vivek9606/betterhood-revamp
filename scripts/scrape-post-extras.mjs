// Collects data the REST API doesn't expose: YouTube embeds for video-only posts and author display names
import fs from "node:fs";
const SRC = new URL("../content-src/", import.meta.url);
let posts = [];
for (let i = 1; fs.existsSync(new URL(`api/posts_${i}.json`, SRC)); i++)
  posts.push(...JSON.parse(fs.readFileSync(new URL(`api/posts_${i}.json`, SRC))));

const out = { videos: {}, authors: {} };
const get = (u) => fetch(u, { headers: { "user-agent": "Mozilla/5.0 betterhood-revamp" } }).then((r) => r.text());
const ytOf = (h) => {
  const main = h.split("Featured Articles")[0];
  return [...new Set([...main.matchAll(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/g)].map((m) => m[1]))];
};

const targets = posts.filter((p) => p.categories.includes(41) || p.content.rendered.trim().length < 50);
const byAuthor = {};
posts.forEach((p) => (byAuthor[p.author] ??= p));
const queue = [...new Set([...targets, ...Object.values(byAuthor)])];
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    const h = await get(p.link);
    const yt = ytOf(h);
    if (yt.length) out.videos[p.slug] = yt;
    const a = h.match(/class="author vcard"[^>]*>\s*<a[^>]*>([^<]+)</) || h.match(/by\s*<span[^>]*>\s*<a[^>]*>([^<]+)</);
    if (a && !out.authors[p.author]) out.authors[p.author] = a[1].trim();
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(new URL("post-extras.json", SRC), JSON.stringify(out, null, 1));
console.log(Object.keys(out.videos).length, out.authors);
