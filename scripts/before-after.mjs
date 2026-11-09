// Before/after record for a redesigned page (see REVAMP-GUIDELINES.md → "Before/after PDFs").
//
// Takes full-page screenshots of the live page ("before") and the local build ("after") at desktop and
// mobile widths with headless Chrome, then prints them side by side into an A4-landscape PDF.
//
//   node scripts/before-after.mjs --name learn --live https://betterhood.in/learn/ --local http://localhost:4321/learn/
//   node scripts/before-after.mjs --name learn --live https://betterhood.in/learn/ --shots-only   (just screenshots)
//
// Screenshots go to .before-after/<name>/, the PDF to before-and-after/<name>-before-after.pdf.
// Needs Chrome or Edge installed; the local page must be running (npm run dev / npm run preview).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const name = arg("name");
const live = arg("live");
const local = arg("local");
const title = arg("title", `${name} before and after`);
if (!name || !live) throw new Error("usage: --name <slug> --live <url> [--local <url>] [--shots-only] [--title <text>]");

const OUT = path.join(".before-after", name);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync("before-and-after", { recursive: true });

const CHROME = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && fs.existsSync(p));
if (!CHROME) throw new Error("Chrome not found; set CHROME=/path/to/chrome");

const VIEWS = [
  { key: "desktop", width: 1440, height: 900, mobile: false, scale: 1 },
  { key: "mobile", width: 390, height: 844, mobile: true, scale: 2 },
];

// ---- tiny CDP client ------------------------------------------------------------------------------
const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ba-chrome-"));
const proc = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}
const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const waiting = new Map();
const listeners = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { const { res, rej } = waiting.get(m.id); waiting.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else if (m.method) listeners.forEach((l) => l(m));
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const once = (method) => new Promise((r) => { const l = (m) => { if (m.method === method) { listeners.splice(listeners.indexOf(l), 1); r(m.params); } }; listeners.push(l); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");

async function interact(view) {
  const x = Math.round(view.width / 2), y = 300;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + 20, y: y + 20 });
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: -1 });
  await sleep(3000);
}

async function shoot(url, view, file) {
  await send("Emulation.setDeviceMetricsOverride", { width: view.width, height: view.height, deviceScaleFactor: view.scale, mobile: view.mobile });
  await send("Emulation.setUserAgentOverride", {
    userAgent: view.mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await Promise.race([loaded, sleep(45000)]);
  // The live WordPress site delays some CSS/JS until the first real user interaction; send real input events
  // so it loads (synthetic DOM events from page script don't count).
  await interact(view);
  // reduced motion so reveal animations land in their final state; dismiss popups; trigger lazy images
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await evaluate(`(async () => {
    const s = (ms) => new Promise(r => setTimeout(r, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await s(120); }
    scrollTo(0, 0); await s(800);
    document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
    document.querySelectorAll('[data-src]').forEach(i => { if (!i.src) i.src = i.dataset.src; });
    // live site: newsletter / login popups and cookie bars cover the page
    document.querySelectorAll('.pum-overlay, .xoo-el-container, .popup-overlay, #popup, .modal-backdrop, astro-dev-toolbar').forEach(e => e.remove());
    document.body.style.overflow = 'visible';
    await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 6000); })));
    // masonry / carousel scripts (WP Grid Builder on the live site) lay out again once images have sizes
    dispatchEvent(new Event('resize'));
    await s(2500);
  })()`);
  let { cssContentSize } = await send("Page.getLayoutMetrics");
  // very tall pages drop to 1x pixel density so the capture stays inside Chrome's texture limits
  const MAX = 30000;
  let height = Math.min(Math.ceil(cssContentSize.height), MAX);
  const dsf = height * view.scale > 16000 ? 1 : view.scale;
  // Scroll-triggered layouts (masonry grids, carousels, reveal-on-scroll) can freeze mid-animation when a
  // page is scrolled by script. Reload with a viewport as tall as the page so everything is in view from
  // the start, then capture without scrolling. (Elements sized in vh are capped in our CSS, so they don't balloon.)
  await send("Emulation.setDeviceMetricsOverride", { width: view.width, height, deviceScaleFactor: dsf, mobile: view.mobile });
  const reloaded = once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await Promise.race([reloaded, sleep(45000)]);
  await interact(view);
  await evaluate(`(async () => {
    const s = (ms) => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('.pum-overlay, .xoo-el-container, .popup-overlay, #popup, .modal-backdrop, astro-dev-toolbar').forEach(e => e.remove());
    await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 8000); })));
    await s(4000);
  })()`);
  ({ cssContentSize } = await send("Page.getLayoutMetrics"));
  height = Math.min(Math.ceil(cssContentSize.height), MAX);
  const { data } = await send("Page.captureScreenshot", {
    format: "jpeg", quality: 82, captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: view.width, height, scale: 1 },
  });
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  console.log(`  ${path.basename(file)}  ${view.width}×${height}`);
  return { file, height };
}

const shots = {};
for (const view of VIEWS) {
  shots[view.key] = {};
  console.log(`${view.key}:`);
  shots[view.key].before = await shoot(live, view, path.join(OUT, `before-${view.key}.jpg`));
  if (local) shots[view.key].after = await shoot(local, view, path.join(OUT, `after-${view.key}.jpg`));
}

if (!flag("shots-only") && local) {
  // A4 landscape; each page shows the same vertical slice of before (left) and after (right).
  // Pages are paired by proportion of total height, so the two columns stay roughly aligned.
  const PAGE_W = 297, PAGE_H = 210; // mm
  const b64 = (f) => `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}`;
  const pages = [];
  const cover = `<section class="pg cover"><h1>${title}</h1>
    <p><strong>Before:</strong> ${live}<br><strong>After:</strong> redesigned page (local build)</p>
    <p>Content (text, links, images, posts) is unchanged; only the design and technical SEO differ.</p>
    <p class="d">Generated ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></section>`;
  pages.push(cover);
  for (const view of VIEWS) {
    const { before, after } = shots[view.key];
    const colWmm = view.mobile ? 84 : 136; // column width on paper
    const usable = PAGE_H - 22; // mm of image per page
    const px = (shot, w) => (shot.height / w) * colWmm; // total mm height at column width
    const bmm = px(before, view.width), amm = px(after, view.width);
    const n = Math.ceil(Math.max(bmm, amm) / usable);
    for (let i = 0; i < n; i++) {
      const slice = (shot, total) => {
        const per = total / n; // spread both over the same page count
        return `<div class="col" style="width:${colWmm}mm;height:${Math.min(per, usable)}mm"><img src="${b64(shot.file)}" style="width:${colWmm}mm;transform:translateY(-${per * i}mm)"></div>`;
      };
      pages.push(`<section class="pg"><header><span>Before · ${view.key}</span><span>${name} · ${i + 1}/${n}</span><span>After · ${view.key}</span></header>
        <div class="row">${slice(before, bmm)}${slice(after, amm)}</div></section>`);
    }
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; }
    body { font: 11px/1.4 system-ui, sans-serif; color: #2a1230; }
    .pg { width: ${PAGE_W}mm; height: ${PAGE_H}mm; padding: 6mm 8mm; page-break-after: always; overflow: hidden; }
    .cover { display: grid; align-content: center; gap: 6mm; padding: 30mm; background: #f6f0f7; }
    .cover h1 { font-size: 30px; text-transform: capitalize; } .cover p { font-size: 14px; } .cover .d { color: #7a6680; }
    header { display: flex; justify-content: space-between; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #7a6680; margin-bottom: 3mm; }
    .row { display: flex; justify-content: space-around; align-items: flex-start; }
    .col { overflow: hidden; border: .3mm solid #e4dbe6; border-radius: 1.5mm; background: #fff; }
    .col img { display: block; }
  </style></head><body>${pages.join("")}</body></html>`;
  const htmlFile = path.resolve(OUT, "sheet.html");
  fs.writeFileSync(htmlFile, html);
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: "file:///" + htmlFile.replace(/\\/g, "/") });
  await loaded; await sleep(800);
  const { data } = await send("Page.printToPDF", { landscape: true, printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  const pdf = path.join("before-and-after", `${name}-before-after.pdf`);
  fs.writeFileSync(pdf, Buffer.from(data, "base64"));
  console.log(`PDF → ${pdf}`);
}

ws.close();
proc.kill();
