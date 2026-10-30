// Visitor journey tracking. Sends events in batches to the betterhood backend (PUBLIC_TRACK_ENDPOINT,
// e.g. https://api.betterhood.in/v1/collect), which stores them in Supabase.
//
// Automatic: page views, time actively on each page, scroll depth, every click on a link or button
// (with the zone of the page it sits in), outbound clicks (shop, WhatsApp, phone, email, social),
// FAQ/accordion opens, video plays, rage clicks, homepage chapters seen, form starts, JS errors and
// Web Vitals.
// Elsewhere in the site: track("name", {...}) for custom events and identify({email, phone, name})
// once someone tells us who they are. Any element with data-track="event_name" is tracked on click,
// with its data-track-* attributes as properties.
// Markup hooks: data-zone="name" names a part of the page; data-page-type="…" plus data-page-* adds
// context to the page_view; data-track-off skips the generic click event inside it (for widgets that
// send their own events).
import { onCLS, onINP, onLCP, onTTFB } from "web-vitals";

const ENDPOINT: string = import.meta.env.PUBLIC_TRACK_ENDPOINT ?? "";
const SESSION_IDLE = 30 * 60_000;
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type Props = Record<string, unknown>;
type Ctx = Record<string, string | number | null>;
type Ev = { id: string; name: string; ts: number; path: string; title: string; props: Props };

const uuid = () =>
  crypto.randomUUID?.() ??
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} },
};
const cookie = (k: string) => document.cookie.match(new RegExp(`(?:^|; )${k}=([^;]+)`))?.[1] ?? null;

// ---- identity ----
// Anonymous id: one per browser, kept in localStorage and a first-party cookie (survives either being cleared)
let aid = store.get("bh_aid") || cookie("bh_aid") || uuid();
store.set("bh_aid", aid);
document.cookie = `bh_aid=${aid}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;

// Session: new after 30 minutes idle, or when the visitor arrives from a different campaign
const url = new URL(location.href);
const campaign = url.searchParams.get("utm_campaign") || url.searchParams.get("gclid") || url.searchParams.get("fbclid");
let sid = store.get("bh_sid");
let ctx: Ctx = JSON.parse(store.get("bh_sctx") || "null");
const lastSeen = Number(store.get("bh_slast") || 0);
const expired = !sid || !ctx || Date.now() - lastSeen > SESSION_IDLE || (campaign && campaign !== (ctx.utm_campaign || ctx.gclid || ctx.fbclid));
if (expired) {
  sid = uuid();
  const ref = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : null;
  ctx = {
    started_at: Date.now(),
    landing: location.pathname,
    referrer: ref,
    ...Object.fromEntries(UTM.map((k) => [k, url.searchParams.get(k)])),
    gclid: url.searchParams.get("gclid"),
    fbclid: url.searchParams.get("fbclid"),
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  store.set("bh_sid", sid!);
  store.set("bh_sctx", JSON.stringify(ctx));
}
const touch = () => store.set("bh_slast", String(Date.now()));
touch();

// ---- queue & delivery ----
let queue: Ev[] = [];
const respectDnt = navigator.doNotTrack === "1" || (navigator as any).globalPrivacyControl === true;
const enabled = !!ENDPOINT && !respectDnt;

export function flush(beacon = false) {
  if (!enabled || !queue.length) return;
  const batch = queue.splice(0, 50);
  const body = JSON.stringify({ aid, sid, ctx, events: batch });
  // text/plain keeps it a "simple" request: no CORS preflight, and sendBeacon can deliver it on unload
  if (beacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
  fetch(ENDPOINT, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: body.length < 60_000 })
    .then((r) => { if (r.status >= 500) queue.unshift(...batch); })
    .catch(() => queue.unshift(...batch));
  if (queue.length) flush(beacon);
}
setInterval(() => flush(), 5000);

export function track(name: string, props: Props = {}) {
  const ev: Ev = { id: uuid(), name, ts: Date.now(), path: location.pathname, title: document.title.replace(/ \| betterhood$/, ""), props };
  queue.push(ev);
  if (queue.length > 500) queue.shift(); // offline for a long time: keep the newest
  touch();
  if (queue.length >= 20) flush();
  return ev.id;
}

// Link everything this browser has done (before and after) to a person
export function identify(person: { email?: string; phone?: string; name?: string }) {
  if (!person.email && !person.phone) return;
  track("identify", person);
  flush();
}

export const ids = () => ({ aid, sid });

// ---- page views & time on page ----
const pageType = (p: string) =>
  p === "/" ? "home"
  : p.startsWith("/learn/") ? (p.split("/").filter(Boolean).length === 2 ? "article" : "learn")
  : p.startsWith("/physio/") ? "physio"
  : p.startsWith("/assessment-") ? "assessment"
  : p.startsWith("/result-") ? "result"
  : p.startsWith("/completed-message") ? "completed"
  : /better-?you-corner/.test(p) ? "corner"
  : p.endsWith("-protocols/") ? "protocol"
  : "page";

// data-foo-bar-baz attributes → { barBaz } for the given prefix ("foo")
function attrs(el: HTMLElement, prefix: string) {
  const props: Props = {};
  for (const [k, v] of Object.entries(el.dataset)) if (k.startsWith(prefix) && k.length > prefix.length) props[k[prefix.length].toLowerCase() + k.slice(prefix.length + 1)] = v;
  return props;
}

// Where on the page an element sits: an explicit data-zone, else the labelled or id'd section around it
export function zoneOf(el: Element) {
  const z = el.closest<HTMLElement>("[data-zone]")?.dataset.zone;
  if (z) return z;
  const s = el.closest("section[aria-label], section[id]");
  return s ? s.getAttribute("aria-label") || s.id : "main";
}
const label = (el: Element) => el.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || el.getAttribute("aria-label") || null;

const pageEl = document.querySelector<HTMLElement>("[data-page-type]");
const viewId = track("page_view", { type: pageType(location.pathname), ...(pageEl && attrs(pageEl, "page")), prev: document.referrer && new URL(document.referrer).host === location.host ? new URL(document.referrer).pathname : null });

let engaged = 0, visibleSince = document.visibilityState === "visible" ? performance.now() : 0, maxScroll = 0, left = false;
const marks = new Set<number>();
function onScroll() {
  const h = document.documentElement.scrollHeight - innerHeight;
  const pct = h <= 0 ? 100 : Math.min(100, Math.round((scrollY / h) * 100));
  if (pct > maxScroll) maxScroll = pct;
  for (const m of [25, 50, 75, 100]) if (pct >= m && !marks.has(m)) { marks.add(m); track("scroll_depth", { depth: m }); }
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("load", onScroll);

function leave() {
  if (visibleSince) { engaged += performance.now() - visibleSince; visibleSince = 0; }
  if (!left) { left = true; track("page_leave", { view_id: viewId, engaged_ms: Math.round(engaged), max_scroll: maxScroll, clicks, first_click_ms: firstClickMs }); }
  flush(true);
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") leave();
  else { visibleSince = performance.now(); if (left) { left = false; engaged = 0; } }
});
addEventListener("pagehide", leave);

// ---- clicks: every link/button, outbound links, data-track elements, rage clicks ----
const SOCIAL = /instagram|youtube|youtu\.be|linkedin|facebook|twitter|x\.com/;
function linkKind(a: HTMLAnchorElement) {
  const h = a.href;
  if (h.startsWith("tel:")) return "tel";
  if (h.startsWith("mailto:")) return "email";
  if (/whatsapp|wa\.me/.test(h)) return "whatsapp";
  if (/shop\.betterhood\.in/.test(h)) return /\/products\//.test(h) ? "product" : "shop";
  if (SOCIAL.test(h)) return "social";
  try { return new URL(h).host === location.host ? null : "external"; } catch { return null; }
}
let clicks = 0, firstClickMs: number | null = null;
let rage = { n: 0, t: 0, x: 0, y: 0 };
document.addEventListener("click", (e) => {
  const t = e.target as Element;
  clicks++;
  firstClickMs ??= Math.round(performance.now());
  // 3+ clicks on the same spot within a second: usually something that looks clickable but does nothing
  const near = e.timeStamp - rage.t < 1000 && Math.abs(e.clientX - rage.x) < 30 && Math.abs(e.clientY - rage.y) < 30;
  rage = { n: near ? rage.n + 1 : 1, t: e.timeStamp, x: e.clientX, y: e.clientY };
  if (rage.n === 3) track("rage_click", { zone: zoneOf(t), tag: t.tagName.toLowerCase(), text: label(t)?.slice(0, 60) });

  const el = t.closest<HTMLElement>("[data-track]");
  if (el) track(el.dataset.track!, { zone: zoneOf(el), ...attrs(el, "track") });
  const a = t.closest<HTMLAnchorElement>("a[href]");
  const kind = a && linkKind(a);
  if (a && kind) {
    track("outbound_click", { kind, url: a.href.slice(0, 300), text: label(a), zone: zoneOf(a) });
    flush(true);
    return;
  }
  const c = el ? null : t.closest<HTMLElement>("a[href], button, summary, [role=button]");
  if (!c || c.closest("[data-track-off]")) return;
  if (c.tagName === "SUMMARY") {
    // the click happens before the toggle: closed now means it's being opened
    if (!(c.parentElement as HTMLDetailsElement).open) track("expand", { zone: zoneOf(c), text: label(c) });
    return;
  }
  track("click", { zone: zoneOf(c), text: label(c), href: a ? a.pathname + a.search + a.hash : null });
}, { capture: true });

// ---- video plays: <video> elements, and clicks into embedded players (YouTube) ----
document.addEventListener("play", (e) => {
  const v = e.target as HTMLMediaElement;
  track("video_play", { zone: zoneOf(v), src: v.currentSrc.slice(0, 200), via: "native" });
}, { capture: true });
const playedEmbeds = new Set<string>();
addEventListener("blur", () => setTimeout(() => {
  // focus moving into an iframe is the only signal a cross-origin player gives us
  const f = document.activeElement;
  if (!(f instanceof HTMLIFrameElement) || playedEmbeds.has(f.src)) return;
  playedEmbeds.add(f.src);
  track("video_play", { zone: zoneOf(f), video: f.src.match(/embed\/([\w-]{6,})/)?.[1] ?? f.src.slice(0, 200), via: "embed" });
}));

// Hand our ids to Shopify so orders can be matched back to the visit (read them from the landing URL / cart attributes there)
document.addEventListener("pointerdown", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="shop.betterhood.in"]');
  if (!a) return;
  const u = new URL(a.href);
  u.searchParams.set("bh_aid", aid);
  u.searchParams.set("bh_sid", sid!);
  a.href = u.toString();
}, { capture: true });

// ---- homepage chapters / labelled sections seen ----
const seen = new Set<string>();
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    const label = (en.target as HTMLElement).getAttribute("aria-label")!;
    if (en.isIntersecting && !seen.has(label)) { seen.add(label); track("section_view", { section: label }); io.unobserve(en.target); }
  }
}, { threshold: 0.4 });
document.querySelectorAll("main section[aria-label]").forEach((s) => io.observe(s));

// ---- forms: started (first interaction) ----
const started = new Set<string>();
document.addEventListener("focusin", (e) => {
  const f = (e.target as Element).closest<HTMLFormElement>("form[data-bh-form]");
  if (f && !started.has(f.dataset.bhForm!)) { started.add(f.dataset.bhForm!); track("form_start", { form: f.dataset.bhForm }); }
});

// ---- errors & speed ----
let errors = 0;
addEventListener("error", (e) => {
  if (errors++ < 5) track("js_error", { message: String(e.message).slice(0, 300), source: e.filename?.slice(0, 200), line: e.lineno });
});
addEventListener("unhandledrejection", (e) => {
  if (errors++ < 5) track("js_error", { message: String(e.reason?.message ?? e.reason).slice(0, 300) });
});
const vital = (m: { name: string; value: number; rating: string }) => track("web_vital", { metric: m.name, value: Math.round(m.value * 1000) / 1000, rating: m.rating });
onLCP(vital); onCLS(vital); onINP(vital); onTTFB(vital);
