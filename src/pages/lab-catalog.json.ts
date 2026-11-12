// Served at /lab-catalog.json — what the SEO dashboard's Content Lab offers writers: the post categories, products
// (for links and Betty), authors and every page worth linking to. Built from the same data as the site, so the Lab
// never offers a category, product or page the website doesn't have.
import AUTHORS from "../data/authors.json";
import BETTY from "../data/betty.json";
import { posts, products, taxonomies, isVideo } from "../lib/data";

const terms = (tax: string) =>
  (taxonomies[tax] ?? []).map((t) => ({ slug: t.slug, name: t.name, count: t.count })).sort((a, b) => b.count - a.count);

const AREAS: Record<string, string[]> = { back: ["back-pain"], neck: ["neck-pain"], shoulder: ["shoulder-pain"], knee: ["knee-pain"] };
const concernOf = (s: string) => Object.entries(AREAS).find(([k]) => s.includes(k))?.[1] ?? [];

const pages = [
  { url: "/quiz-landing-page/", title: "Free pain assessments (all areas)", kind: "assessment" },
  { url: "/assessment-lower-back-pain/", title: "Lower back pain assessment", kind: "assessment" },
  { url: "/assessment-back-health/", title: "Back health assessment", kind: "assessment" },
  { url: "/assessment-neck-pain-level-1/", title: "Neck pain assessment", kind: "assessment" },
  { url: "/assessment-neck-health-level-2/", title: "Neck health assessment", kind: "assessment" },
  { url: "/assessment-shoulder-pain-level-1/", title: "Shoulder pain assessment", kind: "assessment" },
  { url: "/assessment-shoulder-health-level-2/", title: "Shoulder health assessment", kind: "assessment" },
  { url: "/assessment-knee-pain-level-1/", title: "Knee pain assessment", kind: "assessment" },
  { url: "/assessment-knee-health-level-2/", title: "Knee health assessment", kind: "assessment" },
  { url: "/assessment-longevity-goals/", title: "Longevity goals assessment", kind: "assessment" },
  { url: "/back-health-protocols/", title: "Back health protocols (exercise routines)", kind: "protocol" },
  { url: "/neck-protocols/", title: "Neck protocols (exercise routines)", kind: "protocol" },
  { url: "/shoulder-protocols/", title: "Shoulder protocols (exercise routines)", kind: "protocol" },
  { url: "/knee-protocols/", title: "Knee protocols (exercise routines)", kind: "protocol" },
  { url: "/physio-directory/", title: "Find a physiotherapist near you", kind: "page" },
  { url: "/longevity-toolkit/", title: "Longevity toolkit", kind: "page" },
  { url: "/corporate-wellness/", title: "Corporate wellness programme", kind: "page" },
].map((p) => ({ ...p, concern: concernOf(p.url) }));

const catalog = {
  generated: new Date().toISOString(),
  taxonomies: {
    category: terms("category"),
    concern: terms("by-health-concern"),
    inside: terms("by-what-inside"),
    solution: terms("by-solution"),
    section: terms("post-section-tags"),
    tags: terms("tag").filter((t) => t.count > 0),
  },
  authors: Object.keys(AUTHORS),
  products: products.map((p) => ({ handle: p.handle, title: p.title, type: p.type, price: p.price, compare: p.compare, image: p.image, tags: p.tags })),
  pages: [
    ...posts
      .filter((p) => !isVideo(p) && !p.lab?.noindex)
      .map((p) => ({ url: `/learn/${p.slug}/`, title: p.title, kind: "post", concern: p.concern, date: p.date.slice(0, 10) })),
    ...pages,
  ],
  betty: { enabled: BETTY.enabled, maxSurprisesPerArticle: BETTY.maxSurprisesPerArticle },
};

export const GET = () =>
  new Response(JSON.stringify(catalog), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
