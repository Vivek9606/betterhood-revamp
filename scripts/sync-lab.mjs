// Pulls posts published from the Content Lab (SEO dashboard) into src/data/posts-lab.json.
//
// Writers draft and publish blog posts in the SEO dashboard's Content Lab. Publishing asks GitHub to rebuild the site
// (repository_dispatch "lab-published"); this script runs first in every build, and the posts are merged into
// /learn/ by src/lib/data.ts (a Lab post with the same slug as an older post replaces it, which is how refreshes work).
//
// LAB_SUPABASE_URL / LAB_SUPABASE_KEY (the dashboard's Supabase URL and publishable key; the key only reaches the
// published_lab_posts() function) unset -> no Lab posts (local dev). Set but unreachable -> the build fails, so a deploy
// never silently drops published posts. LAB_SYNC_OPTIONAL=1 turns that into a warning.
import fs from "node:fs";

const URL_ = (process.env.LAB_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.LAB_SUPABASE_KEY || "";
const OUT = new URL("../src/data/posts-lab.json", import.meta.url);
const write = (rows) => fs.writeFileSync(OUT, JSON.stringify(rows, null, 1) + "\n");

if (!URL_ || !KEY) {
  if (!fs.existsSync(OUT)) write([]);
  console.log("sync-lab: LAB_SUPABASE_URL / LAB_SUPABASE_KEY not set, skipping (no Content Lab posts in this build)");
  process.exit(0);
}

async function pull() {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${URL_}/rest/v1/rpc/published_lab_posts`, {
        method: "POST",
        headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text().catch(() => "")}`.trim());
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error("unexpected response");
      return rows;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

// The site stores IST wall-clock times without an offset (as WordPress did); keep Lab dates in the same form.
const ist = (iso) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 19) : "");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

function toPost(r) {
  const words = text(r.html || "").split(" ").filter(Boolean).length;
  const excerpt = (r.excerpt || "").trim() || text(r.html || "").slice(0, 300).replace(/\s\S*$/, "…");
  return {
    id: 0,
    slug: r.slug,
    title: r.title,
    date: ist(r.date),
    modified: ist(r.modified || r.date),
    excerpt,
    html: r.html || "",
    videos: [],
    image: r.image_url ? { src: r.image_url, alt: r.image_alt || r.title, w: r.image_w || 1600, h: r.image_h || 900, thumb: r.image_url } : null,
    author: r.author_name || "betterhood",
    category: r.category?.length ? r.category : ["articles"],
    concern: r.concern ?? [],
    inside: r.inside ?? [],
    solution: r.solution ?? [],
    section: r.section ?? [],
    season: [],
    tags: r.tags ?? [],
    minutes: Math.max(1, Math.round(words / 230)),
    seo: { title: r.seo_title || r.title, description: r.meta_description || excerpt },
    lab: {
      noindex: Boolean(r.noindex),
      canonical: r.canonical_url || null,
      betty: r.betty_enabled !== false,
      products: r.products ?? [],
      focusKeyword: r.focus_keyword || null,
    },
  };
}

try {
  const rows = await pull();
  const ok = rows.filter((r) => typeof r?.slug === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug) && r.title && r.html).map(toPost);
  write(ok);
  console.log(`sync-lab: ${ok.length} published Content Lab post(s)`);
} catch (e) {
  const msg = `sync-lab: could not read published posts from ${URL_} (${e.message})`;
  if (process.env.LAB_SYNC_OPTIONAL === "1") {
    if (!fs.existsSync(OUT)) write([]);
    console.warn(`${msg}; building with the posts already on disk`);
  } else {
    console.error(`${msg}. Failing the build so the live site keeps its posts.`);
    process.exit(1);
  }
}
