import index from "../data/physios-index.json";
import { livePhysios } from "../lib/data";

// Served at /physios-index.json — powers filtering on /physio-directory/. Includes listings made at
// /physio-directory/join/ (same row shape as scripts/build-content.mjs).
const live = livePhysios.map((p) => ({
  s: p.slug, n: p.name, g: p.degree, i: p.image, p: p.place, y: p.years, c: p.city, st: p.state, a: p.area,
  sp: p.specializations.slice(0, 3), m: p.modes, f: p.fee, x: p.verified ? "verified" : "listed",
}));
export const GET = () => new Response(JSON.stringify([...index, ...live]), { headers: { "Content-Type": "application/json" } });
