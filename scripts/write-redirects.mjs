// Emits real 301s for hosts that support a _redirects file (Netlify, Cloudflare Pages) and a
// vercel.json fragment. Astro already writes meta-refresh pages for every redirect as a fallback.
import fs from "node:fs";
import { redirects } from "../astro.config.mjs";

const dist = new URL("../dist/", import.meta.url);
const lines = Object.entries(redirects).flatMap(([from, to]) => [`${from}  ${to}  301`, `${from}/  ${to}  301`]);
fs.writeFileSync(new URL("_redirects", dist), lines.join("\n") + "\n");
fs.writeFileSync(
  new URL("vercel-redirects.json", dist),
  JSON.stringify({ redirects: Object.entries(redirects).map(([source, destination]) => ({ source: `${source}/?`, destination, permanent: true })) }, null, 2),
);
// Astro's meta-refresh fallback pages (used where _redirects isn't supported, e.g. GitHub Pages) point their
// canonical at the full destination. Drop the query string so search engines consolidate on the clean page
// (old area URLs land on /learn/physio-city/{city}/?area=…, whose canonical is the plain city page).
for (const [from, to] of Object.entries(redirects)) {
  if (!to.includes("?")) continue;
  const file = new URL("." + from + "/index.html", dist);
  if (!fs.existsSync(file)) continue;
  const clean = new URL(to.split("?")[0], "https://betterhood.in").href;
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${clean}">`));
}
console.log(`wrote ${Object.keys(redirects).length} redirects`);
