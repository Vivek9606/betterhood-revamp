import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import { FIELDS, api, bioDraft, byline, isLive, missing, reset, set, shortDegree, strength, useStore, type Field, type Profile } from "./store";
import { Avatar, Btn, Chips, Pill, Ring, Saved, Screen, Section, Segmented, Sheet, Tick, Toggle, fmtPhone, go } from "./ui";
import { Icon } from "./icons";
import { inApp, native } from "./bridge";

export const SPECIALITIES = ["Sports injuries", "Spine", "Neck and posture", "Knee", "Shoulder", "Post-op rehab", "Orthopaedic", "Neuro", "Geriatric", "Women's health", "Paediatric", "Cardio-pulmonary", "Pain management"];
const HOURS = ["Mon–Sat · 9 am – 7 pm", "Mon–Fri · 10 am – 6 pm", "Evenings · 5 pm – 9 pm", "Weekends only"];
const COUNCILS = ["Maharashtra State OT & PT Council", "Delhi Council for Physiotherapy & OT", "Karnataka Allied & Healthcare Council", "Gujarat State Council for Physiotherapy", "Tamil Nadu Physiotherapy Council", "Indian Association of Physiotherapists (IAP)"];

const slugify = (s: string) => s.toLowerCase().replace(/^dr\.?\s*/, "dr-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const publicUrl = (p: Profile) => `https://betterhood.in/physio/${p.slug ?? slugify(p.name || "you")}/`;

// Photos stay on-device for now, so shrink them to keep storage small.
async function thumb(file: File, size = 360) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, size / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.86);
}

export function Me({ edit, share }: { edit?: string; share?: boolean }) {
  const s = useStore();
  const p = s.profile;
  const v = s.verification.status;
  const live = isLive(s);
  const gaps = missing(p);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [reset_, setReset] = useState(false);
  const editing = mode === "edit";
  const open = (k: string) => go(`#/me/edit/${k}`);

  const Slot = ({ k, title, children, empty }: { k: Field["key"]; title: string; children: ReactNode; empty: string }) => {
    const f = FIELDS.find((x) => x.key === k)!;
    const done = f.done(p);
    if (!done && !editing) return null;
    return done ? (
      <button type="button" className={`pa-pf-sec ${editing ? "editable" : ""}`} onClick={() => editing && open(k)} disabled={!editing} aria-label={editing ? `Edit ${title}` : undefined}>
        <h3>{title}{editing && <Icon name="pen" size={15} />}</h3>{children}
      </button>
    ) : (
      <button type="button" className="pa-pf-add" onClick={() => open(k)}><Icon name="plus" size={18} /><span><b>Add {title.toLowerCase()}</b><small>{empty}</small></span></button>
    );
  };

  return (
    <Screen tabs className="pa-me">
      <header className="pa-me-top">
        <h1 className="pa-h" tabIndex={-1} data-autofocus>Profile</h1>
        <Segmented value={mode} onChange={setMode} options={[["edit", "Edit"], ["view", "Patient view"]]} />
      </header>

      <div className={`pa-me-status ${live ? "live" : ""}`}>
        <Ring value={live ? 100 : strength(p)} size={52}>{live ? <Icon name="check" size={20} stroke={2.6} /> : <small>{strength(p)}%</small>}</Ring>
        <div className="grow">
          <b>{live ? "Live on betterhood.in" : gaps.length ? `${gaps.length} detail${gaps.length > 1 ? "s" : ""} to go` : v === "pending" ? "Complete. Waiting on verification" : "Complete. Verify to go live"}</b>
          <small>{live ? "Patients can find and share your profile" : gaps.length ? `Next: ${gaps[0].label.toLowerCase()}` : "Goes live the moment you're verified"}</small>
        </div>
        {live ? <Btn small block={false} kind="secondary" icon="share" href="#/me/share">Share</Btn> : gaps.length ? <Btn small block={false} href={`#/me/edit/${gaps[0].key}`}>Add</Btn> : null}
      </div>

      {!editing && !live && <p className="pa-banner"><Icon name="eye" size={15} />This is a preview. Patients see it once you're verified and complete.</p>}

      <article className="pa-pf">
        <div className="pa-pf-cover" />
        <button type="button" className="pa-pf-avatar" onClick={() => editing && open("image")} disabled={!editing} aria-label="Change photo">
          <Avatar name={p.name || "You"} image={p.image} size={92} ring />
          {editing && <span className="cam"><Icon name="camera" size={15} /></span>}
        </button>
        <button type="button" className="pa-pf-id" onClick={() => editing && open("name")} disabled={!editing}>
          <b>{p.name || "Your name"} {v === "verified" && <Tick size={20} />}</b>
          <small>{[p.degree && shortDegree(p.degree), p.years ? `${p.years} yrs experience` : ""].filter(Boolean).join(" · ") || "Add qualifications"}</small>
          {(p.locality || p.city) && <small><Icon name="pin" size={13} />{[p.locality, p.city].filter(Boolean).join(", ")}</small>}
        </button>
        {v === "verified" ? <span className="pa-pf-verified"><Tick size={15} />Verified by Betterhood</span> : editing && v === "pending" ? <Pill tone="wt" icon="clock">Badge in review</Pill> : null}

        <Slot k="specialities" title="Specialities" empty="Also decides which articles you review">
          <div className="pa-chips static">{p.specialities.map((x) => <span key={x}>{x}</span>)}</div>
        </Slot>
        <Slot k="bio" title="About" empty="The first thing patients read"><p>{p.bio}</p></Slot>
        <Slot k="clinic" title="Clinic" empty="Where patients can find you"><p>{p.clinic}</p></Slot>
        <Slot k="location" title="Location" empty="Puts you in local search"><p>{[p.locality, p.city].filter(Boolean).join(", ")}</p></Slot>
        <Slot k="hours" title="Hours" empty="So patients know when to visit"><p>{p.hours}</p></Slot>
        <Slot k="regNo" title="Registration" empty="Proof of practice for patients"><p>{p.regNo}<br /><small>{p.regCouncil}</small></p></Slot>
        {!p.image && <Slot k="image" title="Photo" empty="Profiles with a face get chosen first"><span /></Slot>}

        {s.reviews.some((r) => r.status === "approved") && (
          <div className="pa-pf-sec">
            <h3>Clinically reviewed</h3>
            {s.reviews.filter((r) => r.status === "approved").map((r) => <a key={r.slug} className="pa-pf-art" href={`#/review/${r.slug}`}><Icon name="book" size={16} />{r.title}</a>)}
          </div>
        )}
      </article>

      {editing && (
        <>
          <Section title="Notifications">
            <div className="pa-settings">
              <div><span className="grow"><b>Push notifications</b><small>Verification, new reviews, replies</small></span><Toggle label="Push notifications" on={s.prefs.push} onChange={(x) => set((st) => ({ prefs: { ...st.prefs, push: x } }))} /></div>
              <div><span className="grow"><b>WhatsApp backup</b><small>If a push isn't opened within a day</small></span><Toggle label="WhatsApp backup" on={s.prefs.whatsapp} onChange={(x) => set((st) => ({ prefs: { ...st.prefs, whatsapp: x } }))} /></div>
            </div>
          </Section>
          <Section title="Account">
            <div className="pa-settings">
              <div><span className="grow"><b>Mobile</b><small>+91 {fmtPhone(s.phone)}</small></span></div>
              <div><span className="grow"><b>Listing</b><small>{p.slug ? "Linked to your betterhood.in listing" : "New profile"}</small></span></div>
              <button onClick={() => native.open("https://wa.me/918484805885")}><span className="grow"><b>Help</b><small>Chat with the Betterhood team</small></span><Icon name="wa" size={20} /></button>
              <button className="danger" onClick={() => setReset(true)}><span className="grow"><b>Sign out</b></span></button>
            </div>
          </Section>
        </>
      )}

      <Editor field={edit} />
      <ShareKit open={!!share} />

      <Sheet open={reset_} onClose={() => setReset(false)} title="Sign out?" footer={<><Btn kind="danger" onClick={() => { reset({ invite: s.invite }); location.replace("#/intro"); }}>Sign out and clear this device</Btn><Btn kind="quiet" onClick={() => setReset(false)}>Cancel</Btn></>}>
        <p className="pa-muted">In this demo everything is stored on this device, so signing out starts the journey again.</p>
      </Sheet>
    </Screen>
  );
}

/* ---------- field editors: autosave, then hand over to the next missing field ---------- */

// Debounced, but edits to different fields are merged rather than dropped, and anything pending is
// written before the sheet closes or moves on.
function useAutosave() {
  const [at, setAt] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Partial<Profile>>({});
  const flush = () => {
    clearTimeout(t.current);
    if (!Object.keys(pending.current).length) return;
    api.saveProfile(pending.current);
    pending.current = {};
    setAt(Date.now());
  };
  const save = (patch: Partial<Profile>, now = false) => {
    pending.current = { ...pending.current, ...patch };
    clearTimeout(t.current);
    if (now) flush();
    else t.current = setTimeout(flush, 450);
  };
  useEffect(() => flush, []);
  return { at, save, flush };
}

function Editor({ field }: { field?: string }) {
  const { profile: p } = useStore();
  const { at, save, flush } = useAutosave();
  const [d, setD] = useState<Profile>(p);
  const [custom, setCustom] = useState(false);
  useEffect(() => { if (field) { setD(p); setCustom(!!p.hours && !HOURS.includes(p.hours)); } }, [field]);
  const meta = FIELDS.find((f) => f.key === field);
  if (!field || !meta) return null;

  const put = (patch: Partial<Profile>, now = false) => { setD((x) => ({ ...x, ...patch })); save(patch, now); };
  const after = { ...p, ...d };
  const next = missing(after).find((f) => f.key !== field);
  const close = () => { flush(); location.replace("#/me"); };
  const titles: Record<string, string> = { image: "Your photo", name: "Name and qualifications", specialities: "Specialities", clinic: "Clinic", location: "Location", hours: "Working hours", bio: "About you", regNo: "Registration" };

  return (
    <Sheet open onClose={close} title={<>{titles[field]}<Saved at={at} /></>}
      footer={next && meta.done(after)
        ? <><Btn onClick={() => { flush(); location.replace(`#/me/edit/${next.key}`); }} icon="arrow">Next: {next.label.toLowerCase()}</Btn><Btn kind="quiet" onClick={close}>Done for now</Btn></>
        : <Btn onClick={close}>{meta.done(after) ? "Done" : "Close"}</Btn>}>
      <p className="pa-muted">{meta.hint}.</p>

      {field === "image" && (
        <div className="pa-photo">
          <Avatar name={d.name || "You"} image={d.image} size={120} ring />
          <div className="pa-two">
            <label className="pa-btn secondary block"><Icon name="camera" size={18} />Take photo<input type="file" accept="image/*" capture="user" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) put({ image: await thumb(f) }, true); }} /></label>
            <label className="pa-btn secondary block"><Icon name="upload" size={18} />Choose<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) put({ image: await thumb(f) }, true); }} /></label>
          </div>
          <small>A clear headshot, plain background, no sunglasses.</small>
        </div>
      )}
      {field === "name" && (
        <>
          <label className="pa-field"><span>Full name</span><input value={d.name} onChange={(e) => put({ name: e.target.value })} placeholder="Dr. Priya Sharma" autoComplete="name" /></label>
          <label className="pa-field"><span>Qualifications</span><input value={d.degree} onChange={(e) => put({ degree: e.target.value })} placeholder="BPT, MPT (Sports)" /></label>
          <label className="pa-field"><span>Years in practice</span><input inputMode="numeric" value={d.years || ""} onChange={(e) => put({ years: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) })} placeholder="8" /></label>
        </>
      )}
      {field === "specialities" && (
        <>
          <Chips options={[...new Set([...SPECIALITIES, ...d.specialities])]} value={d.specialities} max={4} onChange={(v) => put({ specialities: v }, true)} />
          <small className="pa-count">{d.specialities.length} of 4 chosen</small>
        </>
      )}
      {field === "clinic" && <label className="pa-field"><span>Clinic or practice name</span><input value={d.clinic} onChange={(e) => put({ clinic: e.target.value })} placeholder="MoveWell Physio" autoComplete="organization" /></label>}
      {field === "location" && (
        <div className="pa-two">
          <label className="pa-field"><span>City</span><input value={d.city} onChange={(e) => put({ city: e.target.value })} placeholder="Pune" autoComplete="address-level2" /></label>
          <label className="pa-field"><span>Locality</span><input value={d.locality} onChange={(e) => put({ locality: e.target.value })} placeholder="Kothrud" /></label>
        </div>
      )}
      {field === "hours" && (
        <>
          <div className="pa-options">
            {HOURS.map((h) => <button key={h} className={d.hours === h && !custom ? "on" : ""} onClick={() => { setCustom(false); put({ hours: h }, true); native.haptic(); }}><span>{h}</span>{d.hours === h && !custom && <Icon name="check" size={18} stroke={2.6} />}</button>)}
            <button className={custom ? "on" : ""} onClick={() => setCustom(true)}><span>Something else</span>{custom && <Icon name="check" size={18} stroke={2.6} />}</button>
          </div>
          {custom && <label className="pa-field"><span>Your hours</span><input value={d.hours} onChange={(e) => put({ hours: e.target.value })} placeholder="Mon, Wed, Fri · 8 am – 1 pm" autoFocus /></label>}
        </>
      )}
      {field === "bio" && (
        <>
          <label className="pa-field">
            <span>About you</span>
            <textarea rows={6} value={d.bio} onChange={(e) => put({ bio: e.target.value })} placeholder="Who you help, how you work, and what a first visit looks like." />
            <small className={d.bio.trim().length >= 60 ? "ok" : ""}>{d.bio.trim().length >= 60 ? `${d.bio.trim().length} characters · reads well` : `${60 - d.bio.trim().length} more characters`}</small>
          </label>
          {d.bio.trim().length < 20 && <Btn kind="secondary" icon="spark" onClick={() => put({ bio: bioDraft(after) }, true)}>Write a first draft for me</Btn>}
        </>
      )}
      {field === "regNo" && (
        <>
          <label className="pa-field"><span>Registration number</span><input value={d.regNo} onChange={(e) => put({ regNo: e.target.value.toUpperCase() })} placeholder="MH/PT/2017/04821" autoCapitalize="characters" spellCheck={false} /></label>
          <label className="pa-field"><span>Council</span><input list="pa-councils" value={d.regCouncil} onChange={(e) => put({ regCouncil: e.target.value })} placeholder="Start typing your council" /></label>
          <datalist id="pa-councils">{COUNCILS.map((c) => <option key={c} value={c} />)}</datalist>
        </>
      )}
    </Sheet>
  );
}

/* ---------- share kit ---------- */

function ShareKit({ open }: { open: boolean }) {
  const { profile: p } = useStore();
  const url = publicUrl(p);
  const [copied, setCopied] = useState(false);
  const qr = useMemo(() => { const q = qrcode(0, "M"); q.addData(url); q.make(); return { svg: q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }), png: q.createDataURL(10, 4) }; }, [url]);
  const msg = `You can find my profile, clinic timings and booking details on betterhood: ${url}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url); } catch {} setCopied(true); native.haptic("success"); setTimeout(() => setCopied(false), 1800); };

  return (
    <Sheet open={open} onClose={() => location.replace("#/me")} title="Share your profile">
      <div className="pa-qr">
        <div className="code" dangerouslySetInnerHTML={{ __html: qr.svg }} />
        <div><b>{byline(p)}</b><small>Print this for your clinic desk. Patients scan to see your profile.</small></div>
      </div>
      <button className="pa-url" onClick={copy}><span>{url.replace("https://", "")}</span><em>{copied ? <><Icon name="check" size={14} stroke={2.6} />Copied</> : <><Icon name="copy" size={14} />Copy</>}</em></button>
      <div className="pa-share-row">
        <button onClick={() => native.open(`https://wa.me/?text=${encodeURIComponent(msg)}`)}><span className="wa"><Icon name="wa" size={22} /></span>WhatsApp</button>
        <button onClick={() => native.share(url, msg)}><span><Icon name="share" size={22} /></span>More</button>
        {!inApp() && <a href={qr.png} download="betterhood-profile-qr.gif"><span><Icon name="qr" size={22} /></span>Save QR</a>}
        <button onClick={() => native.open(url)}><span><Icon name="eye" size={22} /></span>Open</button>
      </div>
    </Sheet>
  );
}
