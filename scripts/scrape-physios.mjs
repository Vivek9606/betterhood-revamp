// Scrapes every /physio/{slug}/ profile from the live site into content-src/physios.json
import fs from "node:fs";
import * as cheerio from "cheerio";

const SRC = new URL("../content-src/", import.meta.url);
const OUT = new URL("physios.json", SRC);
const list = [];
for (let i = 1; fs.existsSync(new URL(`api/physio_${i}.json`, SRC)); i++)
  list.push(...JSON.parse(fs.readFileSync(new URL(`api/physio_${i}.json`, SRC))));

const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : {};
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

function parse(html) {
  const $ = cheerio.load(html);
  const sec = (cls) => $(`.${cls}`);
  return {
    name: clean($(".ds-doc-name").first().text()),
    degree: clean($(".ds-doc-degree").first().text()),
    badges: $(".ds-doc-badges .ds-badge").map((_, e) => clean($(e).text())).get(),
    image: $(".ds-doc-img").attr("src") || "",
    about: $(".ds-about-content").html()?.trim() || "",
    specializations: $(".ds-spec-pill").map((_, e) => clean($(e).text())).get(),
    modes: $(".ds-mode-label").map((_, e) => clean($(e).text())).get(),
    education: $(".ds-edu-card").map((_, e) => ({
      year: clean($(e).find(".ds-edu-year-badge").text()),
      degree: clean($(e).find(".ds-edu-degree").text()),
      institute: clean($(e).find(".ds-edu-inst").text()),
    })).get(),
    certifications: sec("ds-certifications-section").find("li, .ds-cert-item, .ds-cert-card").map((_, e) => clean($(e).text())).get(),
    experience: $(".ds-exp-item").map((_, e) => ({
      role: clean($(e).find(".ds-exp-role").text()),
      date: clean($(e).find(".ds-exp-date").text()),
      place: clean($(e).find(".ds-exp-location").text()),
    })).get(),
    practice: $(".ds-practice-item").map((_, e) => ({
      label: clean($(e).find(".ds-label").text()),
      value: clean($(e).find(".ds-value").text()),
    })).get(),
    address: clean($(".ds-clinic-address").clone().children().remove().end().text()),
    awards: $(".ds-award-name").map((_, e) => clean($(e).text())).get(),
    metaDescription: $('meta[name="description"]').attr("content") || "",
    seoTitle: clean($("title").text()),
  };
}

const queue = list.filter((p) => !done[p.slug]);
console.log(`to fetch: ${queue.length} / ${list.length}`);
let n = 0;
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(p.link, { headers: { "user-agent": "Mozilla/5.0 betterhood-revamp" } });
        if (!r.ok) throw new Error(r.status);
        done[p.slug] = parse(await r.text());
        break;
      } catch (e) {
        if (attempt === 2) console.error("fail", p.slug, e.message);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (++n % 50 === 0) { fs.writeFileSync(OUT, JSON.stringify(done)); console.log(n); }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(OUT, JSON.stringify(done));
console.log("done", Object.keys(done).length);
