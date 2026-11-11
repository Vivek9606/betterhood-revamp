// Pulls physio directory listings from the Betterhood API into src/data/physios-live.json.
//
// Physios list themselves at /physio-directory/join/ (on the website or inside the Betterhood app). The API
// stores the listing and asks GitHub to rebuild the site; this script runs first in every build, and the
// listings are merged into the directory, city pages and /physio/{slug}/ (see src/lib/data.ts).
//
// PUBLIC_API_URL unset → no listings (local dev). Set but unreachable → the build fails, so a deploy never
// silently drops live profiles (the previous deploy stays up). DIRECTORY_SYNC_OPTIONAL=1 turns that into a warning.
import fs from "node:fs";

const API = (process.env.PUBLIC_API_URL || "").replace(/\/$/, "");
const OUT = new URL("../src/data/physios-live.json", import.meta.url);
const write = (rows) => fs.writeFileSync(OUT, JSON.stringify(rows, null, 1) + "\n");

if (!API) {
  if (!fs.existsSync(OUT)) write([]);
  console.log("sync-directory: PUBLIC_API_URL not set, skipping (no app listings in this build)");
  process.exit(0);
}

async function pull() {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${API}/public/directory`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { physios } = await res.json();
      if (!Array.isArray(physios)) throw new Error("unexpected response");
      return physios;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

try {
  const rows = await pull();
  const ok = rows.filter((p) => typeof p?.slug === "string" && /^[a-z0-9-]+$/.test(p.slug) && p.name);
  write(ok);
  console.log(`sync-directory: ${ok.length} listing(s) from ${API}`);
} catch (e) {
  const msg = `sync-directory: could not reach ${API}/public/directory (${e.message})`;
  if (process.env.DIRECTORY_SYNC_OPTIONAL === "1") {
    if (!fs.existsSync(OUT)) write([]);
    console.warn(`${msg}; building with the listings already on disk`);
  } else {
    console.error(`${msg}. Failing the build so the live site keeps its listings.`);
    process.exit(1);
  }
}
