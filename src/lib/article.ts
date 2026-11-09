// Build-time processing of an article body (WordPress HTML). The text is never changed: this only adds
// structure for design (ids, wrappers, classes) and reads facts out of it for structured data.
//   - h2/h3 get ids (deep links + table of contents)
//   - tables get a horizontal-scroll wrapper
//   - the FAQ block and the References block are wrapped so they can be styled; questions get a class
//   - FAQ question/answer pairs and reference links are returned for JSON-LD (FAQPage, citation)
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { mediaHtml } from "./site";

export type Toc = { id: string; text: string };
export type Faq = { q: string; a: string };
export type Citation = { name: string; url?: string };

const FAQ_RE = /^(faqs?\b|frequently asked questions|frequently asked question)/i;
const REF_RE = /^(references|sources|citations|bibliography)\s*:?$/i;
const isHeading = (el: Element) => /^h[1-6]$/.test(el.tagName);
const level = (el: Element) => +el.tagName[1];
const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export type MentionOptions = {
  /** the current product handle a link points at, if it's a betterhood product link */
  fromHref: (href: string) => string | undefined;
  /** product-naming phrases, longest first */
  phrases: { re: RegExp; handle: string }[];
  /** at most this many products per article */
  max: number;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function processArticle(raw: string, opts: { mentions?: MentionOptions } = {}) {
  const $ = cheerio.load(raw || "", null, false);
  const words = clean($.root().text()).split(" ").filter(Boolean).length;

  // ---- one <h1> per page: the template's title. A heading the editor set as h1 inside the body becomes h2
  $("h1").each((_, el) => { (el as Element).tagName = "h2"; });

  // ---- ids + toc
  const used = new Set<string>();
  const toc: Toc[] = [];
  $("h2, h3").each((_, el) => {
    const t = clean($(el).text());
    if (!t) { $(el).remove(); return; }
    let id = slugify(t) || "section";
    while (used.has(id)) id += "-x";
    used.add(id);
    $(el).attr("id", id);
    if (el.tagName === "h2") toc.push({ id, text: t });
  });

  // ---- tables scroll sideways on small screens
  $("table").each((_, t) => { if (!$(t).parent().hasClass("table-scroll")) $(t).wrap('<div class="table-scroll"></div>'); });

  // ---- a top-level block (direct child of the body, or the heading's own block) and everything after it
  //      until the next heading of the same or a higher level
  const regionAfter = (head: Element) => {
    const out: AnyNode[] = [];
    let n = head.nextSibling;
    while (n) {
      if (n.type === "tag") {
        const el = n as Element;
        if (isHeading(el) && level(el) <= level(head) && !clean($(el).text()).endsWith("?")) break;
        if (isHeading(el) && REF_RE.test(clean($(el).text()))) break;
      }
      out.push(n);
      n = n.nextSibling;
    }
    return out;
  };

  // ---- FAQ
  const faq: Faq[] = [];
  const faqHead = $("h2, h3, h4").filter((_, el) => FAQ_RE.test(clean($(el).text()))).first();
  if (faqHead.length && faqHead.parent().length === 0) {
    const nodes = regionAfter(faqHead[0] as Element);
    // flatten into an ordered list of units: questions (headings / bold leads ending in "?") and answer text
    const units: { kind: "q" | "a"; text: string; el?: Element }[] = [];
    const walk = (node: AnyNode) => {
      if (node.type === "text") { const t = clean((node as any).data); if (t) units.push({ kind: "a", text: t }); return; }
      if (node.type !== "tag") return;
      const el = node as Element;
      const t = clean($(el).text());
      if (!t) return;
      if ((isHeading(el) || /^(strong|b)$/.test(el.tagName)) && /\?\s*$/.test(t)) { units.push({ kind: "q", text: t, el }); return; }
      if (/^(p|li)$/.test(el.tagName)) {
        const first = el.children.find((c) => c.type !== "text" || clean((c as any).data));
        const lead = first && first.type === "tag" && /^(strong|b)$/.test((first as Element).tagName) ? clean($(first).text()) : "";
        if (lead && /\?\s*$/.test(lead)) {
          units.push({ kind: "q", text: lead, el: first as Element });
          const rest = clean(t.slice(t.indexOf(lead) + lead.length));
          if (rest) units.push({ kind: "a", text: rest });
          return;
        }
        units.push({ kind: "a", text: t });
        return;
      }
      el.children.forEach(walk);
    };
    nodes.forEach(walk);
    let cur: Faq | null = null;
    for (const u of units) {
      if (u.kind === "q") { if (cur && cur.a) faq.push(cur); cur = { q: u.text.replace(/^(q\s*\d*[:.)]|\d+[.)])\s*/i, ""), a: "" }; $(u.el!).addClass("a-q"); }
      else if (cur) cur.a = clean(`${cur.a} ${u.text}`);
    }
    if (cur && cur.a) faq.push(cur);
    if (faq.length >= 2) {
      faqHead.addClass("a-faq-h");
      $(nodes).wrapAll('<div class="a-faq"></div>');
    } else faq.length = 0;
  }

  // ---- references
  const citations: Citation[] = [];
  const refHead = $("h2, h3, h4, p").filter((_, el) => REF_RE.test(clean($(el).text()))).last();
  if (refHead.length && refHead.parent().length === 0) {
    // a references list never has sub-headings: the block ends at the next heading of any level
    const nodes: AnyNode[] = [];
    for (let n = refHead[0].nextSibling; n && !(n.type === "tag" && isHeading(n as Element)); n = n.nextSibling) nodes.push(n);
    $(nodes).find("li").add($(nodes).filter("p")).each((_, li) => {
      const name = clean($(li).text());
      if (!name || name.length < 12) return;
      const href = $(li).find("a[href^='http']").first().attr("href") || name.match(/https?:\/\/\S+/)?.[0]?.replace(/[.,)]+$/, "");
      citations.push({ name: name.slice(0, 300), ...(href && { url: href }) });
    });
    refHead.addClass("a-refs-h");
    $(nodes).wrapAll('<div class="a-refs"></div>');
  }

  // ---- product mentions (for Betty): the block that first mentions each product gets data-betty="<handle>",
  //      the mention itself data-betty-mention. An unlinked product name is wrapped in a <span>; text unchanged.
  const mentions: string[] = [];
  if (opts.mentions) {
    const { fromHref, phrases, max } = opts.mentions;
    const BLOCK = "p, li, h2, h3, h4, h5, td, figcaption, blockquote";
    $(BLOCK).each((_, b) => {
      if (mentions.length >= max) return false;
      const block = $(b);
      if (block.find(BLOCK).length || block.closest(".a-refs").length || block.attr("data-betty")) return;
      // 1) a link to a product
      let handle: string | undefined;
      block.find("a[href]").each((_, a) => {
        const h = fromHref($(a).attr("href") || "");
        if (h && !mentions.includes(h)) { handle = h; $(a).attr("data-betty-mention", h); return false; }
      });
      // 2) a product named without a link
      if (!handle) {
        const walk = (node: AnyNode): boolean => {
          if (node.type === "text") {
            const data = (node as any).data as string;
            for (const p of phrases) {
              if (mentions.includes(p.handle)) continue;
              const m = p.re.exec(data);
              if (!m) continue;
              const at = m.index + m[1].length;
              $(node).replaceWith(`${esc(data.slice(0, at))}<span class="b-mention" data-betty-mention="${p.handle}">${esc(m[2])}</span>${esc(data.slice(at + m[2].length))}`);
              handle = p.handle;
              return true;
            }
            return false;
          }
          if (node.type !== "tag" || (node as Element).tagName === "a") return false;
          return [...(node as Element).children].some(walk);
        };
        walk(b);
      }
      if (handle) { mentions.push(handle); block.attr("data-betty", handle); }
    });
  }

  // external links open in a new tab, like the old theme did; nothing else about links changes
  $("a[href^='http']").each((_, a) => {
    const href = $(a).attr("href")!;
    if (!/^https?:\/\/(www\.)?betterhood\.in(\/|$)/.test(href) && !$(a).attr("target")) $(a).attr({ target: "_blank", rel: "noopener" });
  });

  return { html: mediaHtml($.html()), toc, faq, citations, words, mentions };
}
