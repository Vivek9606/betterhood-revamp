import { mediaHtml } from "./site";

const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Adds ids to h2/h3 for deep links, wraps tables for horizontal scroll and returns a table of contents. */
export function prepareArticle(html: string) {
  const toc: { id: string; text: string; level: number }[] = [];
  const used = new Set<string>();
  let out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_, lvl, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;/g, "'").replace(/&#8211;/g, "–").trim();
    if (!text) return "";
    let id = slugify(text) || "section";
    while (used.has(id)) id += "-x";
    used.add(id);
    toc.push({ id, text, level: +lvl });
    return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
  });
  out = out.replace(/<table/g, '<div class="table-scroll"><table').replace(/<\/table>/g, "</table></div>");
  // the old theme wrapped tables in figure.wp-block-table; avoid a double scroll container
  out = out.replace(/<figure class="wp-block-table">\s*<div class="table-scroll">/g, '<figure class="wp-block-table"><div>');
  return { html: mediaHtml(out), toc: toc.filter((t) => t.level === 2) };
}
