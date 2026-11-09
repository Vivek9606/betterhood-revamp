// Product mentions in articles, for Betty (src/components/Betty.astro).
// A mention is either a link to a betterhood product page, or (when an editor named a product without
// linking it) one of the exact phrases editors have used as link text for that product elsewhere,
// e.g. "Betterhood LS Belt". Built once per build from all posts.
import * as cheerio from "cheerio";
import { posts, products } from "./data";
import ALIASES from "../data/product-aliases.json";

// betterhood's own shop only; articles also link to other stores' /products/ pages
const SHOP = /^https?:\/\/(shop\.betterhood\.in|betterhood-shop\.myshopify\.com|(www\.)?betterhood\.in)\/(?:collections\/[^/]+\/)?products\/([^/?#&]+)/i;
const known = new Map(products.map((p) => [p.handle, p]));
const alias = (ALIASES as { aliases: Record<string, string> }).aliases;

/** The current product a link points at, or undefined (not a betterhood product link / product gone). */
export function productFromHref(href = "") {
  const m = href.match(SHOP);
  if (!m) return undefined;
  const h = alias[m[3]] ?? m[3];
  return known.has(h) ? h : undefined;
}

let phraseIndex: { phrase: string; re: RegExp; handle: string }[] | null = null;
/** Phrases (lower-case) that name a product: link texts that contain "betterhood" and are 2–8 words long. */
export function productPhrases() {
  if (phraseIndex) return phraseIndex;
  const seen = new Map<string, string>();
  for (const p of posts) {
    const $ = cheerio.load(p.html || "", null, false);
    $("a[href]").each((_, a) => {
      const h = productFromHref($(a).attr("href"));
      if (!h) return;
      const t = $(a).text().replace(/\s+/g, " ").replace(/[’']s\b/g, "").trim();
      const words = t.split(" ").length;
      if (/betterhood/i.test(t) && words >= 2 && words <= 8 && !/https?:/.test(t) && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), h);
    });
  }
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // longest first, so "Betterhood Premium 4-Strap Knee Brace" wins over "Betterhood Premium"
  phraseIndex = [...seen].sort((a, b) => b[0].length - a[0].length).map(([phrase, handle]) => ({ phrase, handle, re: new RegExp(`(^|[^\\w])(${esc(phrase)})(?=$|[^\\w])`, "i") }));
  return phraseIndex;
}
