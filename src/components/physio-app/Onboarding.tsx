import { useEffect, useRef, useState } from "react";
import { api, articles, firstName, get, inviteFor, localityOf, physios, shortDegree, titleCase, useStore, type Post, type Row } from "./store";
import { Avatar, Btn, Screen, Tick, fmtPhone, go } from "./ui";
import { Icon } from "./icons";
import { native } from "./bridge";

/* ---------- intro: three stories, told with the physio's own listing ---------- */

const STORY_MS = 4800;

export function Intro() {
  const s = useStore();
  const [me, setMe] = useState<Row | null>(null);
  const [faces, setFaces] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [post, setPost] = useState<Post | null>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);
  const pausedRef = useRef(false);
  const [t, setT] = useState(0);

  useEffect(() => {
    api.listingForInvite(s.invite).then(setMe);
    physios().then((all) => { setTotal(all.length); setFaces(all.filter((r) => r.i && r.y > 5).slice(0, 5)); });
    articles().then((all) => setPost(all.find((p) => p.h.includes("back-pain") && p.c.includes("articles")) ?? all[0]));
  }, [s.invite]);

  // Story timer: pauses while the stage is held; no auto-advance under reduced motion.
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (!pausedRef.current) {
        elapsed.current += now - last;
        if (elapsed.current >= STORY_MS) { elapsed.current = 0; setI((x) => (x + 1) % 3); }
        setT(elapsed.current);
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nav = (d: number) => { setI((x) => Math.max(0, Math.min(2, x + d))); elapsed.current = 0; setT(0); native.haptic(); };

  const name = me?.n ?? "Dr. You";
  const city = me?.c ? titleCase(me.c) : "your city";
  const invited = !!inviteFor(s.invite);

  const slides = [
    { k: "Get verified", h: <>Earn the badge patients <em>look for</em>.</>, p: "One document, reviewed by our clinical team within 48 hours." },
    { k: "Get found", h: <>Show up when <em>{city}</em> searches.</>, p: "A public profile on betterhood.in, built for Google." },
    { k: "Get credited", h: <>Put your name on <em>the science</em>.</>, p: "Review articles in your speciality and get the byline." },
  ];

  return (
    <div className="pa-intro">
      <div className="pa-stories" aria-hidden="true">
        {slides.map((_, k) => <i key={k}><b style={{ transform: `scaleX(${k < i ? 1 : k === i ? t / STORY_MS : 0})` }} /></i>)}
      </div>
      <header className="pa-intro-top">
        <img src="/img/logo.svg" alt="betterhood" height={22} />
        {invited && <span className="pa-pill brand"><Icon name="spark" size={13} />Personal invite</span>}
      </header>

      <div className="pa-stage" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        <button className="pa-stage-nav prev" onClick={() => nav(-1)} aria-label="Previous" />
        <button className="pa-stage-nav next" onClick={() => nav(1)} aria-label="Next" />
        <div className="pa-stage-art" key={i}>
          {i === 0 && (
            <div className="pa-mock-profile">
              <Avatar name={name} image={me?.i} size={72} ring />
              <b>{name}</b>
              <span>{me ? `${shortDegree(me.g)} · ${me.p || city}` : "Physiotherapist"}</span>
              <span className="pa-mock-badge"><Tick size={16} />Verified by Betterhood</span>
            </div>
          )}
          {i === 1 && (
            <div className="pa-mock-search">
              <div className="q"><Icon name="search" size={16} />physiotherapist near {city.toLowerCase()}</div>
              <div className="r">
                <small>betterhood.in › physio</small>
                <b>{name} <Tick size={14} /></b>
                <p>{me?.sp.slice(0, 2).join(" · ") || "Sports injuries · Spine"} · {me?.p || city}</p>
              </div>
              <div className="r dim"><small>example.com</small><b>Physiotherapy clinics</b><p>Directory listing</p></div>
            </div>
          )}
          {i === 2 && (
            <div className="pa-mock-article">
              <span className="tag">Back pain · {post?.m ?? 6} min</span>
              <b>{post?.t ?? "Lower back pain at desk jobs"}</b>
              <div className="by"><Avatar name={name} image={me?.i} size={30} /><span><small>Clinically reviewed by</small>{name} <Tick size={13} /></span></div>
            </div>
          )}
        </div>
        <div className="pa-stage-copy" key={`c${i}`}>
          <p className="pa-eyebrow">{slides[i].k}</p>
          <h1 className="pa-display" tabIndex={-1} data-autofocus>{slides[i].h}</h1>
          <p className="pa-lead">{slides[i].p}</p>
        </div>
      </div>

      <div className="pa-intro-foot">
        {faces.length > 0 && (
          <div className="pa-proof">
            <span className="pa-faces">{faces.map((f) => <Avatar key={f.s} name={f.n} image={f.i} size={28} />)}</span>
            <span>Join {total.toLocaleString("en-IN")} physios across India</span>
          </div>
        )}
        <Btn href="#/phone" icon={undefined}>{me ? `Claim my profile, Dr. ${firstName(me.n)}` : "Get started"}</Btn>
        <p className="pa-fine">Free · About 3 minutes · <a href="#/phone">I already have an account</a></p>
      </div>
    </div>
  );
}

/* ---------- phone + code on one screen ---------- */

export function Phone() {
  const s = useStore();
  const [phone, setPhone] = useState(s.phone ?? inviteFor(s.invite)?.phone ?? "");
  const [consent, setConsent] = useState(!!s.consentAt);
  const [why, setWhy] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "bad" | "ok">("idle");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const valid = /^[6-9]\d{9}$/.test(phone);

  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  async function send() {
    if (!valid || !consent) return;
    await api.sendOtp(phone);
    setSent(true); setCode(""); setState("idle"); setWait(30);
    native.haptic();
    setTimeout(() => codeRef.current?.focus(), 80);
    // Android Chrome / WebView can read the SMS code directly.
    if ("OTPCredential" in window) {
      const ac = new AbortController();
      setTimeout(() => ac.abort(), 60_000);
      (navigator.credentials as any).get({ otp: { transport: ["sms"] }, signal: ac.signal }).then((c: any) => c?.code && enter(c.code)).catch(() => {});
    }
  }

  async function enter(v: string) {
    const c = v.replace(/\D/g, "").slice(0, 6);
    setCode(c);
    if (state === "bad") setState("idle");
    if (c.length < 6) return;
    setState("checking");
    const { ok } = await api.verifyOtp(c);
    if (!ok) { setState("bad"); native.haptic("warning"); return; }
    setState("ok");
    native.haptic("success");
    setTimeout(() => go(get().linked === undefined ? "#/claim" : "#/today"), 500);
  }

  return (
    <Screen backTo="#/intro"
      eyebrow={sent ? "Step 1 of 3 · Sign in" : "Step 1 of 3 · Sign in"}
      title={sent ? "Enter the code" : "Your mobile number"}
      lead={sent ? <>Sent to +91 {fmtPhone(phone)} · <button className="pa-link" onClick={() => { setSent(false); setState("idle"); }}>Change</button></> : "Use the number from the WhatsApp community. That's how we find your existing listing."}
      dock={!sent && <Btn onClick={send} disabled={!valid || !consent}>Send code</Btn>}>
      {!sent ? (
        <>
          <label className="pa-phone">
            <span className="cc">+91</span>
            <input inputMode="numeric" autoComplete="tel-national" value={fmtPhone(phone)} placeholder="98765 43210" aria-label="Mobile number" autoFocus
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} onKeyDown={(e) => e.key === "Enter" && send()} />
            {valid && <Icon name="check" size={20} stroke={2.4} className="ok" />}
          </label>
          <div className={`pa-consent ${consent ? "on" : ""}`}>
            <button type="button" role="checkbox" aria-checked={consent} onClick={() => { setConsent(!consent); native.haptic(); }}>
              <span className="box">{consent && <Icon name="check" size={14} stroke={3} />}</span>
              <span>Betterhood may use my professional details to verify me and list me on betterhood.in.</span>
            </button>
            <button type="button" className="pa-link small" onClick={() => setWhy(!why)} aria-expanded={why}>{why ? "Hide details" : "What does this cover?"}</button>
            {why && (
              <ul className="pa-why">
                <li><Icon name="lock" size={15} />Documents are seen only by our verification team, never published.</li>
                <li><Icon name="eye" size={15} />Your profile goes public only once you're verified and complete.</li>
                <li><Icon name="x" size={15} />You can withdraw consent and delete your account any time.</li>
                <li className="links">See the <a href="/privacy-policy/" target="_blank">Privacy Policy</a> and <a href="/terms-of-services/" target="_blank">Terms</a>.</li>
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <label className={`pa-otp ${state}`} onClick={() => codeRef.current?.focus()}>
            <input ref={codeRef} inputMode="numeric" autoComplete="one-time-code" value={code} aria-label="6-digit code" maxLength={6}
              onChange={(e) => enter(e.target.value)} onPaste={(e) => { e.preventDefault(); enter(e.clipboardData.getData("text")); }} />
            {Array.from({ length: 6 }, (_, k) => <span key={k} className={code[k] ? "f" : k === code.length ? "cur" : ""}>{code[k] ?? ""}</span>)}
          </label>
          <p className="pa-otp-msg" role="status">
            {state === "checking" ? "Checking…" : state === "bad" ? "That code didn't match. Try again." : state === "ok" ? "Verified" : wait ? `Didn't get it? Resend in ${wait}s` : <button className="pa-link" onClick={send}>Resend code</button>}
          </p>
          <p className="pa-hint"><Icon name="spark" size={14} />Demo: any 6 digits work.</p>
        </>
      )}
    </Screen>
  );
}

/* ---------- claim an existing listing ---------- */

const TAKE = [["photo", "Photo"], ["basics", "Name and qualifications"], ["specialities", "Specialities"], ["location", "City and locality"]] as const;
type Take = Record<(typeof TAKE)[number][0], boolean>;

function Highlight({ text, q }: { text: string; q: string }) {
  const t = q.trim().replace(/^dr\.?\s*/i, "");
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

export function Claim() {
  const s = useStore();
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Row[]>([]);
  const [take, setTake] = useState<Take>({ photo: true, basics: true, specialities: true, location: true });

  useEffect(() => { api.listingForInvite(s.invite).then((r) => { setRow(r); if (!r) setSearching(true); }); }, []);
  useEffect(() => { const t = setTimeout(() => api.searchListings(q).then(setHits), 150); return () => clearTimeout(t); }, [q]);

  const claim = () => { api.claim(row!, take); native.haptic("success"); go("#/badge"); };
  const fresh = () => { api.startFresh(); go("#/badge"); };

  if (row === undefined) return <Screen eyebrow="Step 2 of 3" title="Looking you up…"><div className="pa-skel-card" /></Screen>;

  if (searching) {
    return (
      <Screen backTo="#/phone" eyebrow="Step 2 of 3 · Your listing" title="Find your listing" lead="Already on betterhood.in? Link it and skip retyping."
        dock={<Btn kind="secondary" onClick={fresh}>I'm not listed yet</Btn>}>
        <label className="pa-search">
          <Icon name="search" size={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by your name" aria-label="Search by your name" autoFocus />
        </label>
        <div className="pa-list" role="list">
          {hits.map((r) => (
            <button key={r.s} role="listitem" className="pa-row-btn" onClick={() => { setRow(r); setSearching(false); }}>
              <Avatar name={r.n} image={r.i} size={44} />
              <span className="grow"><b><Highlight text={r.n} q={q} /></b><small>{shortDegree(r.g)} · {r.p || "India"}</small></span>
              <Icon name="next" size={18} />
            </button>
          ))}
        </div>
        {q.trim().length >= 2 && !hits.length && <p className="pa-fine">No listing matches “{q}”. You can start fresh below.</p>}
      </Screen>
    );
  }

  const r = row!;
  const count = Object.values(take).filter(Boolean).length;
  return (
    <Screen eyebrow="Step 2 of 3 · Your listing" title="Is this you?" lead="We found a betterhood.in listing linked to your number."
      dock={<><Btn onClick={claim}>Yes, bring {count} detail{count === 1 ? "" : "s"} over</Btn><Btn kind="quiet" onClick={() => setSearching(true)}>This isn't me</Btn></>}>
      <div className="pa-claim">
        <Avatar name={r.n} image={r.i} size={64} />
        <div><b>{r.n}</b><small>{shortDegree(r.g)}{r.y ? ` · ${r.y} yrs` : ""}</small><small><Icon name="pin" size={13} />{[localityOf(r), titleCase(r.c) || r.p].filter(Boolean).join(", ")}</small></div>
      </div>
      <p className="pa-label">Bring into your profile</p>
      <div className="pa-checklist">
        {TAKE.map(([k, l]) => (
          <button key={k} type="button" role="checkbox" aria-checked={take[k]} className={take[k] ? "on" : ""} onClick={() => { setTake({ ...take, [k]: !take[k] }); native.haptic(); }}>
            <span className="box">{take[k] && <Icon name="check" size={14} stroke={3} />}</span>
            <span className="grow">{l}</span>
            <small>{k === "photo" ? (r.i ? "1 photo" : "None") : k === "basics" ? shortDegree(r.g) : k === "specialities" ? `${r.sp.length} listed` : titleCase(r.c) || r.p}</small>
          </button>
        ))}
      </div>
      <p className="pa-fine">You can change anything later. Duplicates are merged by our team.</p>
    </Screen>
  );
}
