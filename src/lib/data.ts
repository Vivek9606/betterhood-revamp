import postsJson from "../data/posts.json";
import physiosJson from "../data/physios.json";
import taxJson from "../data/taxonomies.json";
import productsJson from "../data/products.json";

export type Post = (typeof postsJson)[number];
export type Physio = (typeof physiosJson)[number];
export type Term = { id: number; slug: string; name: string; count: number; description: string; parent: number };
export type Product = (typeof productsJson)[number];

export const posts = postsJson as Post[];
export const physios = physiosJson as Physio[];
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
