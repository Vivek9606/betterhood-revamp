// The homepage copy in src/data/home.json keeps the old page's emphasis as [[b]]…[[/b]] and [[i]]…[[/i]]
// markers (see scripts/scrape-home.mjs). These helpers turn that into segments, plain text or HTML.
export type Seg = { t: string; b?: true; i?: true };

export function segs(text = ""): Seg[] {
  const out: Seg[] = [];
  for (const p of text.split(/(\[\[[bi]\]\][\s\S]*?\[\[\/[bi]\]\])/g)) {
    if (!p) continue;
    const m = p.match(/^\[\[([bi])\]\]([\s\S]*?)\[\[\/\1\]\]$/);
    out.push(m ? (m[1] === "b" ? { t: m[2], b: true } : { t: m[2], i: true }) : { t: p });
  }
  return out;
}

export const plain = (text = "") => text.replace(/\[\[\/?[bi]\]\]/g, "").replace(/\s+/g, " ").trim();

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML with bold rendered as `bold` (strong by default; headings use em for the brand accent). */
export const richHtml = (text = "", bold: "strong" | "em" = "strong") =>
  segs(text).map((s) => (s.b ? `<${bold}>${esc(s.t)}</${bold}>` : s.i ? `<em>${esc(s.t)}</em>` : esc(s.t))).join("");

/** Splits a rich heading into sentence lines ("Every pain is different." / "So is the solution."). */
export const sentences = (text = "") => text.split(/(?<=[.!?](?:\[\[\/[bi]\]\])?)\s+/).filter(Boolean);
