// Converts the live site's Gravity Forms assessments into JSON the new quiz engine can run:
// fields (with page/step), choices, calculation formulas and conditional-logic rules.
import fs from "node:fs";
import * as cheerio from "cheerio";

const SRC = new URL("../content-src/", import.meta.url);
const OUT = new URL("../src/data/forms/", import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

const slugs = [
  "assessment-knee-pain-level-1", "assessment-neck-pain-level-1", "assessment-shoulder-pain-level-1",
  "assessment-lower-back-pain", "assessment-knee-health-level-2", "assessment-neck-health-level-2",
  "assessment-shoulder-health-level-2", "assessment-back-health", "assessment-longevity-goals",
];
const stripStyles = (h) => (h || "").replace(/\sstyle="[^"]*"/g, "").replace(/\sdecoding="async"/g, "").replace(/\s+/g, " ").trim();
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

function balanced(src, start) {
  // returns the {...} or [...] literal starting at `start`
  const open = src[start], close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === "\\") i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return src.slice(start, i + 1);
  }
}

async function getHtml(slug) {
  const cache = new URL(`html/${slug}.html`, SRC);
  if (fs.existsSync(cache)) return fs.readFileSync(cache, "utf8");
  const h = await (await fetch(`https://betterhood.in/${slug}/`, { headers: { "user-agent": "Mozilla/5.0" } })).text();
  fs.mkdirSync(new URL("html/", SRC), { recursive: true });
  fs.writeFileSync(cache, h);
  return h;
}

for (const slug of slugs) {
  const html = await getHtml(slug);
  const $ = cheerio.load(html);
  // the assessment is the biggest multi-page form on the page
  const formId = $("form[id^=gform_]").map((_, f) => +f.attribs.id.split("_")[1]).get()
    .sort((a, b) => $(`#gform_${b} .gfield`).length - $(`#gform_${a} .gfield`).length)[0];
  const form = $(`#gform_${formId}`);

  const fields = [];
  form.find(".gfield").each((_, el) => {
    const $el = $(el);
    const id = +el.attribs.id.split("_").pop();
    const cls = el.attribs.class || "";
    const type = (cls.match(/gfield--type-([a-z_]+)/) || [])[1] || "unknown";
    const pageEl = $el.closest(".gform_page");
    const page = pageEl.length ? +pageEl.attr("id").split("_").pop() : 1;
    const f = {
      id, type, page,
      label: clean($el.find(".gfield_label, legend").first().clone().children(".gfield_required").remove().end().text()),
      description: clean($el.find(".gfield_description").first().text()),
      required: cls.includes("gfield_contains_required"),
      hidden: cls.includes("gfield_visibility_hidden") || type === "hidden",
      css: cls.split(" ").filter((c) => !/^(gfield|field_|gfield_|gfield--)/.test(c) && c).join(" "),
    };
    const choices = $el.find(".gchoice, option").map((_, c) => {
      const $c = $(c);
      const input = $c.is("option") ? $c : $c.find("input");
      return { value: input.attr("value") ?? clean($c.text()), label: clean($c.is("option") ? $c.text() : $c.find("label").text()), img: $c.find("img").attr("src") || undefined };
    }).get().filter((c) => c.label !== "Select" || c.value);
    if (choices.length) f.choices = choices;
    const input = $el.find("input:not([type=hidden]), textarea").first();
    if (input.length) { f.inputType = input.attr("type") || "textarea"; f.placeholder = input.attr("placeholder") || ""; }
    const hiddenVal = $el.find("input[type=hidden]").attr("value");
    if (hiddenVal) f.default = hiddenVal;
    if (type === "html") f.html = stripStyles($el.html());
    const ta = $el.find("textarea");
    if (ta.length && ta.text().trim()) f.default = stripStyles(ta.text().trim());
    if (type === "number" || type === "calculation") f.default = $el.find("input").attr("value") || "";
    fields.push(f);
  });

  const calcStart = html.indexOf(`GFCalc(${formId}, [`);
  const formulas = {};
  if (calcStart > -1) JSON.parse(balanced(html, html.indexOf("[", calcStart))).forEach((c) => (formulas[c.field_id] = c.formula));

  const logicKey = `window['gf_form_conditional_logic'][${formId}] = `;
  const ls = html.indexOf(logicKey);
  const logic = {};
  if (ls > -1) {
    const obj = balanced(html, ls + logicKey.length);
    const parsed = Function(`return (${obj})`)();
    for (const [fid, l] of Object.entries(parsed.logic || {})) if (l.field) logic[fid] = l.field;
    for (const [fid, l] of Object.entries(parsed.logic || {})) if (l.nextButton) logic[`next_${fid}`] = l.nextButton;
  }

  const pageTitles = form.find(".gf_step_label").map((_, s) => clean($(s).text())).get();
  const intro = clean(form.closest(".gform_wrapper").find(".gform_description").text());
  fs.writeFileSync(new URL(`${slug}.json`, OUT), JSON.stringify({ slug, formId, pageTitles, intro, fields, formulas, logic }, null, 1));
  console.log(slug, formId, "fields", fields.length, "visibleQs", fields.filter((f) => !f.hidden && f.choices).length, "formulas", Object.keys(formulas).length, "logic", Object.keys(logic).length);
}

// Product recommendations shown on each assessment result / protocol / corner page
const recPages = fs.readdirSync(new URL("html/", SRC)).filter((f) => /^(result-|better-you-corner|betteryou-corner|.*-protocols|longevity-|diagnostics)/.test(f));
const recs = {};
for (const f of recPages) {
  const $ = cheerio.load(fs.readFileSync(new URL(`html/${f}`, SRC), "utf8"));
  const handles = [...new Set($("#et-main-area a[href*='/products/']").map((_, a) => $(a).attr("href").split("/products/")[1].split(/[?#/]/)[0]).get())];
  recs[f.replace(/\.html$/, "")] = handles;
}
fs.writeFileSync(new URL("../recommendations.json", OUT), JSON.stringify(recs, null, 1));
console.log("recommendations", Object.entries(recs).map(([k, v]) => `${k}:${v.length}`).join(" "));
