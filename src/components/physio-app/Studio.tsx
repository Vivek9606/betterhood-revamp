import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { media } from "../../lib/site";
import { TOPICS, api, articleBody, byline, isLive, missing, notify, piiIn, similarArticles, suggestTopics, useStore, type Block, type Comment, type Idea, type IdeaStatus, type Post, type Review } from "./store";
import { Avatar, Btn, Card, Chips, Empty, HoldButton, Pill, Screen, Section, Segmented, Sheet, Skeleton, Tick, ago, daysLeft, go } from "./ui";
import { Icon } from "./icons";
import { native } from "./bridge";

const NOTE_CHIPS = ["Needs a caveat", "Evidence is outdated", "Unclear for patients", "Not accurate", "Missing a red flag"];
const DECLINE_CHIPS = ["Outside my speciality", "Clinically inaccurate", "Can't endorse the advice", "Conflict of interest"];
const pref = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const setPref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/* ---------- studio home ---------- */

export function Studio() {
  const s = useStore();
  const live = isLive(s);
  const [tab, setTab] = useState<"reviews" | "ideas">(() => (sessionStorage.getItem("pa-studio") as "ideas") || "reviews");
  useEffect(() => { try { sessionStorage.setItem("pa-studio", tab); } catch {} }, [tab]);
  useEffect(() => { if (live) api.assignReviews(); }, [live]);

  if (!live) {
    const steps: [string, boolean, string][] = [
      ["Get verified", s.verification.status === "verified", s.verification.status === "pending" ? "In review" : "#/badge"],
      ["Complete your profile", !missing(s.profile).length, `#/me/edit/${missing(s.profile)[0]?.key ?? ""}`],
    ];
    return (
      <Screen tabs eyebrow="Studio" title="Where your expertise gets credited" lead="Review articles in your speciality, suggest topics from your clinic, and get the byline.">
        <div className="pa-locked">
          <div className="pa-locked-art" aria-hidden="true">
            <div className="line w80" /><div className="line w60" /><div className="line w90" />
            <div className="by"><span /><Icon name="lock" size={16} /></div>
          </div>
          <b>{steps.filter(([, d]) => !d).length} step{steps.filter(([, d]) => !d).length === 1 ? "" : "s"} to unlock</b>
          <ol>
            {steps.map(([l, d, href]) => (
              <li key={l} className={d ? "is-done" : ""}>
                <i>{d ? <Icon name="check" size={13} stroke={3} /> : null}</i>
                {d || !href.startsWith("#") ? <span>{l}{!d && href && <small> · {href}</small>}</span> : <a href={href}>{l}<Icon name="next" size={16} /></a>}
              </li>
            ))}
          </ol>
        </div>
      </Screen>
    );
  }

  const needs = s.reviews.filter((r) => r.status === "assigned" || r.status === "re-review").sort((a, b) => +new Date(a.due) - +new Date(b.due));
  const editor = s.reviews.filter((r) => r.status === "with-editor");
  const done = s.reviews.filter((r) => r.status === "approved" || r.status === "declined");
  const ideaAct = s.ideas.filter((i) => ["clarify", "accepted", "drafting", "final"].includes(i.status)).length;

  return (
    <Screen tabs className="pa-studio">
      <header className="pa-me-top">
        <h1 className="pa-h" tabIndex={-1} data-autofocus>Studio</h1>
        <Segmented value={tab} onChange={setTab} options={[["reviews", "Reviews", needs.length], ["ideas", "Ideas", ideaAct]]} />
      </header>

      {tab === "reviews" && (
        <>
          {!s.reviews.length && <><Skeleton /><Skeleton /></>}
          {needs.length > 0 && (
            <Section title="Needs you">
              {needs.map((r, i) => <ReviewCard key={r.slug} r={r} lead={i === 0} />)}
            </Section>
          )}
          {s.reviews.length > 0 && !needs.length && <Empty icon="check" title="You're all caught up">New articles matched to your specialities arrive as a notification.</Empty>}
          {editor.length > 0 && <Section title="With the editor">{editor.map((r) => <ReviewCard key={r.slug} r={r} />)}</Section>}
          {done.length > 0 && <Section title="Done">{done.map((r) => <ReviewCard key={r.slug} r={r} />)}</Section>}
        </>
      )}

      {tab === "ideas" && (
        <>
          <Card href="#/idea/new" className="pa-idea-cta">
            <span className="ic"><Icon name="bulb" size={22} /></span>
            <span className="grow"><b>What did a patient ask you this week?</b><small>Turn it into an article. Write it yourself, or let our team.</small></span>
            <Icon name="plus" size={20} />
          </Card>
          {s.ideas.map((i) => <IdeaCard key={i.id} i={i} />)}
          {!s.ideas.length && <p className="pa-fine">Your ideas and their progress will show here.</p>}
        </>
      )}
    </Screen>
  );
}

function ReviewCard({ r, lead }: { r: Review; lead?: boolean }) {
  const d = daysLeft(r.due);
  const status = r.status === "re-review" ? <Pill tone="wt" icon="refresh">Revised · v{r.version}</Pill>
    : r.status === "with-editor" ? <Pill tone="neutral" icon="clock">Sent {ago(r.decidedAt)}</Pill>
    : r.status === "approved" ? <Pill tone="ok" icon="check">Live with your name</Pill>
    : r.status === "declined" ? <Pill tone="no">Declined</Pill>
    : <Pill tone={d <= 2 ? "wt" : "brand"} icon="clock">Due in {d} day{d === 1 ? "" : "s"}</Pill>;
  return (
    <Card href={`#/review/${r.slug}`} className={`pa-review-card ${lead ? "first" : ""}`}>
      {lead && r.image && <img src={media(r.image)} alt="" loading="lazy" />}
      <div className="body">
        {status}
        <b>{r.title}</b>
        <small>{r.topic} · {r.minutes} min read{r.comments.length ? ` · ${r.comments.length} note${r.comments.length > 1 ? "s" : ""}` : ""}</small>
        {r.read ? <span className="pa-mini-bar"><i style={{ width: `${r.read}%` }} /></span> : null}
      </div>
    </Card>
  );
}

/* ---------- reader: read, annotate, decide ---------- */

export function Reader({ slug }: { slug: string }) {
  const s = useStore();
  const r = s.reviews.find((x) => x.slug === slug);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [pct, setPct] = useState(r?.read ?? 0);
  const [para, setPara] = useState<number | null>(null);
  const [sheet, setSheet] = useState<"send" | "decline" | null>(null);
  const [coach, setCoach] = useState(!pref("pa-coach-notes"));
  const endRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { articleBody(slug).then(setBlocks); }, [slug]);

  // Reading progress across the article body; persisted so it survives leaving and coming back.
  useEffect(() => {
    if (!blocks?.length) return;
    const on = () => {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = Math.round(Math.min(1, Math.max(0, (innerHeight - rect.top) / rect.height)) * 100);
      setPct((p) => Math.max(p, v));
    };
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, [blocks]);
  useEffect(() => { if (r && pct > (r.read ?? 0) + 4) api.updateReview(slug, { read: pct }); }, [pct]);

  if (!r) return <Screen backTo="#/studio"><Empty icon="book" title="This article isn't assigned to you" /></Screen>;

  const open = r.status === "assigned" || r.status === "re-review";
  const fresh = r.comments.filter((c) => !c.resolved);
  const canApprove = pct >= 85 || (blocks !== null && blocks.length === 0);
  const noteFor = (i: number) => r.comments.find((c) => c.para === i && !c.resolved);
  const saveNote = (c: Comment | null, i: number) => {
    const rest = r.comments.filter((x) => !(x.para === i && !x.resolved));
    api.updateReview(slug, { comments: c ? [...rest, c].sort((a, b) => a.para - b.para) : rest });
    setPara(null);
  };
  const decide = (status: "approved" | "with-editor" | "declined", reason?: string) => {
    api.decide(slug, status, reason);
    native.haptic(status === "approved" ? "success" : "warning");
    setSheet(null);
    if (status !== "approved") go("#/studio");
  };

  return (
    <Screen backTo="#/studio" className="pa-reader"
      action={<span className="pa-read-pct" aria-label={`${pct}% read`}>{pct}%</span>}
      dock={open ? (
        fresh.length ? (
          <div className="pa-dock-row">
            <Btn onClick={() => setSheet("send")} icon="chat">Send {fresh.length} note{fresh.length > 1 ? "s" : ""} to editor</Btn>
          </div>
        ) : (
          <>
            <div className="pa-byline-preview"><Avatar name={s.profile.name} image={s.profile.image} size={26} /><span>Publishes as <b>Clinically reviewed by {byline(s.profile)}</b></span><Tick size={14} /></div>
            {canApprove
              ? <HoldButton label="Hold to approve" done="Approved" onConfirm={() => decide("approved")} />
              : <button className="pa-hold locked" onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}><span className="lbl">Read to the end to approve · {pct}%</span></button>}
            <button className="pa-link small center" onClick={() => setSheet("decline")}>I can't endorse this</button>
          </>
        )
      ) : undefined}>
      <div className="pa-progress" style={{ transform: `scaleX(${pct / 100})` }} aria-hidden="true" />

      <p className="pa-eyebrow">{r.topic} · {r.minutes} min read · Version {r.version}</p>
      <h1 className="pa-title article" tabIndex={-1} data-autofocus>{r.title}</h1>

      {r.status === "re-review" && r.comments.some((c) => c.resolved) && (
        <div className="pa-callout wt"><Icon name="refresh" size={18} /><div><b>What changed in version {r.version}</b>
          <ul className="pa-resolved">{r.comments.filter((c) => c.resolved).map((c) => <li key={c.para}><Icon name="check" size={13} stroke={2.6} /><span>“{c.text}”</span></li>)}</ul></div></div>
      )}
      {r.status === "with-editor" && <div className="pa-callout"><Icon name="clock" size={18} /><div><b>With the editor</b><p>You sent {r.comments.length} note{r.comments.length === 1 ? "" : "s"} {ago(r.decidedAt)}. You'll get the revised version back here.</p></div></div>}
      {r.status === "approved" && <div className="pa-callout ok"><Tick size={18} /><div><b>Live with your name</b><p>Approved version {r.version} {ago(r.decidedAt)}.</p></div></div>}
      {r.status === "declined" && <div className="pa-callout no"><Icon name="x" size={18} /><div><b>You declined this article</b><p>{r.reason}</p></div></div>}

      {r.image && <img className="pa-hero-img" src={media(r.image)} alt="" />}

      {open && coach && (
        <button className="pa-coach" onClick={() => { setCoach(false); setPref("pa-coach-notes", "1"); }}>
          <Icon name="chat" size={16} /><span><b>Tap any paragraph to leave a note.</b> The editor sees exactly where.</span><Icon name="x" size={14} />
        </button>
      )}

      <div className="pa-article" ref={bodyRef}>
        {blocks === null && <Skeleton lines={8} />}
        {blocks?.length === 0 && (
          <>
            <p className="pa-para">{r.excerpt}…</p>
            <Btn kind="secondary" icon="eye" onClick={() => { native.open(new URL(`/learn/${slug}/`, location.origin).href); setPct(100); }}>Read the full article</Btn>
          </>
        )}
        {blocks?.map((b, i) => {
          const n = noteFor(i);
          const Tag = b.tag === "li" ? "p" : b.tag;
          return (
            <Tag key={i} className={`pa-para ${b.tag} ${n ? "noted" : ""} ${para === i ? "active" : ""}`}
              onClick={open ? () => { setPara(i); native.haptic(); } : undefined} role={open ? "button" : undefined} tabIndex={open ? 0 : undefined}
              onKeyDown={open ? (e: KeyboardEvent) => e.key === "Enter" && setPara(i) : undefined}>
              {b.tag === "li" && <span className="bullet">•</span>}{b.text}
              {n && <span className="pa-note-pin"><Icon name="chat" size={13} />{n.text}</span>}
            </Tag>
          );
        })}
        <div ref={endRef} className="pa-end" />
      </div>

      <NoteSheet open={para !== null} quote={para !== null ? blocks?.[para]?.text ?? "" : ""} existing={para !== null ? noteFor(para) : undefined}
        onClose={() => setPara(null)} onSave={(text) => saveNote(text ? { para: para!, quote: (blocks?.[para!]?.text ?? "").slice(0, 140), text } : null, para!)} />

      <Sheet open={sheet === "send"} onClose={() => setSheet(null)} title={`Send ${fresh.length} note${fresh.length > 1 ? "s" : ""} to the editor?`}
        footer={<><Btn onClick={() => decide("with-editor")}>Send notes</Btn><Btn kind="quiet" onClick={() => setSheet(null)}>Keep reviewing</Btn></>}>
        <ul className="pa-note-list">{fresh.map((c) => <li key={c.para}><q>{c.quote}</q><p>{c.text}</p></li>)}</ul>
        <p className="pa-fine">The editor revises and sends it back for one last look. Nothing is published until you approve.</p>
      </Sheet>
      <DeclineSheet open={sheet === "decline"} onClose={() => setSheet(null)} onDecline={(why) => decide("declined", why)} />
    </Screen>
  );
}

function NoteSheet({ open, quote, existing, onClose, onSave }: { open: boolean; quote: string; existing?: Comment; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  useEffect(() => { if (open) setText(existing?.text ?? ""); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit your note" : "Note on this paragraph"}
      footer={<><Btn onClick={() => onSave(text.trim())} disabled={!text.trim()}>{existing ? "Update note" : "Add note"}</Btn>{existing && <Btn kind="quiet" onClick={() => onSave("")}>Remove note</Btn>}</>}>
      <q className="pa-quote">{quote.length > 220 ? quote.slice(0, 220) + "…" : quote}</q>
      <div className="pa-chips">{NOTE_CHIPS.map((c) => <button key={c} type="button" onClick={() => setText((t) => (t ? `${t} ${c}.` : `${c}.`))}>{c}</button>)}</div>
      <label className="pa-field"><span className="sr">Your note</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. McKenzie extension isn't suitable for every patient. Add a caveat." /></label>
    </Sheet>
  );
}

function DeclineSheet({ open, onClose, onDecline }: { open: boolean; onClose: () => void; onDecline: (why: string) => void }) {
  const [pick, setPick] = useState<string[]>([]);
  const [text, setText] = useState("");
  const why = [...pick, text.trim()].filter(Boolean).join(". ");
  return (
    <Sheet open={open} onClose={onClose} title="Decline this article?" footer={<><Btn kind="danger" disabled={!why} onClick={() => onDecline(why)}>Decline</Btn><Btn kind="quiet" onClick={onClose}>Cancel</Btn></>}>
      <p className="pa-muted">Your name won't appear on it. Tell the editor why, so it goes to the right reviewer.</p>
      <Chips options={DECLINE_CHIPS} value={pick} onChange={setPick} />
      <label className="pa-field"><span className="sr">Anything else</span><textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Anything else (optional)" /></label>
    </Sheet>
  );
}

/* ---------- ideas ---------- */

const STEPS: { key: string; label: string; at: IdeaStatus[] }[] = [
  { key: "sent", label: "Submitted", at: [] },
  { key: "team", label: "Team review", at: ["submitted", "clarify", "declined"] },
  { key: "who", label: "Who writes it", at: ["accepted"] },
  { key: "write", label: "Writing", at: ["drafting"] },
  { key: "edit", label: "Editorial and clinical review", at: ["editorial"] },
  { key: "sign", label: "Your sign-off", at: ["final"] },
  { key: "live", label: "Published", at: ["published"] },
];
const stepOf = (i: Idea) => (i.status === "published" ? 6 : Math.max(1, STEPS.findIndex((x) => x.at.includes(i.status))));
const IDEA_PILL: Record<IdeaStatus, [string, "ok" | "wt" | "no" | "brand" | "neutral"]> = {
  submitted: ["With the team", "neutral"], clarify: ["Question for you", "wt"], declined: ["Not taken forward", "no"], accepted: ["Accepted", "ok"],
  drafting: ["You're writing", "brand"], editorial: ["In review", "neutral"], final: ["Needs your sign-off", "wt"], published: ["Published", "ok"],
};

function IdeaCard({ i }: { i: Idea }) {
  const n = stepOf(i);
  return (
    <Card href={`#/idea/${i.id}`} className="pa-idea-card">
      <div className="pa-row-sp"><Pill tone={IDEA_PILL[i.status][1]}>{IDEA_PILL[i.status][0]}</Pill><small>{ago(i.updatedAt)}</small></div>
      <b>{i.question}</b>
      {i.status !== "declined" && <span className="pa-steps-mini" aria-label={`Step ${n + 1} of ${STEPS.length}`}>{STEPS.map((_, k) => <i key={k} className={k <= n ? "on" : ""} />)}</span>}
    </Card>
  );
}

const DRAFT_KEY = "pa-idea-draft";

export function Composer() {
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; } })();
  const [q, setQ] = useState<string>(saved.q ?? "");
  const [ctx, setCtx] = useState<string>(saved.ctx ?? "");
  const [tags, setTags] = useState<string[]>(saved.tags ?? []);
  const [touched, setTouched] = useState(false);
  const [more, setMore] = useState(!!saved.ctx);
  const [similar, setSimilar] = useState<Post[]>([]);
  const [different, setDifferent] = useState(false);
  const pii = useMemo(() => piiIn(`${q} ${ctx}`), [q, ctx]);
  const suggested = useMemo(() => suggestTopics(`${q} ${ctx}`), [q, ctx]);

  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ q, ctx, tags })); } catch {} }, [q, ctx, tags]);
  useEffect(() => { if (!touched) setTags(suggested.slice(0, 3)); }, [suggested.join(), touched]);
  useEffect(() => { const t = setTimeout(() => similarArticles(q).then(setSimilar), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => setDifferent(false), [similar.map((p) => p.s).join()]);

  const ok = q.trim().length >= 12 && !pii.length;
  const submit = () => {
    const id = api.submitIdea({ question: q.trim().replace(/\s+/g, " "), context: ctx.trim(), tags });
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    native.haptic("success");
    location.replace(`#/idea/${id}`);
  };

  return (
    <Screen backTo="#/studio" className="pa-composer" dock={<Btn onClick={submit} disabled={!ok} icon="arrow">{pii.length ? "Remove identifying details first" : "Send to the content team"}</Btn>}>
      <label className="pa-big-input">
        <span className="pa-eyebrow">New idea</span>
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} autoFocus placeholder="What did a patient ask you this week?" aria-label="The patient question or topic" />
      </label>

      {pii.length > 0 && (
        <div className="pa-callout no" role="alert"><Icon name="lock" size={18} /><div><b>This may identify a patient</b><p>It looks like it includes {pii.join(" and ")}. Keep it general, e.g. “a 45-year-old runner”.</p></div></div>
      )}

      {similar.length > 0 && !different && (
        <div className="pa-similar">
          <p className="pa-label"><Icon name="book" size={14} />Already on betterhood</p>
          {similar.map((p) => <button key={p.s} onClick={() => native.open(new URL(`/learn/${p.s}/`, location.origin).href)}><b>{p.t}</b><Icon name="next" size={16} /></button>)}
          <button className="pa-link small" onClick={() => setDifferent(true)}>Mine is a different angle</button>
        </div>
      )}

      <p className="pa-label">Topics {suggested.length > 0 && !touched && <em>suggested</em>}</p>
      <Chips options={[...new Set([...suggested, ...TOPICS])]} value={tags} max={3} onChange={(v) => { setTouched(true); setTags(v); }} />

      {more ? (
        <label className="pa-field">
          <span>Why does it matter? <em>optional</em></span>
          <textarea rows={3} value={ctx} onChange={(e) => setCtx(e.target.value)} placeholder="Who asks it, how often, and what they usually believe." />
        </label>
      ) : <button className="pa-add-line" onClick={() => setMore(true)}><Icon name="plus" size={16} />Add context for the writer</button>}

      <p className="pa-fine"><Icon name="lock" size={13} />Never include names, numbers or anything that could identify a patient.</p>
    </Screen>
  );
}

export function IdeaView({ id }: { id: string }) {
  const s = useStore();
  const i = s.ideas.find((x) => x.id === id);
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState(i?.draft ?? "");
  useEffect(() => { if (!i || i.status !== "drafting") return; const t = setTimeout(() => api.updateIdea(i.id, { draft }), 600); return () => clearTimeout(t); }, [draft]);
  if (!i) return <Screen backTo="#/studio"><Empty icon="bulb" title="Idea not found" /></Screen>;
  const n = stepOf(i);
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const up = (patch: Partial<Idea>) => { api.updateIdea(i.id, patch); native.haptic(); };

  const body = (k: string) => {
    switch (k) {
      case "sent": return <small>{ago(i.at)}{i.tags.length ? ` · ${i.tags.join(", ")}` : ""}</small>;
      case "team":
        if (i.status === "submitted") return <small>{i.answer ? "Thanks for the detail. Back with the team." : "Reviewed weekly. You'll hear back either way."}</small>;
        if (i.status === "clarify") return (
          <div className="pa-step-act">
            <q className="pa-quote">{i.ask}</q>
            <label className="pa-field"><span className="sr">Your answer</span><textarea rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" /></label>
            <Btn small disabled={!answer.trim()} onClick={() => up({ status: "submitted", answer: answer.trim() })}>Send answer</Btn>
          </div>
        );
        if (i.status === "declined") return <small>{i.reason}</small>;
        return <small>Accepted</small>;
      case "who":
        if (i.status === "accepted") return (
          <div className="pa-choice">
            <button onClick={() => up({ status: "drafting", writer: "me" })}><Icon name="pen" size={20} /><b>I'll write it</b><small>Your byline as author</small></button>
            <button onClick={() => up({ status: "editorial", writer: "team" })}><Icon name="users" size={20} /><b>Team writes</b><small>You review and sign off</small></button>
          </div>
        );
        return i.writer ? <small>{i.writer === "me" ? "You're the author" : "Betterhood writers, with you as reviewer"}</small> : null;
      case "write":
        if (i.status === "drafting") return (
          <div className="pa-step-act">
            <textarea className="pa-draft" rows={9} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write freely. Our editors handle structure, references and SEO." />
            <div className="pa-row-sp"><small>{words} words · saved</small><small>{words < 150 ? `${150 - words} to go` : "Good length"}</small></div>
            <Btn small disabled={words < 150} onClick={() => up({ status: "editorial", draft })}>Submit draft</Btn>
          </div>
        );
        return i.writer === "team" ? <small>Drafted by our writers</small> : i.draft ? <small>{i.draft.split(/\s+/).length} words submitted</small> : null;
      case "edit": return i.status === "editorial" ? <small>Usually 5 to 7 days.</small> : n > 4 ? <small>Done</small> : null;
      case "sign":
        if (i.status === "final") return (
          <div className="pa-step-act">
            <div className="pa-byline-preview big"><Avatar name={s.profile.name} image={s.profile.image} size={32} /><span>{i.writer === "me" ? "Written by" : "Clinically reviewed by"} <b>{byline(s.profile)}</b></span><Tick size={15} /></div>
            <p className="pa-muted">By approving, you confirm this final version can be published under your name and credentials.</p>
            <HoldButton label="Hold to approve and publish" done="Published" onConfirm={() => { up({ status: "published" }); notify("Your article is live", `“${i.question}” is published with your byline.`, `#/idea/${i.id}`, "ok"); }} />
          </div>
        );
        return null;
      case "live": return i.status === "published" ? <small>Live on betterhood.in with a link to your profile.</small> : null;
    }
  };

  return (
    <Screen backTo="#/studio" eyebrow={<Pill tone={IDEA_PILL[i.status][1]}>{IDEA_PILL[i.status][0]}</Pill>} title={i.question} className="pa-idea">
      {i.context && <p className="pa-muted">{i.context}</p>}
      <ol className="pa-track">
        {STEPS.map((st, k) => {
          if (i.status === "declined" && k > 1) return null;
          const state = k < n || i.status === "published" ? "is-done" : k === n ? (i.status === "declined" ? "stop" : "now") : "";
          return (
            <li key={st.key} className={state}>
              <i>{state === "is-done" ? <Icon name="check" size={12} stroke={3} /> : state === "stop" ? <Icon name="x" size={12} stroke={3} /> : null}</i>
              <div><b>{st.label}</b>{(state === "is-done" || state === "now" || state === "stop") && body(st.key)}</div>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}

