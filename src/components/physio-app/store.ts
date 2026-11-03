// State for the physio app (/physio-app/). Everything lives in localStorage for now. The calls the real
// backend will own (OTP, listing match, document review, article assignment, editorial decisions) are
// isolated in `api`; what admins and editors do in WordPress is simulated by `backstage`.
import { useSyncExternalStore } from "react";
import { native } from "./bridge";

export type VerifyStatus = "none" | "pending" | "verified" | "rejected";
export type ReviewStatus = "assigned" | "with-editor" | "re-review" | "approved" | "declined";
export type IdeaStatus = "submitted" | "clarify" | "declined" | "accepted" | "drafting" | "editorial" | "final" | "published";
export type Milestone = "verified" | "live" | "published";

export interface Doc { kind: "iap" | "council"; name: string; size: number; preview?: string; lowRes?: boolean }
export interface Profile {
  slug?: string; // linked betterhood.in listing
  name: string; degree: string; image: string; years: number;
  specialities: string[]; clinic: string; city: string; locality: string;
  hours: string; bio: string; regNo: string; regCouncil: string;
}
export interface Comment { para: number; quote: string; text: string; resolved?: boolean }
export interface Review {
  slug: string; title: string; image: string; excerpt: string; minutes: number; topic: string; due: string;
  status: ReviewStatus; version: number; comments: Comment[]; reason?: string; decidedAt?: string; read?: number;
}
export interface Idea {
  id: string; question: string; context: string; tags: string[]; status: IdeaStatus; at: string; updatedAt: string;
  writer?: "me" | "team"; draft?: string; ask?: string; answer?: string; reason?: string;
}
export interface Note { id: string; title: string; body: string; at: string; to?: string; read?: boolean; tone?: "ok" | "wt" | "no" }

export interface State {
  invite?: string;
  phone?: string;
  phoneVerified?: boolean;
  consentAt?: string;
  linked?: boolean | null; // true: claimed a listing, null: started fresh
  profile: Profile;
  verification: { status: VerifyStatus; docs: Doc[]; reason?: string; submittedAt?: string; decidedAt?: string };
  reviews: Review[];
  ideas: Idea[];
  notes: Note[];
  celebrated: Milestone[];
  saved: string[]; // bookmarked peers
  prefs: { push: boolean; whatsapp: boolean };
}

// Directory row, as served at /physios-index.json
export interface Row { s: string; n: string; g: string; i: string; p: string; y: number; c: string; st: string; a: string[]; sp: string[]; m: string[]; f: string }
// Article row, as served at /posts-index.json
export interface Post { s: string; t: string; d: string; e: string; i: string; c: string[]; h: string[]; m: number }

const KEY = "bh-physio-app:v2";
const blankProfile: Profile = { name: "", degree: "", image: "", years: 0, specialities: [], clinic: "", city: "", locality: "", hours: "", bio: "", regNo: "", regCouncil: "" };
const initial = (): State => ({
  profile: { ...blankProfile }, verification: { status: "none", docs: [] }, reviews: [], ideas: [], notes: [],
  celebrated: [], saved: [], prefs: { push: true, whatsapp: true },
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial(), ...JSON.parse(raw) };
  } catch {}
  return initial();
}

let state: State = typeof window === "undefined" ? initial() : load();
const subs = new Set<() => void>();

export function set(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  subs.forEach((f) => f());
}
export const get = () => state;
export function reset(keep: Partial<State> = {}) {
  state = { ...initial(), ...keep };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  subs.forEach((f) => f());
}
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, get, get);

/* ---------- derived ---------- */

export interface Field { key: keyof Profile | "location"; label: string; hint: string; mins: number; done: (p: Profile) => boolean }
export const FIELDS: Field[] = [
  { key: "image", label: "Photo", hint: "Profiles with a face get chosen first", mins: 1, done: (p) => !!p.image },
  { key: "name", label: "Name and qualifications", hint: "As on your registration", mins: 1, done: (p) => !!p.name && !!p.degree },
  { key: "specialities", label: "Specialities", hint: "Also decides which articles you review", mins: 1, done: (p) => p.specialities.length > 0 },
  { key: "clinic", label: "Clinic", hint: "Where patients can find you", mins: 1, done: (p) => !!p.clinic },
  { key: "location", label: "City and locality", hint: "Puts you in local search", mins: 1, done: (p) => !!p.city && !!p.locality },
  { key: "hours", label: "Working hours", hint: "So patients know when to come", mins: 1, done: (p) => !!p.hours },
  { key: "bio", label: "About you", hint: "The first thing patients read", mins: 2, done: (p) => p.bio.trim().length >= 60 },
  { key: "regNo", label: "Registration", hint: "Shown as proof of practice", mins: 1, done: (p) => !!p.regNo && !!p.regCouncil },
];
export const missing = (p: Profile) => FIELDS.filter((f) => !f.done(p));
export const strength = (p: Profile) => Math.round(((FIELDS.length - missing(p).length) / FIELDS.length) * 100);
export const isComplete = (p: Profile) => missing(p).length === 0;
export const isLive = (s: State) => s.verification.status === "verified" && isComplete(s.profile);
export const initials = (name: string) => name.replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
export const firstName = (name: string) => name.replace(/^dr\.?\s*/i, "").split(/\s+/)[0] || "";
export const titleCase = (slug = "") => slug.split("-").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
export const shortDegree = (d: string) => d.split(/\s+-\s+|,/)[0].trim();
export const byline = (p: Profile) => `${p.name}${p.degree ? `, ${shortDegree(p.degree)}` : ""}`;
export const localityOf = (r: Row) => (r.a[0] ? titleCase(r.a[0].replace(new RegExp(`^${r.c}-`), "")) : "");

/* ---------- data ---------- */

let rows: Promise<Row[]> | null = null;
let posts: Promise<Post[]> | null = null;
export const physios = () => (rows ??= fetch("/physios-index.json").then((r) => r.json()));
export const articles = () => (posts ??= fetch("/posts-index.json").then((r) => r.json()));

// Article body, read from the published page so the reviewer sees exactly what's live.
export interface Block { tag: "p" | "h2" | "h3" | "li"; text: string }
const bodies = new Map<string, Promise<Block[]>>();
export function articleBody(slug: string) {
  if (!bodies.has(slug)) {
    bodies.set(slug, fetch(`/learn/${slug}/`).then((r) => r.text()).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return [...doc.querySelectorAll(".prose :is(p, h2, h3, li)")]
        .filter((el) => !el.closest("li") || el.tagName === "LI")
        .map((el) => ({ tag: el.tagName.toLowerCase() as Block["tag"], text: (el.textContent || "").replace(/\s+/g, " ").trim() }))
        .filter((b) => b.text.length > 1);
    }).catch(() => []));
  }
  return bodies.get(slug)!;
}

export function notify(title: string, body: string, to?: string, tone?: Note["tone"]) {
  const n: Note = { id: Math.random().toString(36).slice(2), title, body, at: new Date().toISOString(), to, tone };
  set((s) => ({ notes: [n, ...s.notes].slice(0, 40) }));
  native.notify(title, body, to);
}

// Speciality wording on listings is free text, so map it onto the health concerns articles are tagged with.
function concernsFor(sp: string[]) {
  const t = sp.join(" ").toLowerCase();
  const out = new Set<string>();
  if (/spine|back|lumbar|disc/.test(t)) out.add("back-pain");
  if (/neck|cervical|posture/.test(t)) out.add("neck-pain");
  if (/knee|acl|sport/.test(t)) out.add("knee-pain");
  if (/shoulder|sport/.test(t)) out.add("shoulder-pain");
  if (/ortho|musculo|msk|geriatric|joint/.test(t)) ["back-pain", "knee-pain", "joint-pain"].forEach((c) => out.add(c));
  if (!out.size) ["back-pain", "neck-pain", "knee-pain"].forEach((c) => out.add(c));
  return [...out];
}

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
const now = () => new Date().toISOString();

/* ---------- api: replace with backend calls ---------- */

// Demo invite tokens. On the real system the token is minted when the invite is sent and maps to a phone.
export const DEMO_INVITES: Record<string, { slug: string; phone: string }> = { "ps-48k2": { slug: "dr-vivek-r-daware", phone: "9876543210" } };
export const inviteFor = (token?: string) => (token ? DEMO_INVITES[token] : undefined);

export const api = {
  async listingForInvite(token?: string): Promise<Row | null> {
    const inv = inviteFor(token);
    if (!inv) return null;
    return (await physios()).find((r) => r.s === inv.slug) ?? null;
  },
  async sendOtp(phone: string) {
    set(() => ({ phone }));
    return { ok: /^[6-9]\d{9}$/.test(phone) };
  },
  // Demo: any 6 digits pass.
  async verifyOtp(code: string) {
    await new Promise((r) => setTimeout(r, 450));
    const ok = /^\d{6}$/.test(code);
    if (ok) set(() => ({ phoneVerified: true, consentAt: now() }));
    return { ok };
  },
  async searchListings(q: string) {
    const t = q.trim().toLowerCase().replace(/^dr\.?\s*/, "");
    if (t.length < 2) return [];
    const all = await physios();
    return all.filter((r) => r.n.toLowerCase().includes(t)).sort((a, b) => Number(!!b.i) - Number(!!a.i)).slice(0, 8);
  },
  claim(r: Row, take: Record<"photo" | "basics" | "specialities" | "location", boolean>) {
    set((s) => ({
      linked: true,
      profile: {
        ...s.profile, slug: r.s,
        ...(take.photo ? { image: r.i } : {}),
        ...(take.basics ? { name: r.n, degree: r.g, years: r.y } : {}),
        ...(take.specialities ? { specialities: r.sp.filter((x) => !/^physiotherap(ist|y)$/i.test(x)).slice(0, 4) } : {}),
        ...(take.location ? { city: r.c ? titleCase(r.c) : r.p.split(",")[0], locality: localityOf(r) } : {}),
      },
    }));
  },
  startFresh() {
    set(() => ({ linked: null }));
  },
  submitDocs(docs: Doc[], regNo: string) {
    set((s) => ({
      verification: { status: "pending", docs: docs.map(({ preview, ...d }) => d), submittedAt: now() },
      profile: { ...s.profile, regNo: regNo || s.profile.regNo },
    }));
  },
  saveProfile(patch: Partial<Profile>) {
    const wasLive = isLive(state);
    set((s) => ({ profile: { ...s.profile, ...patch } }));
    if (!wasLive && isLive(state)) {
      notify("You're live on betterhood.in", "Patients can now find your profile. Share it from your profile tab.", "#/me", "ok");
      api.assignReviews();
    }
  },
  // Content team assigns existing articles by speciality (done in WordPress on the real system).
  async assignReviews() {
    if (state.reviews.length) return;
    const want = concernsFor(state.profile.specialities);
    const list = (await articles()).filter((p) => p.c.includes("articles") && p.h.some((h) => want.includes(h)));
    const picked = want.flatMap((h) => list.filter((p) => p.h.includes(h)).slice(0, 1)).concat(list).filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
    set(() => ({
      reviews: picked.map((p, i) => ({ slug: p.s, title: p.t, image: p.i, excerpt: p.e, minutes: p.m, topic: titleCase(p.h[0]), due: inDays(3 + i * 4), status: "assigned", version: 1, comments: [] })),
    }));
    if (picked.length) notify(`${picked.length} articles picked for you`, `Matched to your specialities. First up: “${picked[0].t}”.`, "#/studio");
  },
  updateReview(slug: string, patch: Partial<Review>) {
    set((s) => ({ reviews: s.reviews.map((r) => (r.slug === slug ? { ...r, ...patch } : r)) }));
  },
  decide(slug: string, status: "approved" | "with-editor" | "declined", reason?: string) {
    api.updateReview(slug, { status, reason, decidedAt: now() });
    const r = state.reviews.find((x) => x.slug === slug)!;
    if (status === "approved") setTimeout(() => notify("Your review is live", `“${r.title}” now shows you as the clinical reviewer.`, `#/review/${slug}`, "ok"), 2200);
  },
  submitIdea(i: Pick<Idea, "question" | "context" | "tags">) {
    const id = Math.random().toString(36).slice(2, 8);
    set((s) => ({ ideas: [{ ...i, id, status: "submitted", at: now(), updatedAt: now() }, ...s.ideas] }));
    return id;
  },
  updateIdea(id: string, patch: Partial<Idea>) {
    set((s) => ({ ideas: s.ideas.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) }));
  },
};

/* ---------- backstage: what the Betterhood team does in WordPress ---------- */

export const DEMO = import.meta.env.PUBLIC_PHYSIO_APP_DEMO !== "false";

export const backstage = {
  verify(ok: boolean) {
    set((s) => ({ verification: { ...s.verification, status: ok ? "verified" : "rejected", decidedAt: now(), reason: ok ? undefined : "The photo of your IAP card is too blurry to read the membership number." } }));
    if (ok) notify("You're verified", isComplete(state.profile) ? "Your badge is live." : "Your badge is live. Finish your profile to appear on betterhood.in.", "#/today", "ok");
    else notify("Your document needs another look", "The photo was too blurry to read. Re-upload takes a minute.", "#/badge", "no");
    api.saveProfile({});
  },
  editorReturns(slug: string) {
    set((s) => ({ reviews: s.reviews.map((r) => (r.slug === slug ? { ...r, status: "re-review", version: r.version + 1, comments: r.comments.map((c) => ({ ...c, resolved: true })) } : r)) }));
    notify("Your notes were addressed", "The editor updated the article. Take a final look.", `#/review/${slug}`, "wt");
  },
  idea(id: string, status: IdeaStatus, extra: Partial<Idea> = {}) {
    api.updateIdea(id, { status, ...extra });
    const i = state.ideas.find((x) => x.id === id)!;
    const msg: Partial<Record<IdeaStatus, [string, Note["tone"]]>> = {
      accepted: ["was accepted. Choose who writes it.", "ok"], clarify: ["needs one more detail from you.", "wt"],
      declined: ["won't be taken forward this time.", "no"], final: ["is ready for your sign-off.", "wt"],
    };
    if (msg[status]) notify("Update on your idea", `“${i.question}” ${msg[status]![0]}`, `#/idea/${id}`, msg[status]![1]);
  },
  // Jump straight to a stage of the journey, for demos.
  async seed(stage: "fresh" | "pending" | "verified" | "live" | "idea") {
    const keep = { invite: state.invite };
    if (stage === "fresh") return reset(keep);
    const r = (await physios()).find((x) => x.s === DEMO_INVITES["ps-48k2"].slug)!;
    reset({ ...keep, phone: DEMO_INVITES["ps-48k2"].phone, phoneVerified: true, consentAt: now() });
    api.claim(r, { photo: true, basics: true, specialities: true, location: true });
    api.submitDocs([{ kind: "iap", name: "iap_card.jpg", size: 412_000 }], "");
    if (stage === "pending") return;
    set((s) => ({ verification: { ...s.verification, status: "verified", decidedAt: now() }, celebrated: ["verified"] }));
    if (stage === "verified") return;
    set((s) => ({ profile: { ...s.profile, clinic: "MoveWell Physio", hours: "Mon–Sat · 9 am – 7 pm", regNo: "MH/PT/2017/04821", regCouncil: "Maharashtra State OT & PT Council", specialities: s.profile.specialities.length ? s.profile.specialities : ["Spine", "Sports injuries"], bio: bioDraft(s.profile) }, celebrated: ["verified", "live"] }));
    await api.assignReviews();
    if (stage === "idea") {
      const id = api.submitIdea({ question: "Is it safe to run with knee osteoarthritis?", context: "Patients over 45 with early OA ask this every week.", tags: ["Knee", "Exercise"] });
      api.updateIdea(id, { status: "final", writer: "team" });
    }
  },
};

/* ---------- writing helpers ---------- */

export function bioDraft(p: Profile) {
  const sp = p.specialities.slice(0, 2).map((x) => x.toLowerCase());
  const focus = sp.length ? ` focused on ${sp.join(" and ")}` : "";
  const exp = p.years ? ` with ${p.years} years of experience` : "";
  const where = p.city ? ` in ${p.city}` : "";
  return `I'm a physiotherapist${where}${exp}${focus}. I combine hands-on treatment with clear home programmes, so you understand your recovery and stay pain-free long after our sessions end.`;
}

// Things that could identify a patient. Flagged live while typing, and block submission.
export function piiIn(text: string) {
  const hits: string[] = [];
  if (/(\+91[\s-]?)?\b[6-9]\d{4}\s?\d{5}\b/.test(text)) hits.push("a phone number");
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) hits.push("an email address");
  if (/\b(mr|mrs|ms|miss|master|smt|shri)\.?\s+[A-Z][a-z]+/.test(text)) hits.push("a name");
  if (/\b(my patient|patient)\s+[A-Z][a-z]{2,}\b/.test(text)) hits.push("a name");
  if (/\b(aadhaar|aadhar|uhid|mrn|ip no)\b/i.test(text)) hits.push("an ID number");
  return [...new Set(hits)];
}

const STOP = new Set("a an the is it to of for with and or in on at my your can do does what why how when should i you be are am after before during from about this that than then they them their safe best good bad".split(" "));
export const keywords = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

export async function similarArticles(q: string) {
  const k = keywords(q);
  if (k.length < 2) return [];
  const all = await articles();
  return all
    .map((p) => { const t = keywords(p.t); return { p, score: k.filter((w) => t.some((x) => x.startsWith(w.slice(0, 5)))).length }; })
    .filter((x) => x.score >= Math.min(2, k.length))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.p);
}

export const TOPICS = ["Back", "Neck", "Knee", "Shoulder", "Foot", "Exercise", "Posture", "Pain", "Women's health", "Sports"] as const;
export function suggestTopics(t: string): string[] {
  const s = t.toLowerCase();
  const map: [string, RegExp][] = [["Back", /back|lumbar|spine|disc|sciatica/], ["Neck", /neck|cervical/], ["Knee", /knee|acl|menisc|patella|oa\b|osteoarthritis/], ["Shoulder", /shoulder|rotator|frozen/], ["Foot", /foot|feet|heel|plantar|ankle/], ["Exercise", /run|exercise|gym|walk|yoga|stretch|strength/], ["Posture", /posture|desk|sitting|slouch/], ["Pain", /pain|ache|sore/], ["Women's health", /pregnan|postnatal|antenatal|menopause/], ["Sports", /sport|cricket|football|athlete|marathon/]];
  return map.filter(([, re]) => re.test(s)).map(([k]) => k);
}
