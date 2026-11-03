// The physiotherapist app as one mobile-first page. Screens are hash routes (#/today, #/review/<slug>…),
// so browser history doubles as the back stack, including the Android back button in the native shell.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEMO, backstage, get, isLive, set, useStore, type Milestone, type Note } from "./store";
import { native } from "./bridge";
import { Btn, Confetti, Sheet, Tick, go } from "./ui";
import { Icon } from "./icons";
import { Claim, Intro, Phone } from "./Onboarding";
import { Verify } from "./Badge";
import { Inbox, Today } from "./Today";
import { Me } from "./Me";
import { Network, Peer } from "./Network";
import { Composer, IdeaView, Reader, Studio } from "./Studio";

const PUBLIC = ["intro", "phone"];
const TABS = ["today", "studio", "network", "me"];

function entry() {
  const s = get();
  if (!s.phoneVerified) return "#/intro";
  if (s.linked === undefined) return "#/claim";
  if (s.verification.status === "none" && !s.verification.submittedAt && !s.notes.length && !sessionStorage.getItem("pa-skip-badge")) return "#/badge";
  return "#/today";
}

// Which way the screen should slide, from a small in-memory stack of visited routes.
const stack: string[] = [];
function direction(from: string, to: string): "fwd" | "back" | "tab" | "none" {
  const root = (h: string) => h.replace(/^#\/?/, "").split("/")[0];
  if (root(from) === root(to) && (root(to) === "me")) return "none";
  if (TABS.includes(root(from)) && TABS.includes(root(to))) { stack.length = 0; stack.push(to); return "tab"; }
  if (stack.length > 1 && stack[stack.length - 2] === to) { stack.pop(); return "back"; }
  stack.push(to);
  return "fwd";
}

function useRoute() {
  const [r, setR] = useState(() => ({ hash: location.hash, dir: "none" as ReturnType<typeof direction> }));
  useEffect(() => {
    stack.push(location.hash);
    const on = () => setR((prev) => ({ hash: location.hash, dir: direction(prev.hash, location.hash) }));
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return r;
}

/* ---------- toast: new notifications slide in from the top ---------- */

function Toast() {
  const { notes } = useStore();
  const seen = useRef(new Set(notes.map((n) => n.id)));
  const [shown, setShown] = useState<Note | null>(null);
  useEffect(() => {
    const fresh = notes.find((n) => !seen.current.has(n.id));
    notes.forEach((n) => seen.current.add(n.id));
    if (!fresh) return;
    setShown(fresh);
    const t = setTimeout(() => setShown(null), 5000);
    return () => clearTimeout(t);
  }, [notes]);
  if (!shown) return null;
  return (
    <button className={`pa-toast ${shown.tone ?? ""}`} role="status" aria-live="polite" onClick={() => { setShown(null); if (shown.to) go(shown.to); }}>
      <span className="ic"><img src="/img/mark.svg" alt="" /></span>
      <span className="grow"><b>{shown.title}</b><small>{shown.body}</small></span>
      <time>now</time>
    </button>
  );
}

/* ---------- milestone moments ---------- */

const MOMENTS: Record<Milestone, { title: string; body: string; cta: string; to: string }> = {
  verified: { title: "You're verified", body: "Your badge now appears on your profile, and on every article you review.", cta: "See my badge", to: "#/me" },
  live: { title: "You're live on betterhood.in", body: "Patients searching in your area can now find you. Share your profile to get started.", cta: "Share my profile", to: "#/me/share" },
  published: { title: "Your name is on the science", body: "Your first article is live with your byline and a link to your profile.", cta: "Back to Studio", to: "#/studio" },
};

function Celebrate() {
  const s = useStore();
  const reached: Milestone[] = [];
  if (s.verification.status === "verified") reached.push("verified");
  if (isLive(s)) reached.push("live");
  if (s.reviews.some((r) => r.status === "approved") || s.ideas.some((i) => i.status === "published")) reached.push("published");
  const m = reached.find((x) => !s.celebrated.includes(x));
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!m) return setReady(false); const t = setTimeout(() => { setReady(true); native.haptic("success"); }, 900); return () => clearTimeout(t); }, [m]);
  if (!m || !ready || !s.phoneVerified) return null;
  const done = (to?: string) => { set((st) => ({ celebrated: [...st.celebrated, m] })); if (to) go(to); };
  const c = MOMENTS[m];
  return (
    <div className="pa-moment" role="dialog" aria-modal="true" aria-labelledby="pa-moment-t">
      <Confetti />
      <div className="pa-moment-card">
        <span className="pa-moment-badge">{m === "verified" ? <Tick size={64} /> : m === "live" ? <Icon name="eye" size={44} /> : <Icon name="book" size={44} />}</span>
        <h2 id="pa-moment-t">{c.title}</h2>
        <p>{c.body}</p>
        <Btn onClick={() => done(c.to)}>{c.cta}</Btn>
        <Btn kind="quiet" onClick={() => done()}>Later</Btn>
      </div>
    </div>
  );
}

/* ---------- backstage: the Betterhood team's side, for demos ---------- */

function setTheme(t: "light" | "dark" | "system") {
  try { localStorage.setItem("pa-theme", t); } catch {}
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

function Backstage() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const pendingIdeas = s.ideas.filter((i) => i.status === "submitted" || i.status === "editorial");
  const withEditor = s.reviews.filter((r) => r.status === "with-editor");
  const act = (fn: () => void) => { fn(); setOpen(false); native.haptic(); };
  const actions = [
    ...(s.verification.status === "pending" ? [
      { k: "v1", label: "Approve verification", sub: "Verification team", fn: () => backstage.verify(true) },
      { k: "v2", label: "Reject: blurry document", sub: "Verification team", fn: () => backstage.verify(false) },
    ] : []),
    ...withEditor.map((r) => ({ k: r.slug, label: "Send revised article back", sub: r.title, fn: () => backstage.editorReturns(r.slug) })),
    ...pendingIdeas.flatMap((i) => i.status === "submitted" ? [
      { k: i.id + "a", label: "Accept idea", sub: i.question, fn: () => backstage.idea(i.id, "accepted") },
      { k: i.id + "c", label: "Ask a question", sub: i.question, fn: () => backstage.idea(i.id, "clarify", { ask: "Which age group do you see asking this most often?" }) },
      { k: i.id + "d", label: "Decline idea", sub: i.question, fn: () => backstage.idea(i.id, "declined", { reason: "We already cover this in “Running with knee pain”. We'd love your review of it instead." }) },
    ] : [
      { k: i.id + "f", label: "Finish editorial + clinical review", sub: i.question, fn: () => backstage.idea(i.id, "final") },
    ]),
  ];
  const stages: [Parameters<typeof backstage.seed>[0], string][] = [["fresh", "Fresh invite"], ["pending", "Waiting on verification"], ["verified", "Verified, profile gaps"], ["live", "Live with reviews"], ["idea", "Idea needs sign-off"]];
  const theme = (() => { try { return localStorage.getItem("pa-theme") || "system"; } catch { return "system"; } })();

  return (
    <>
      <button className={`pa-backstage-fab ${actions.length ? "has" : ""}`} onClick={() => setOpen(true)} aria-label={`Backstage${actions.length ? `, ${actions.length} actions` : ""}`}>
        <Icon name="stage" size={18} />{actions.length > 0 && <i>{actions.length}</i>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Backstage">
        <p className="pa-muted">Plays the Betterhood team's part, which lives in WordPress. Not part of the physio's app.</p>
        <p className="pa-label">Team actions</p>
        {actions.length ? (
          <div className="pa-bs-actions">{actions.map((a) => <button key={a.k} onClick={() => act(a.fn)}><b>{a.label}</b><small>{a.sub}</small></button>)}</div>
        ) : <p className="pa-fine">Nothing waiting on the team right now.</p>}
        <p className="pa-label">Jump to a stage</p>
        <div className="pa-chips">{stages.map(([k, l]) => <button key={k} onClick={() => act(async () => { await backstage.seed(k); location.replace(k === "fresh" ? "#/intro" : "#/today"); })}>{l}</button>)}</div>
        <p className="pa-label">Appearance</p>
        <div className="pa-chips">{(["system", "light", "dark"] as const).map((t) => <button key={t} className={theme === t ? "on" : ""} onClick={() => act(() => setTheme(t))}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
      </Sheet>
    </>
  );
}

function Offline() {
  const [off, setOff] = useState(!navigator.onLine);
  useEffect(() => {
    const a = () => setOff(false), b = () => setOff(true);
    addEventListener("online", a); addEventListener("offline", b);
    return () => { removeEventListener("online", a); removeEventListener("offline", b); };
  }, []);
  return off ? <div className="pa-offline" role="status"><Icon name="wifi" size={15} />You're offline. Changes are saved on this phone.</div> : null;
}

/* ---------- app ---------- */

export default function PhysioApp() {
  const { hash, dir } = useRoute();
  const s = useStore();
  const view = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const invite = new URLSearchParams(location.search).get("invite");
    if (invite && invite !== get().invite) set(() => ({ invite }));
    try { const t = localStorage.getItem("pa-theme"); if (t && t !== "system") document.documentElement.setAttribute("data-theme", t); } catch {}
    native.ready();
  }, []);

  const [name, ...rest] = hash.replace(/^#\/?/, "").split("/");
  const arg = decodeURIComponent(rest.join("/"));
  const allowed = s.phoneVerified ? !PUBLIC.includes(name) || name === "phone" : PUBLIC.includes(name);

  useEffect(() => {
    if (!name || !allowed) location.replace(entry());
  }, [name, allowed]);

  // New screen: top of page, and move focus to its heading for screen readers.
  const key = name === "me" ? "me" : `${name}/${arg}`;
  useLayoutEffect(() => {
    if (dir === "none") return;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => view.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }));
  }, [key]);

  if (!name || !allowed) return null;

  const screen = (() => {
    switch (name) {
      case "intro": return <Intro />;
      case "phone": return <Phone />;
      case "claim": return <Claim />;
      case "badge": return <Verify />;
      case "today": return <Today />;
      case "inbox": return <Inbox />;
      case "me": return <Me edit={rest[0] === "edit" ? rest[1] : undefined} share={rest[0] === "share"} />;
      case "network": return <Network />;
      case "physio": return <Peer slug={arg} />;
      case "studio": return <Studio />;
      case "review": return <Reader slug={arg} />;
      case "idea": return arg === "new" ? <Composer /> : <IdeaView id={arg} />;
      default: return <Today />;
    }
  })();

  return (
    <div className="pa-app">
      <Offline />
      <div key={key} ref={view} className={`pa-view ${dir}`}>{screen}</div>
      <Toast />
      <Celebrate />
      {DEMO && s.phoneVerified && <Backstage />}
    </div>
  );
}
