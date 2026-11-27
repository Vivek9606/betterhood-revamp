// Slouch Catcher on the betterhood website. The AI, the points and the coupons live in the Slouch Catcher
// service (slouch-catcher repo, DigitalOcean). This page is its front-end: people stay on betterhood.in and
// sign in with their betterhood account (WhatsApp OTP, same account as the app). The website sends that
// session to Slouch Catcher as a Bearer token, so points, catches and coupons belong to the betterhood account.
import { accountsOn, call, cleanPhone, consentItem, requestCode, session, signUpPatient, validPhone, verifyCode, SIGNUP_CONSENT } from "./account";
import { href } from "./base";

export const SLOUCH: string = String(import.meta.env.PUBLIC_SLOUCH_API || "https://orca-app-bg34h.ondigitalocean.app").replace(/\/+$/, "");

export interface Persona { id: string; name: string; emoji: string; tier: "good" | "average" | "bad"; pattern: string; remark: string }
export type Zones = { N: number; S: number; B: number; K: number };
export interface Product { id: string; name: string; url: string; image: string; price: number; mrp: number; why?: string }
export interface Result {
  verdict: "good" | "bad" | "unclear"; score: number | null; zones: Zones | null; persona: string | null;
  issues: string[]; products: Product[]; summary: string; demo?: boolean; test?: boolean; catchToken?: string | null;
}
export interface Me {
  enabled: boolean; betterhood: boolean; testMode: boolean;
  config: { welcome: number; snap: number; snapDailyCap: number; join: number; couponPoints: number; couponValue: number };
  user: { name: string | null; phone: string } | null; points?: number;
  coupons?: { code: string; value: number; at: string }[];
  catches?: { code: string; target: string; persona: string; score: number; verdict: string; at: string; joined: boolean }[];
}

export const ZONES: [keyof Zones, string][] = [["N", "Neck"], ["S", "Shoulder"], ["B", "Back"], ["K", "Knee"]];
export const zoneBand = (v: number) => (v >= 8 ? "strong" : v >= 6 ? "decent" : v >= 4 ? "weak" : "poor");

/** Call the Slouch Catcher API, signed in with the betterhood account when there is one. */
export async function sc<T = any>(path: string, body?: unknown): Promise<T> {
  const s = accountsOn() ? session() : null;
  let res: Response;
  try {
    res = await fetch(SLOUCH + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(s ? { Authorization: `Bearer ${s.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error("Can't reach Slouch Catcher. Check your connection and try again."), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { status: res.status });
  return data as T;
}

let personas: Promise<Persona[]> | null = null;
export const loadPersonas = () => (personas ||= sc<{ personas: Persona[] }>("/api/personas").then((r) => r.personas).catch(() => { personas = null; return []; }));
export const me = () => sc<Me>("/api/me");
export const shortName = (p: Persona) => p.name.replace(/^The /, "");
export const scoreColor = (s: number) => (s >= 7 ? "var(--mint-600)" : s >= 4.5 ? "var(--sun-500)" : "var(--coral-500)");
export const catchUrl = (code: string) => `${location.origin}${href("/slouch-catcher/c/")}?code=${encodeURIComponent(code)}`;
export const pageUrl = () => `${location.origin}${href("/slouch-catcher/")}`;
export const shopLink = (id?: string) => `${SLOUCH}/go/${encodeURIComponent(id || "shop")}`;

export function zonesHtml(z: Zones) {
  return ZONES.map(([k, label]) => {
    const v = z[k];
    return `<li class="sc-zone ${zoneBand(v)}"><span>${label}</span><span class="sc-zbar"><i style="width:${(v / 9) * 100}%"></i></span><strong>${v}</strong><small>${zoneBand(v)}</small></li>`;
  }).join("");
}
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// ---------- sign in with the betterhood account, inline ----------
// Phone → WhatsApp code → signed in. A new number also makes the free betterhood account (patient), so the
// points have a home. Renders into `box` and resolves once signed in.
export function signInInline(box: HTMLElement, opts: { name?: string; askName?: boolean; title: string; sub: string; submit?: string }): Promise<void> {
  return new Promise((resolve) => {
    let phone = "";
    const phoneStep = () => {
      box.innerHTML = `<form class="sc-step" novalidate>
        <h2 class="h3">${esc(opts.title)}</h2>
        <p class="muted">${esc(opts.sub)}</p>
        ${opts.askName ? `<div class="field"><label for="sc-n">Your name</label><input class="input" id="sc-n" name="name" autocomplete="name" maxlength="30" required value="${esc(opts.name || "")}"></div>` : ""}
        <div class="field"><label for="sc-p">Mobile number (WhatsApp)</label><div class="sc-phone"><span>+91</span><input class="input" id="sc-p" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="98765 43210" required></div></div>
        <label class="sc-check"><input type="checkbox" required> <span>${esc(SIGNUP_CONSENT)}</span></label>
        <p class="form-note err" data-err hidden></p>
        <button class="btn btn-block btn-lg" type="submit">${esc(opts.submit || "Send code on WhatsApp")}</button>
        <p class="sc-fine">This signs you in to your free betterhood account, the same one as on the betterhood app. Already have one? Use the same number.</p>
      </form>`;
      const f = box.querySelector("form")!;
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = f.querySelector<HTMLElement>("[data-err]")!;
        const name = f.querySelector<HTMLInputElement>("#sc-n")?.value.trim() ?? opts.name ?? "";
        phone = cleanPhone(f.querySelector<HTMLInputElement>("#sc-p")!.value);
        const tick = f.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked;
        const bad = opts.askName && !name ? "Tell us your name." : !validPhone(phone) ? "Enter a valid 10-digit mobile number." : !tick ? "Please tick the box to continue." : "";
        if (bad) { err.textContent = bad; err.hidden = false; return; }
        opts.name = name;
        const btn = f.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        btn.disabled = true;
        try { await requestCode(phone); codeStep(); }
        catch (x) { err.textContent = (x as Error).message; err.hidden = false; btn.disabled = false; }
      });
      box.querySelector<HTMLInputElement>(opts.askName && !opts.name ? "#sc-n" : "#sc-p")?.focus();
    };
    const codeStep = () => {
      box.innerHTML = `<form class="sc-step" novalidate>
        <h2 class="h3">Enter the code</h2>
        <p class="muted">We've sent a 6-digit code to your WhatsApp on <b>+91 ${phone.slice(0, 5)} ${phone.slice(5)}</b>.</p>
        <div class="field"><label for="sc-c">6-digit code</label><input class="input sc-code" id="sc-c" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
        <p class="form-note err" data-err hidden></p>
        <button class="btn btn-block btn-lg" type="submit">Verify</button>
        <p class="sc-fine"><button type="button" class="sc-link" data-back>Change number</button> · <button type="button" class="sc-link" data-resend>Send it again</button></p>
      </form>`;
      const f = box.querySelector("form")!;
      const err = f.querySelector<HTMLElement>("[data-err]")!;
      const say = (m: string, bad = true) => { err.textContent = m; err.className = `form-note ${bad ? "err" : "ok"}`; err.hidden = !m; };
      f.querySelector("[data-back]")!.addEventListener("click", phoneStep);
      f.querySelector("[data-resend]")!.addEventListener("click", () => requestCode(phone).then(() => say("We've sent a new code.", false), (x) => say((x as Error).message)));
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const code = f.querySelector<HTMLInputElement>("#sc-c")!.value.replace(/\D/g, "");
        if (code.length !== 6) return say("Enter the 6-digit code from WhatsApp.");
        const btn = f.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        btn.disabled = true;
        try {
          const r = await verifyCode(phone, code);
          if (!r.signedIn) {
            await signUpPatient({
              signupToken: r.signupToken, name: opts.name || "betterhood member", via: "slouch-catcher",
              consents: [consentItem("terms", true, SIGNUP_CONSENT), consentItem("share_with_physio", true, SIGNUP_CONSENT)],
            });
          }
          resolve();
        } catch (x) { say((x as Error).message || "That code didn't work. Please try again."); btn.disabled = false; }
      });
      f.querySelector<HTMLInputElement>("#sc-c")!.focus();
    };
    phoneStep();
  });
}

/** Signed in with a betterhood account this page can use for points. */
export const signedIn = () => accountsOn() && !!session();
export { call };

// ---------- the Caught Card image (1080x1350) ----------
const C = { top: "#5a1d4f", bottom: "#683574", card: "#3a2342", amber: "#ffb21c", amberLight: "#ffd25f", coral: "#ff7d6b", plum: "#4f275c" };
const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

export function personalLine(verdict: string, who: { catcher: string; target: string } | null) {
  if (!who) return verdict === "bad" ? "Caught slouching!" : verdict === "good" ? "Caught standing tall!" : "The suspect escaped, this time.";
  const { catcher, target } = who;
  return verdict === "bad" ? `${target}, you've been caught slouching by ${catcher}!`
    : verdict === "good" ? `${catcher} caught ${target} standing tall!`
    : `${target} slipped past ${catcher}, this time.`;
}

export async function drawCard(photoUrl: string, r: Result, persona: Persona | null, who: { catcher: string; target: string } | null): Promise<Blob> {
  const W = 1080, H = 1350;
  const photo = await loadImage(photoUrl);
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = canvas.getContext("2d")!;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
  const font = (weight: number, size: number, fam = display) => (ctx.font = `${weight} ${size}px ${fam}`);
  const centered = (text: string, y: number, color: string) => { ctx.fillStyle = color; ctx.textAlign = "center"; ctx.fillText(text, W / 2, y); };
  const wrap = (text: string, maxW: number) => {
    const lines: string[] = []; let line = "";
    for (const word of text.split(" ")) { const t = line ? line + " " + word : word; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t; }
    if (line) lines.push(line);
    return lines;
  };
  const rr = (x: number, y: number, w: number, h: number, rad: number) => { ctx.beginPath(); ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad); ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath(); };
  const circle = (x: number, y: number, rad: number, fill: string | CanvasGradient, stroke?: string) => { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 6; ctx.strokeStyle = stroke; ctx.stroke(); } };
  const at = (t: string, x: number, y: number) => { ctx.textAlign = "center"; ctx.fillText(t, x, y); };

  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, C.top); bg.addColorStop(1, C.bottom);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  font(800, 56); centered("betterhood", 106, C.amber);
  font(700, 42);
  const head = wrap(personalLine(r.verdict, who), W - 140).slice(0, 2);
  head.forEach((l, i) => centered(l, 196 + i * 54, "#fff"));
  let y = 196 + head.length * 54 + 26;
  font(800, 30); centered("POSTURE ANIMAL", y, C.amberLight);
  font(800, 92); centered((persona ? persona.name : "No ID yet").toUpperCase(), y + 98, C.coral);
  y += 156;
  font(600, 30);
  const roast = wrap(persona ? `"${persona.remark}"` : "Send a clearer side-on shot to reveal the posture animal.", W - 220).slice(0, 5);
  const boxH = 84 + roast.length * 40;
  const ps = Math.min(470, H - y - boxH - 210), px = (W - ps) / 2;
  ctx.save(); rr(px, y, ps, ps, 36); ctx.clip();
  const s = Math.max(ps / photo.width, ps / photo.height);
  ctx.drawImage(photo, px + (ps - photo.width * s) / 2, y + (ps - photo.height * s) / 2, photo.width * s, photo.height * s);
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = C.amber; rr(px, y, ps, ps, 36); ctx.stroke();
  circle(px + 10, y + ps - 10, 66, C.card, C.amber);
  ctx.fillStyle = "#fff"; font(400, 70, "sans-serif"); ctx.textBaseline = "middle"; at(persona ? persona.emoji : "🕵️", px + 10, y + ps - 6);
  if (typeof r.score === "number") {
    const g = ctx.createLinearGradient(px + ps - 90, 0, px + ps + 90, 0); g.addColorStop(0, C.amber); g.addColorStop(1, C.amberLight);
    const bx = px + ps - 10, by = y + 40;
    circle(bx, by, 80, g);
    ctx.fillStyle = C.plum; font(900, 60); at(String(r.score), bx, by - 12);
    font(800, 20); at("OUT OF 10", bx, by + 36);
  }
  ctx.textBaseline = "alphabetic";
  y += ps + 50;
  ctx.fillStyle = "rgba(169, 130, 168, 0.5)"; rr(80, y, W - 160, boxH, 24); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = C.amber; ctx.stroke();
  font(800, 26); centered((persona ? persona.pattern : "Case status").toUpperCase(), y + 46, "#fff");
  font(600, 30); roast.forEach((l, i) => centered(l, y + 92 + i * 40, "#fff"));
  y += boxH + 52;
  const footer = r.zones ? ZONES.map(([k, label]) => `${label} ${r.zones![k]}/9`).join("   ") : (r.issues || []).join("  •  ");
  if (footer && y < H - 100) { font(700, 30); centered(footer, y, C.amber); }
  font(500, 26); centered("Caught by Slouch Catcher  |  betterhood.in/slouch-catcher", H - 48, "#f1e6f4");
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.9));
}

/** Phone photos → a small JPEG data URL (keeps uploads light and the AI call cheap). */
export async function toJpeg(file: File, maxSide = 1024): Promise<string> {
  let src: ImageBitmap | HTMLImageElement;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { src = await loadImage(URL.createObjectURL(file)); }
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(src.width * scale), height: Math.round(src.height * scale) });
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
