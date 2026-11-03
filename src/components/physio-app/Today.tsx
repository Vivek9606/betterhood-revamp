import { useEffect } from "react";
import { firstName, isComplete, isLive, missing, set, strength, useStore, type State } from "./store";
import { Avatar, Card, Empty, Pill, Ring, Screen, Section, ago, daysLeft, go, greeting } from "./ui";
import { Icon } from "./icons";
import { native } from "./bridge";

interface Next { eyebrow: string; title: string; body: string; href?: string; cta?: string; mins?: number; icon: string; tone?: "brand" | "wt" | "no" | "ok" }

// The single most useful thing to do right now.
function nextUp(s: State): Next {
  const v = s.verification.status;
  const gaps = missing(s.profile);
  if (v === "rejected") return { eyebrow: "Needs attention", title: "Re-upload your document", body: s.verification.reason ?? "", href: "#/badge", cta: "Re-upload", mins: 1, icon: "alert", tone: "no" };
  if (v === "none") return { eyebrow: "Next up", title: "Get your verified badge", body: "Snap your IAP card or council certificate.", href: "#/badge", cta: "Start", mins: 2, icon: "shield", tone: "brand" };
  if (gaps.length) return { eyebrow: `${gaps.length} to go before you're listed`, title: `Add your ${gaps[0].label.toLowerCase()}`, body: gaps[0].hint, href: `#/me/edit/${gaps[0].key}`, cta: "Add", mins: gaps[0].mins, icon: "user", tone: "brand" };
  if (v === "pending") return { eyebrow: "All done on your side", title: "We're reviewing your document", body: `Submitted ${ago(s.verification.submittedAt)}. Your profile goes live the moment you're verified.`, href: "#/me", cta: "Preview profile", icon: "clock", tone: "wt" };
  const review = s.reviews.find((r) => r.status === "re-review") ?? s.reviews.find((r) => r.status === "assigned");
  if (review) return { eyebrow: review.status === "re-review" ? "Revised for you" : `Due in ${daysLeft(review.due)} days`, title: review.title, body: `${review.topic} · ${review.minutes} min read`, href: `#/review/${review.slug}`, cta: "Review", mins: review.minutes + 2, icon: "book", tone: "brand" };
  const idea = s.ideas.find((i) => ["clarify", "accepted", "final"].includes(i.status));
  if (idea) return { eyebrow: "Your idea", title: idea.question, body: idea.status === "final" ? "Ready for your sign-off." : idea.status === "accepted" ? "Accepted. Choose who writes it." : "The team has a question.", href: `#/idea/${idea.id}`, cta: "Open", icon: "bulb", tone: "brand" };
  return { eyebrow: "You're all caught up", title: "What did a patient ask you this week?", body: "Turn it into an article with your name on it.", href: "#/idea/new", cta: "Suggest", mins: 1, icon: "bulb", tone: "ok" };
}

function Path({ s }: { s: State }) {
  const v = s.verification.status === "verified";
  const live = isLive(s);
  const pub = s.reviews.some((r) => r.status === "approved") || s.ideas.some((i) => i.status === "published");
  const steps: [string, boolean, string][] = [
    ["Verified", v, s.verification.status === "pending" ? "In review" : s.verification.status === "rejected" ? "Re-upload" : v ? "Badge live" : "1 document"],
    ["Listed", live, live ? "On betterhood.in" : `${strength(s.profile)}% profile`],
    ["Published", pub, pub ? "Byline live" : live ? "Review an article" : "Unlocks when listed"],
  ];
  const current = steps.findIndex(([, d]) => !d);
  return (
    <ol className="pa-path" aria-label="Your progress">
      {steps.map(([l, d, sub], i) => (
        <li key={l} className={d ? "is-done" : i === current ? "now" : ""}>
          <i>{d ? <Icon name="check" size={14} stroke={3} /> : i + 1}</i>
          <b>{l}</b>
          <small>{sub}</small>
        </li>
      ))}
    </ol>
  );
}

const TOOLS = [
  { href: "/assessment-lower-back-pain/", label: "Pain assessments", sub: "Send to patients", icon: "flag" },
  { href: "/slouch-catcher/", label: "Slouch Catcher", sub: "Posture game", icon: "camera" },
  { href: "/learn/", label: "Article library", sub: "758 articles", icon: "book" },
  { href: "/physioedge-course/", label: "PhysioEdge", sub: "Certification", icon: "spark" },
];

export function Today() {
  const s = useStore();
  const p = s.profile;
  const n = nextUp(s);
  const live = isLive(s);
  const unread = s.notes.filter((x) => !x.read).length;
  const queue = live ? s.reviews.filter((r) => r.status === "assigned" || r.status === "re-review") : [];
  const done = s.reviews.filter((r) => r.status === "approved").length;

  return (
    <Screen tabs className="pa-today">
      <header className="pa-today-top">
        <a href="#/me" aria-label="Your profile"><Avatar name={p.name || "You"} image={p.image} size={44} /></a>
        <div className="grow"><small>{greeting()}</small><h1 className="pa-h" tabIndex={-1} data-autofocus>{p.name ? `Dr. ${firstName(p.name)}` : "Welcome"}</h1></div>
        <a href="#/inbox" className="pa-icon-btn" aria-label={`Inbox${unread ? `, ${unread} new` : ""}`}><Icon name="bell" size={22} />{unread > 0 && <i className="dot" />}</a>
      </header>

      <Path s={s} />

      <Card href={n.href} className={`pa-next ${n.tone ?? ""}`}>
        <span className="ic"><Icon name={n.icon} size={22} /></span>
        <span className="pa-next-eyebrow">{n.eyebrow}{n.mins ? <em><Icon name="clock" size={12} />{n.mins} min</em> : null}</span>
        <b>{n.title}</b>
        <p>{n.body}</p>
        {n.cta && <span className="pa-next-cta">{n.cta}<Icon name="arrow" size={16} /></span>}
      </Card>

      {live && (
        <div className="pa-stats">
          <div><b>{done}</b><small>Articles reviewed</small></div>
          <div><b>{s.ideas.length}</b><small>Ideas shared</small></div>
          <div><b>{s.saved.length}</b><small>Peers saved</small></div>
        </div>
      )}

      {queue.length > 1 && (
        <Section title="Waiting for you" action={<a className="pa-link small" href="#/studio">See all</a>}>
          {queue.slice(1, 3).map((r) => (
            <Card key={r.slug} href={`#/review/${r.slug}`} className="pa-queue">
              <Ring value={Math.max(8, 100 - daysLeft(r.due) * 10)} size={40} stroke={4}><small>{daysLeft(r.due)}d</small></Ring>
              <span className="grow"><b>{r.title}</b><small>{r.topic} · {r.minutes} min</small></span>
            </Card>
          ))}
        </Section>
      )}

      {!live && s.verification.status !== "none" && !isComplete(p) && (
        <Section title="While we review">
          <p className="pa-muted">Profiles that are complete on the day of verification go live instantly.</p>
        </Section>
      )}

      <Section title="For your patients">
        <div className="pa-tools">
          {TOOLS.map((t) => (
            <a key={t.href} href={t.href} onClick={(e) => { e.preventDefault(); native.open(new URL(t.href, location.origin).href); }}>
              <span className="ic"><Icon name={t.icon} size={20} /></span><b>{t.label}</b><small>{t.sub}</small>
            </a>
          ))}
        </div>
      </Section>
    </Screen>
  );
}

export function Inbox() {
  const s = useStore();
  useEffect(() => { const t = setTimeout(() => set((st) => ({ notes: st.notes.map((x) => ({ ...x, read: true })) })), 1200); return () => clearTimeout(t); }, []);
  const today = s.notes.filter((x) => Date.now() - +new Date(x.at) < 864e5);
  const earlier = s.notes.filter((x) => !today.includes(x));
  const group = (title: string, list: typeof s.notes) => list.length > 0 && (
    <Section title={title}>
      <div className="pa-inbox">
        {list.map((x) => (
          <button key={x.id} className={`pa-note ${x.read ? "" : "new"} ${x.tone ?? ""}`} onClick={() => x.to && go(x.to)}>
            <span className="ic"><Icon name={x.tone === "no" ? "alert" : x.tone === "ok" ? "check" : x.tone === "wt" ? "clock" : "bell"} size={18} /></span>
            <span className="grow"><b>{x.title}</b><small>{x.body}</small></span>
            <time>{ago(x.at)}</time>
          </button>
        ))}
      </div>
    </Section>
  );
  return (
    <Screen backTo="#/today" title="Inbox">
      {!s.notes.length && <Empty icon="bell" title="Nothing yet">Verification decisions, new reviews and replies to your ideas land here.</Empty>}
      {group("Today", today)}
      {group("Earlier", earlier)}
      {s.notes.length > 0 && <Pill tone="neutral" icon="phone">{s.prefs.push ? "Also sent as push" : "Push is off"}{s.prefs.whatsapp ? " · WhatsApp backup on" : ""}</Pill>}
    </Screen>
  );
}
