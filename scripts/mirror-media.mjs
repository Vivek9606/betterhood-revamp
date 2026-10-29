// Downloads every /wp-content/uploads/... file the new site references into public/wp-content/uploads/,
// keeping the exact same paths (so image URLs and Google Image results don't change).
// Run before switching betterhood.in away from WordPress, then build with PUBLIC_MEDIA_ORIGIN="".
//   npm run mirror:media
import fs from "node:fs";
import path from "node:path";

const root = new URL("../", import.meta.url);
const publicDir = new URL("public/", root);
const ORIGIN = "https://betterhood.in";

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(json|astro|ts|mjs|css)$/.test(e.name)) yield p;
  }
}

const found = new Set();
const re = /\/wp-content\/uploads\/[^"'\s)<>\\?#]+\.(?:webp|png|jpe?g|gif|svg|pdf|mp4)/gi;
for (const file of walk(new URL("src/", root).pathname.replace(/^\/([A-Z]:)/, "$1"))) {
  for (const m of fs.readFileSync(file, "utf8").matchAll(re)) found.add(decodeURIComponent(m[0]));
}
// paths assembled in templates (e.g. up("2-1.webp")) only show up in the built HTML, so scan dist/ too
const dist = new URL("dist/", root).pathname.replace(/^\/([A-Z]:)/, "$1");
function* html(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "wp-content") yield* html(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}
if (fs.existsSync(dist)) {
  for (const file of html(dist)) {
    for (const m of fs.readFileSync(file, "utf8").matchAll(/(?:src|href|srcset|url\()=?"?(\/wp-content\/uploads\/[^"'\s)?#]+)/g)) found.add(decodeURIComponent(m[1]));
  }
}

const todo = [...found].filter((p) => !fs.existsSync(new URL("." + p, publicDir)));
console.log(`${found.size} media files referenced, ${todo.length} to download`);
let done = 0, failed = 0;
async function worker() {
  while (todo.length) {
    const p = todo.shift();
    try {
      const r = await fetch(ORIGIN + encodeURI(p), { headers: { "user-agent": "betterhood-media-mirror" } });
      if (!r.ok) throw new Error(r.status);
      const out = new URL("." + p, publicDir);
      fs.mkdirSync(new URL("./", out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      failed++;
      console.warn("failed", p, e.message);
    }
    if (++done % 200 === 0) console.log(done);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`done: ${done - failed} downloaded, ${failed} failed`);
