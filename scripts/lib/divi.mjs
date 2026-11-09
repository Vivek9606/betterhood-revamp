// Helpers for reading copy out of the live site's Divi markup.

/** Live headings mix weights ("Subscribe" bold, " to Newsletter" extra-light, a superscript TM). Returns them as
 *  segments [{ t, light?, sup? }] so the redesign can reproduce the emphasis without retyping copy. */
export function headingParts($, el) {
  const h = $(el).is("h1,h2,h3,h4") ? $(el) : $(el).find("h1,h2,h3,h4").first();
  const out = [];
  h.contents().each((_, n) => {
    const t = $(n).text().replace(/\s+/g, " ");
    if (!t.trim()) { if (out.length && t) out[out.length - 1].t += " "; return; }
    const light = n.type === "tag" && /font-weight:\s*100/.test($(n).attr("style") || "");
    const sup = n.type === "tag" && n.name === "sup";
    const last = out[out.length - 1];
    if (last && !!last.light === light && !last.sup && !sup) last.t += t;
    else out.push({ t, ...(light && { light: true }), ...(sup && { sup: true }) });
  });
  out.forEach((p, i) => { p.t = p.t.replace(/\s+/g, " "); if (i === 0) p.t = p.t.trimStart(); if (i === out.length - 1) p.t = p.t.trimEnd(); });
  return out.filter((p) => p.t);
}

export const text = ($, el) => $(el).text().replace(/\s+/g, " ").trim();
export const uploads = (u = "") => u.replace(/^https?:\/\/(www\.)?betterhood\.in(?=\/wp-content\/)/, "");
export const relative = (u = "") => u.replace(/^https?:\/\/(www\.)?betterhood\.in(?=\/)/, "");
export const fetchLive = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (betterhood-revamp content sync)" } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
};
