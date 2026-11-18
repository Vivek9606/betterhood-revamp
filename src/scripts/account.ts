// The visitor's betterhood account on the website. It is the same account as in the betterhood app: one phone
// number, WhatsApp OTP, sessions issued by the Betterhood API (capacitor-app-backend).
//
//   - Sign in / sign up: /account/ (OTP → existing account, or "patient / physio" → patient sign-up here,
//     physio sign-up on /physio-directory/join/).
//   - Website ⇄ app: the API hands out a 2-minute, single-use code (POST /auth/handoff). The website opens the
//     app at …#handoff=<code>, and the app opens the website the same way, so you stay signed in either way.
//     The fragment is never sent to a server, and the code is cleaned from the address bar straight away.
//   - Assessment results taken while signed in are saved to the account; results taken before signing in are
//     saved when you sign in.
// Inside the app's frame (embed mode) none of this runs: the app is the one that's signed in.
import { isEmbedded } from "./embed";
import { href } from "./base";

export const API: string = String(import.meta.env.PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const APP: string = String(import.meta.env.PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
export const accountsOn = () => !!API && !isEmbedded();

export type Role = "patient" | "physio";
export interface Session { token: string; role: Role; userId: string; name?: string; at: number }
export interface Summary {
  role: Role; userId: string; name: string; phone: string;
  // patient
  hasPhysioProfile?: boolean; physioName?: string | null; suggestedPhysioName?: string | null; matchStatus?: string | null; activePlan?: boolean; assessments?: any[]; results?: any[];
  // physio
  hasPatientProfile?: boolean; listing?: { slug: string; status: string; url: string } | null; patients?: number; upcomingBookings?: number; inviteRef?: string; invitedPatients?: number;
}

const KEY = "bh_account";
const SIGNUP_KEY = "bh_signup"; // verified number without an account (physio sign-up continues on the join page)
const SYNCED_KEY = "bh_synced"; // website results already saved to the account
const INVITE_KEY = "bh_invite"; // {ref, name, at}: arrived from a physio's invite link (?physio=<ref>)
const OWNER_KEY = "bh_owner"; // userId whose results/name this browser holds (absent: a guest's, not yet signed in)
// Everything personal this browser keeps for one person. It never outlives that person's session: cleared on sign-out
// and whenever a different account signs in, so the next person on a shared browser can't see it or have it synced
// into their account.
const CONTACT_KEY = "bh_contact"; // {name, phone} typed into the last assessment, so sign-up doesn't ask again
const PERSONAL_KEYS = ["bh_results", "bh_history", "bh_name", CONTACT_KEY, SYNCED_KEY, INVITE_KEY, OWNER_KEY];
function clearPersonal() {
  try { PERSONAL_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
}
const owner = () => { try { return localStorage.getItem(OWNER_KEY); } catch { return null; } };
const setOwner = (id: string) => { try { localStorage.setItem(OWNER_KEY, id); } catch {} };

/** Name and phone typed into the last assessment on this device (to prefill sign-in and sign-up). */
export function lastContact(): { name?: string; phone?: string } {
  try { return JSON.parse(localStorage.getItem(CONTACT_KEY) || "{}") || {}; } catch { return {}; }
}

// ---------- consent ----------
// The exact words shown, stored with a version in the account's consent log. Change the version whenever the words change.
export const CONSENT_VERSION = "web-2026-11-18";
export const CONSENT_WORDING = {
  terms: "I agree to betterhood's Terms of Service and Privacy Policy.",
  share_with_physio: "I agree to share my assessment answers and progress with the physio I'm matched with.",
  whatsapp_updates: "Send me appointment and care updates on WhatsApp.",
} as const;
export type ConsentPurpose = keyof typeof CONSENT_WORDING;
/** The one tick box on patient sign-up (the same words as the app's sign-up). It covers the terms and sharing with the physio. */
export const SIGNUP_CONSENT = "I agree to betterhood's Terms and Privacy Policy, and to share my assessment answers and progress with the physio I'm matched with.";
export const consentItem = (purpose: ConsentPurpose, granted: boolean, wording: string = CONSENT_WORDING[purpose]) => ({ purpose, granted, version: CONSENT_VERSION, wording });
/** Record consents for the signed-in account (e.g. the WhatsApp choice made on the sign-in screen). */
export const recordConsents = (items: ReturnType<typeof consentItem>[]) => call("/me/consents", { body: { consents: items, channel: "web" }, auth: true });

// ---------- physio invite links ----------
export interface Invite { ref: string; name?: string; at: number }
/** The physio whose link brought this visitor here (kept 14 days, the latest link wins). */
export function invite(): Invite | null {
  try {
    const v = JSON.parse(localStorage.getItem(INVITE_KEY) || "null") as Invite | null;
    return v && Date.now() - v.at < 14 * 864e5 ? v : null;
  } catch { return null; }
}
async function captureInvite() {
  const ref = new URLSearchParams(location.search).get("physio")?.trim().toLowerCase();
  if (ref && /^[a-z0-9_-]{2,80}$/.test(ref) && ref !== invite()?.ref) {
    try {
      const r = await call<{ name: string }>(`/public/physio-invite/${encodeURIComponent(ref)}`);
      localStorage.setItem(INVITE_KEY, JSON.stringify({ ref, name: r.name, at: Date.now() }));
    } catch { /* unknown or hidden physio: carry on as a normal visit */ }
  }
  paintInvite();
}
/** Fill every [data-invite] note with the inviting physio's name and show it. */
export function paintInvite() {
  const v = invite();
  document.querySelectorAll<HTMLElement>("[data-invite]").forEach((el) => (el.hidden = !v?.name));
  document.querySelectorAll<HTMLElement>("[data-invite-name]").forEach((el) => (el.textContent = v?.name || "your physio"));
  if (v) document.dispatchEvent(new CustomEvent("bh:invite"));
}

export function session(): Session | null {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); return s?.token ? s : null; } catch { return null; }
}
function save(s: Session | null) {
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch {}
  document.dispatchEvent(new CustomEvent("bh:account", { detail: s }));
}
export function signOut() {
  clearPersonal();
  try { sessionStorage.removeItem("bh_dir_token"); } catch {}
  save(null);
}

export class ApiError extends Error { constructor(msg: string, public status = 0, public code = "") { super(msg); } }

export async function call<T = any>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  if (!API) throw new ApiError("Accounts aren't available right now.");
  const s = session();
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(opts.auth && s ? { Authorization: `Bearer ${s.token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError("Can't reach betterhood. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && opts.auth) signOut();
  if (!res.ok) throw new ApiError(data.message || "Something went wrong. Please try again.", res.status, data.error || data.code || "");
  return data as T;
}

// ---------- sign in ----------
export const cleanPhone = (v: string) => v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
export const validPhone = (p: string) => /^[6-9]\d{9}$/.test(p);
export const requestCode = (phone: string) => call("/auth/otp/request", { body: { phone } });

/** OTP check. Existing account → signed in. New number → a sign-up token (pick patient or physio next). */
export async function verifyCode(phone: string, code: string): Promise<{ signedIn: true; role: Role } | { signedIn: false; signupToken: string }> {
  const r = await call<{ token?: string; role?: Role; userId?: string; signupToken?: string }>("/auth/otp/verify", { body: { phone, code } });
  if (r.signupToken) {
    try { sessionStorage.setItem(SIGNUP_KEY, JSON.stringify({ token: r.signupToken, phone, at: Date.now() })); } catch {}
    return { signedIn: false, signupToken: r.signupToken };
  }
  await startSession({ token: r.token!, role: r.role!, userId: r.userId! });
  return { signedIn: true, role: r.role! };
}

export async function signUpPatient(input: { signupToken: string; name: string; age?: number; sex?: "F" | "M" | "O"; city?: string; consents: ReturnType<typeof consentItem>[] }) {
  const r = await call<{ token: string; role: Role; userId: string }>("/auth/signup-patient", { body: { ...input, channel: "web" } });
  try { sessionStorage.removeItem(SIGNUP_KEY); } catch {}
  await startSession({ token: r.token, role: r.role, userId: r.userId });
}

/** The verified-but-new number, for the physio join page (valid 30 minutes on the server). */
export function pendingSignup(): { token: string; phone: string } | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SIGNUP_KEY) || "null");
    return s && Date.now() - s.at < 25 * 60 * 1000 ? s : null;
  } catch { return null; }
}
export function clearPendingSignup() { try { sessionStorage.removeItem(SIGNUP_KEY); } catch {} }

/** Called with any new session token (sign in, sign up, join page, handoff). */
export async function startSession(s: Omit<Session, "at">) {
  // Another account's data in this browser (signed in before without signing out, or switched via the app):
  // drop it before anything reads or syncs it. A guest's results (no owner yet) are this person's and get saved.
  const prev = session();
  const held = owner();
  if ((held && held !== s.userId) || (prev && prev.userId !== s.userId)) clearPersonal();
  cached = null;
  save({ ...s, at: Date.now() });
  try { const me = await summary(true); save({ ...s, name: me.name, at: Date.now() }); } catch {}
  if (s.role === "patient") { await syncResults(); await pullResults(); }
  setOwner(s.userId);
}

let cached: Promise<Summary> | null = null;
export function summary(fresh = false): Promise<Summary> {
  if (!cached || fresh) cached = call<Summary>("/me/summary", { auth: true });
  return cached;
}

// ---------- website ⇄ app ----------
async function handoffCode(): Promise<string | null> {
  if (!session()) return null;
  try { return (await call<{ code: string }>("/auth/handoff", { method: "POST", body: {}, auth: true })).code; } catch { return null; }
}

/** Open the app signed in as this account (falls back to the app's own sign-in). `extra` adds fragment params. */
export async function openApp(path = "/", extra = "") {
  if (!APP) return;
  const code = await handoffCode();
  const frag = [code && `handoff=${code}`, extra].filter(Boolean).join("&");
  location.href = `${APP}${path}${frag ? `#${frag}` : ""}`;
}

/** Every link marked data-open-app="/path" opens the app signed in (a normal link to the app without JS). */
export function wireAppLinks(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLAnchorElement>("[data-open-app]").forEach((a) => {
    if (a.dataset.wired) return;
    a.dataset.wired = "1";
    if (!APP) { a.hidden = true; return; }
    a.href = `${APP}${a.dataset.openApp || "/"}`;
    a.addEventListener("click", (e) => {
      if (!session()) return; // plain link: the app shows its own sign-in
      e.preventDefault();
      openApp(a.dataset.openApp || "/", a.dataset.extra || "");
    });
  });
}

/** Arriving from the app with #handoff=…: sign in here too. */
async function takeHandoff() {
  const m = /(?:^#|&)handoff=([A-Za-z0-9_-]{20,64})/.exec(location.hash);
  if (!m) return;
  const rest = location.hash.slice(1).split("&").filter((p) => !p.startsWith("handoff=")).join("&");
  history.replaceState(history.state, "", location.pathname + location.search + (rest ? `#${rest}` : ""));
  try {
    const r = await call<{ token: string; role: Role; userId: string }>("/auth/handoff/redeem", { body: { code: m[1] } });
    await startSession(r);
  } catch {}
}

// ---------- assessment results ----------
type SiteResult = Record<string, any> & { slug?: string; kind?: string; date?: string };
const r1 = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 10) / 10 : null);
/** A result's id: its own (results taken from 2026-11-18 on carry one everywhere), else derived from slug and date. */
function resultId(slug: string, date: string, own?: unknown) {
  if (typeof own === "string" && /^as_[a-z0-9]{6,24}$/.test(own)) return own;
  let h = 0;
  for (const c of `${slug}|${date}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const t = (Date.parse(date) || 0).toString(36);
  return `as_w${h.toString(36)}${t}`.replace(/[^a-z0-9_]/g, "").slice(0, 27);
}
function toInput(slug: string, r: SiteResult) {
  const base = {
    id: resultId(slug, r.date || "", r.id), slug, kind: r.kind || "pain", area: r.area, title: String(r.title || slug).slice(0, 120), source: "web", invitedBy: invite()?.ref,
    answers: Array.isArray(r.answers) && r.answers.length ? r.answers : undefined, painScore: typeof r.painScore === "number" ? r.painScore : undefined,
    advisoryReasons: Array.isArray(r.advisoryReasons) && r.advisoryReasons.length ? r.advisoryReasons : undefined,
    takenAt: r.date || undefined, formVersion: typeof r.formVersion === "string" ? r.formVersion : undefined,
  };
  if ((r.kind || "pain") === "pain") {
    return { ...base, kind: "pain", cat: r.cat, condition: r.condition, result: r.result, advisory: r.advisory ? "Critical advisory" : undefined, totals: Object.fromEntries((r.totals || []).map((t: any) => [t.cat, r1(t.score) ?? 0])) };
  }
  return { ...base, totals: {}, scores: { overall: r1(r.overall), strength: r1(r.strength), balance: r1(r.balance), mobility: r1(r.mobility) } };
}

/** Save one result (slug + the AssessmentRunner record) to the signed-in patient. true = saved (or already there). */
export async function saveResult(slug: string, r: SiteResult): Promise<boolean> {
  const s = session();
  if (!s || s.role !== "patient") return false;
  const input = toInput(slug, r);
  try { await call("/patient/assessments", { body: input, auth: true }); }
  catch (e) { if ((e as ApiError).code !== "exists") return false; }
  try { const done = JSON.parse(localStorage.getItem(SYNCED_KEY) || "[]"); localStorage.setItem(SYNCED_KEY, JSON.stringify([...new Set([...done, input.id])].slice(-80))); } catch {}
  return true;
}

/** Results taken on this device before signing in → the account. */
export async function syncResults() {
  let all: Record<string, SiteResult> = {}, done: string[] = [];
  try { all = JSON.parse(localStorage.getItem("bh_results") || "{}"); done = JSON.parse(localStorage.getItem(SYNCED_KEY) || "[]"); } catch {}
  for (const [slug, r] of Object.entries(all)) {
    if (!/^assessment-/.test(slug) || !r?.area || done.includes(resultId(slug, r.date || "", r.id))) continue;
    await saveResult(slug, r);
  }
}

/** An account result in the shape the website keeps in bh_results / bh_history (what the betterYou corner reads). */
function toLocal(a: any): SiteResult {
  const base = { id: a.id, slug: a.slug, kind: a.kind || "pain", area: a.area, title: a.title, date: a.takenAt || a.createdAt };
  if (base.kind === "pain") {
    return { ...base, cat: a.cat, condition: a.condition, result: a.result, advisory: !!a.advisory, painScore: a.painScore, totals: Object.entries(a.totals || {}).map(([cat, score]) => ({ cat, score })) };
  }
  const s = a.scores || {};
  return { ...base, overall: s.overall ?? null, strength: s.strength ?? null, balance: s.balance ?? null, mobility: s.mobility ?? null };
}

/**
 * The signed-in patient's results (from any device, the app included) → this browser, so the betterYou corner shows
 * them. The newest result per assessment wins; history gains any run it doesn't have. true = something changed.
 */
export async function pullResults(): Promise<boolean> {
  const s = session();
  if (!accountsOn() || !s || s.role !== "patient") return false;
  let list: any[] = [];
  try { list = (await summary(true)).results ?? []; } catch { return false; }
  if (!list.length) return false;
  let store: Record<string, SiteResult> = {}, history: SiteResult[] = [], done: string[] = [];
  try {
    store = JSON.parse(localStorage.getItem("bh_results") || "{}");
    history = JSON.parse(localStorage.getItem("bh_history") || "[]");
    done = JSON.parse(localStorage.getItem(SYNCED_KEY) || "[]");
  } catch {}
  const t = (d?: string) => Date.parse(d || "") || 0;
  let changed = false;
  for (const a of list) {
    if (!a?.slug || !/^assessment-/.test(a.slug)) continue;
    const r = toLocal(a);
    const cur = store[a.slug];
    // Same result already here (this device took it): keep the local copy, it has more detail.
    if (!cur || (cur.id !== a.id && t(cur.date) < t(r.date))) { store[a.slug] = r; changed = true; }
    if (!history.some((h) => h.id === a.id || (h.slug === a.slug && h.date === r.date))) { history.push(r); changed = true; }
    if (!done.includes(a.id)) done.push(a.id);
  }
  if (!changed) return false;
  history.sort((x, y) => t(x.date) - t(y.date));
  try {
    localStorage.setItem("bh_results", JSON.stringify(store));
    localStorage.setItem("bh_history", JSON.stringify(history.slice(-60)));
    localStorage.setItem(SYNCED_KEY, JSON.stringify(done.slice(-80)));
  } catch {}
  return true;
}

// ---------- results taken with this number elsewhere ----------
// Results typed with this phone on another device (or before signing up). Shown by title and date until the person
// confirms they're theirs; "not mine" hides them for good.
export interface WebResult { id: string; slug: string; title: string; takenAt: string }
export const webResults = () => call<{ results: WebResult[] }>("/patient/web-results", { auth: true }).then((r) => r.results);
export const resolveWebResults = (claim: string[], disown: string[]) => call("/patient/web-results", { body: { claim, disown }, auth: true });

// ---------- header ----------
/** "Dr. Ananya Rao" → "Dr. Ananya", "Riya Sharma" → "Riya". */
export const shortName = (n?: string) => {
  const w = (n || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "there";
  return /^dr\.?$/i.test(w[0]) && w[1] ? `Dr. ${w[1]}` : w[0];
};
const initials = (n?: string) => (n || "").replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "•";

function paintHeader() {
  const s = session();
  document.querySelectorAll<HTMLElement>("[data-account-btn]").forEach((b) => {
    const label = b.querySelector<HTMLElement>("[data-account-label]");
    b.classList.toggle("is-in", !!s);
    if (label) label.textContent = s ? initials(s.name) : "";
    b.setAttribute("aria-label", s ? `Your account${s.name ? `: ${s.name}` : ""}` : "Sign in");
  });
  document.querySelectorAll<HTMLElement>("[data-signed-in]").forEach((el) => (el.hidden = !s));
  document.querySelectorAll<HTMLElement>("[data-signed-out]").forEach((el) => (el.hidden = !!s));
  document.querySelectorAll<HTMLElement>("[data-account-name]").forEach((el) => (el.textContent = shortName(s?.name)));
  document.querySelectorAll<HTMLElement>("[data-role-only]").forEach((el) => (el.hidden = !s || el.dataset.roleOnly !== s.role));
}

export function boot() {
  if (API) captureInvite();
  if (!accountsOn()) {
    document.querySelectorAll<HTMLElement>("[data-account-ui]").forEach((el) => (el.hidden = true));
    return;
  }
  document.documentElement.classList.add("has-accounts");
  // Browsers signed in before data had an owner (or holding another account's data): we can't tell whose the
  // saved results are, so drop them once. The account's own results are on the server and show on /account/.
  const me = session();
  if (me && owner() !== me.userId) { clearPersonal(); setOwner(me.userId); }
  paintHeader();
  document.addEventListener("bh:account", paintHeader);
  addEventListener("storage", (e) => { if (e.key === KEY) paintHeader(); });
  wireAppLinks();
  takeHandoff();
  // keep the cached name fresh, at most once a day
  const s = session();
  if (s && Date.now() - s.at > 864e5) summary(true).then((me) => save({ ...s, name: me.name, at: Date.now() })).catch(() => {});
}

export const accountHref = (next?: string) => href(`/account/${next ? `?next=${encodeURIComponent(next)}` : ""}`);
