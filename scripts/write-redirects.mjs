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
console.log(`wrote ${Object.keys(redirects).length} redirects`);
