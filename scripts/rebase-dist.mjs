// Prefixes every root-relative URL in dist/ with BASE_PATH, for hosts that serve the site from a
// sub-path (GitHub Pages project sites: /betterhood-revamp/). Not needed on betterhood.in itself.
//   BASE_PATH=/betterhood-revamp node scripts/rebase-dist.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = (process.env.BASE_PATH || "").replace(/\/+$/, "");
if (!base) {
  console.log("BASE_PATH not set, nothing to rebase");
  process.exit(0);
}

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only paths that actually exist at the top of dist/ are rewritten, so stray "/" strings are left alone.
const roots = fs.readdirSync(dist).map(esc).sort((a, b) => b.length - a.length);
const pathRe = new RegExp(`(["'\`(=,\\s]|url\\()/(?=(?:${roots.join("|")})(?:[/"'\`?#)\\s,]|$))`, "g");
const homeRe = /((?:href|action|content)=["'](?:0;\s*url=)?)\/(?=["'#?])/g;

const exts = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest"]);
let changed = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (exts.has(path.extname(entry.name))) {
      const src = fs.readFileSync(file, "utf8");
      const out = src.replace(pathRe, `$1${base}/`).replace(homeRe, `$1${base}/`);
      if (out !== src) {
        fs.writeFileSync(file, out);
        changed++;
      }
    }
  }
}

walk(dist);
console.log(`rebased ${changed} files under ${base}/`);
