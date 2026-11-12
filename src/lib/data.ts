import postsJson from "../data/posts.json";
import physiosJson from "../data/physios.json";
import taxJson from "../data/taxonomies.json";
import productsJson from "../data/products.json";

/** Extra settings a post published from the Content Lab (SEO dashboard) carries. */
export type LabMeta = { noindex: boolean; canonical: string | null; betty: boolean; products: string[]; focusKeyword: string | null };
export type Post = (typeof postsJson)[number] & { lab?: LabMeta };
/** A directory profile. Most were carried over from WordPress; `source: "app"` ones were listed by the physio
 *  at /physio-directory/join/ (website or Betterhood app) and come from the API at build time. */
export type Physio = (typeof physiosJson)[number] & { source?: "app"; verified?: boolean; bookingUrl?: string };
export type Term = { id: number; slug: string; name: string; count: number; description: string; parent: number };
export type Product = (typeof productsJson)[number];

// Posts published from the Content Lab (scripts/sync-lab.mjs). Optional so `astro dev` works without it. A Lab post
// with the same slug as a carried-over post replaces it (that's how a refresh goes live); newest first, as before.
const labFile = import.meta.glob("../data/posts-lab.json", { eager: true, import: "default" }) as Record<string, Post[]>;
export const labPosts: Post[] = Object.values(labFile)[0] ?? [];
const labSlugs = new Set(labPosts.map((p) => p.slug));
export const posts = [...labPosts, ...(postsJson as Post[]).filter((p) => !labSlugs.has(p.slug))]
  .sort((a, b) => b.date.localeCompare(a.date));
// Listings made through the Betterhood API (scripts/sync-directory.mjs). Optional so `astro dev` works without it.
const liveFile = import.meta.glob("../data/physios-live.json", { eager: true, import: "default" }) as Record<string, Physio[]>;
const carried = new Set(physiosJson.map((p) => p.slug));
const specialityByName = new Map((taxJson as Record<string, Term[]>).physio_speciality.map((t) => [t.name.toLowerCase(), t.slug]));
export const livePhysios: Physio[] = (Object.values(liveFile)[0] ?? [])
  .filter((p) => !carried.has(p.slug))
  .map((p) => ({ ...p, speciality: p.specializations.map((s) => specialityByName.get(s.toLowerCase())).filter(Boolean) as string[] }));
export const physios = [...(physiosJson as Physio[]), ...livePhysios];
export const products = productsJson as Product[];
export const taxonomies = taxJson as Record<string, Term[]>;

// Post taxonomies -> the Post field that holds their slugs
export const postTax = {
  category: "category",
  "by-health-concern": "concern",
  "by-what-inside": "inside",
  "by-solution": "solution",
  "post-section-tags": "section",
  "podcast-season": "season",
  tag: "tags",
} as const;

// Physio taxonomies -> Physio field
export const physioTax = {
  "physio-city": "city",
  "physio-state": "state",
  physio_location: "area",
  physio_speciality: "speciality",
  physio_experience: "experienceBand",
  physio_qualification: "qualification",
} as const;

export const taxLabels: Record<string, { label: string; plural: string }> = {
  category: { label: "Category", plural: "Categories" },
  tag: { label: "Tag", plural: "Tags" },
  "by-health-concern": { label: "Health concern", plural: "By health concern" },
  "by-what-inside": { label: "What's inside", plural: "By what's inside" },
  "by-solution": { label: "Solution", plural: "By solution" },
  "post-section-tags": { label: "Series", plural: "Series" },
  "podcast-season": { label: "Podcast season", plural: "Podcast seasons" },
  "physio-city": { label: "City", plural: "Cities" },
  "physio-state": { label: "State", plural: "States" },
  physio_location: { label: "Area", plural: "Areas" },
  physio_speciality: { label: "Speciality", plural: "Specialities" },
  physio_experience: { label: "Experience", plural: "Experience" },
  physio_qualification: { label: "Qualification", plural: "Qualifications" },
};

const termIndex: Record<string, Record<string, Term>> = Object.fromEntries(
  Object.entries(taxonomies).map(([k, terms]) => [k, Object.fromEntries(terms.map((t) => [t.slug, t]))]),
);
export const term = (tax: string, slug: string) => termIndex[tax]?.[slug];
export const termName = (tax: string, slug: string) => term(tax, slug)?.name ?? slug.replace(/-/g, " ");

export const postsIn = (tax: keyof typeof postTax, slug: string) =>
  posts.filter((p) => (p[postTax[tax]] as string[]).includes(slug));
export const physiosIn = (tax: keyof typeof physioTax, slug: string) =>
  physios.filter((p) => {
    const v = p[physioTax[tax]];
    return Array.isArray(v) ? v.includes(slug) : v === slug;
  });

export const formatDate = (iso: string, style: "long" | "short" = "long") =>
  new Date(iso).toLocaleDateString("en-IN", style === "long" ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });

export function relatedPosts(p: Post, n = 3) {
  const score = (q: Post) =>
    q.concern.filter((x) => p.concern.includes(x)).length * 3 +
    q.solution.filter((x) => p.solution.includes(x)).length * 2 +
    q.inside.filter((x) => p.inside.includes(x)).length +
    q.section.filter((x) => p.section.includes(x)).length * 2;
  return posts
    .filter((q) => q.slug !== p.slug)
    .map((q) => [score(q), q] as const)
    .sort((a, b) => b[0] - a[0] || b[1].date.localeCompare(a[1].date))
    .slice(0, n)
    .map(([, q]) => q);
}

export const isVideo = (p: Post) => p.category.includes("videos") || (p.videos.length > 0 && p.html.length < 400);

export const productsByHandle = (handles: string[]) =>
  handles.map((h) => products.find((p) => p.handle === h)).filter(Boolean) as Product[];

// Pick-and-mix for an area's "care essentials" rails, based on product titles/types
export function productsFor(area: "back" | "neck" | "shoulder" | "knee" | "all", n = 8) {
  const kw: Record<string, RegExp> = {
    back: /lumbar|back|coccyx|seat|chair|car/i,
    neck: /neck|cervical|pillow|roll-on|headrest/i,
    shoulder: /roll-on|spray|patch|lotion|elbow|wrist|pillow/i,
    knee: /knee|ankle|insole|heel|lotion|spray/i,
    all: /./,
  };
  const hit = products.filter((p) => kw[area].test(p.title));
  return [...hit, ...products.filter((p) => !hit.includes(p))].slice(0, n);
}
