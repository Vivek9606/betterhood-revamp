import index from "../data/posts-index.json";
import { labPosts, isVideo } from "../lib/data";

// Served at /posts-index.json — powers search & filters on /learn/ without a backend.
// Content Lab posts (newest first) replace any carried-over entry with the same slug.
const lab = labPosts.map((p) => ({
  s: p.slug, t: p.title, d: p.date.slice(0, 10), e: p.excerpt.slice(0, 140), i: p.image?.thumb || p.image?.src || "",
  c: p.category, h: p.concern, w: p.inside, o: p.solution, m: p.minutes, v: isVideo(p),
}));
const slugs = new Set(lab.map((r) => r.s));
const rows = [...lab, ...index.filter((r) => !slugs.has(r.s))].sort((a, b) => b.d.localeCompare(a.d));
export const GET = () => new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });
