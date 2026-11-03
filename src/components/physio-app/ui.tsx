import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { media } from "../../lib/site";
import { initials, isLive, useStore } from "./store";
import { native } from "./bridge";
import { Icon } from "./icons";

export const go = (to: string) => { if (location.hash !== to) location.hash = to; };
export const back = (fallback = "#/today") => (history.length > 1 ? history.back() : location.replace(fallback));

/* ---------- screen chrome ---------- */

export function Screen({ title, eyebrow, lead, backTo, action, children, dock, tabs, tone, className = "" }: {
  title?: ReactNode; eyebrow?: ReactNode; lead?: ReactNode; backTo?: string; action?: ReactNode; children?: ReactNode;
  dock?: ReactNode; tabs?: boolean; tone?: "plain" | "tint"; className?: string;
}) {
  return (
    <div className={`pa-screen ${tabs ? "with-tabs" : ""} ${tone === "tint" ? "tint" : ""} ${className}`}>
      {(backTo || action) && (
        <header className="pa-bar">
          {backTo ? <button className="pa-icon-btn" onClick={() => back(backTo)} aria-label="Back"><Icon name="back" size={22} /></button> : <span />}
          {action}
        </header>
      )}
      {(eyebrow || title) && (
        <div className="pa-head">
          {eyebrow && <p className="pa-eyebrow">{eyebrow}</p>}
          {title && <h1 className="pa-title" tabIndex={-1} data-autofocus>{title}</h1>}
          {lead && <p className="pa-lead">{lead}</p>}
        </div>
      )}
      <div className="pa-body">{children}</div>
      {dock && <div className="pa-dock">{dock}</div>}
      {tabs && <TabBar />}
    </div>
  );
}

const TABS = [
  { to: "#/today", label: "Today", icon: "today" },
  { to: "#/studio", label: "Studio", icon: "studio" },
  { to: "#/network", label: "Network", icon: "users" },
  { to: "#/me", label: "Me", icon: "user" },
];
function TabBar() {
  const s = useStore();
  const here = "#/" + location.hash.slice(2).split("/")[0];
  const due = isLive(s) ? s.reviews.filter((r) => r.status === "assigned" || r.status === "re-review").length + s.ideas.filter((i) => ["clarify", "accepted", "final"].includes(i.status)).length : 0;
  return (
    <nav className="pa-tabs" aria-label="Main">
      {TABS.map((t) => (
        <a key={t.to} href={t.to} className={here === t.to ? "on" : ""} aria-current={here === t.to ? "page" : undefined} onClick={() => native.haptic()}>
          <span className="pa-tab-ic"><Icon name={t.icon} size={23} />{t.to === "#/studio" && due > 0 && <i>{due}</i>}</span>
          {t.label}
        </a>
      ))}
    </nav>
  );
}

/* ---------- controls ---------- */

type BtnKind = "primary" | "secondary" | "quiet" | "danger" | "glass";
export function Btn({ children, onClick, href, kind = "primary", disabled, loading, icon, block = true, small }: {
  children: ReactNode; onClick?: () => void; href?: string; kind?: BtnKind; disabled?: boolean; loading?: boolean; icon?: string; block?: boolean; small?: boolean;
}) {
  const cls = `pa-btn ${kind} ${block ? "block" : ""} ${small ? "small" : ""} ${loading ? "loading" : ""}`;
  const inner = <>{loading ? <span className="pa-spin" aria-hidden="true" /> : icon ? <Icon name={icon} size={18} /> : null}<span>{children}</span></>;
  if (href) return <a className={cls} href={href} onClick={onClick}>{inner}</a>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined}>{inner}</button>;
}

export const Pill = ({ tone = "neutral", children, icon }: { tone?: "ok" | "wt" | "no" | "brand" | "neutral"; children: ReactNode; icon?: string }) => (
  <span className={`pa-pill ${tone}`}>{icon && <Icon name={icon} size={13} stroke={2.4} />}{children}</span>
);

export const Tick = ({ size = 16 }: { size?: number }) => (
  <span className="pa-tick" style={{ width: size, height: size }} aria-label="Verified" role="img">
    <svg viewBox="0 0 24 24" width={size} height={size}><path fill="currentColor" d="M12 1.5l2.6 1.9 3.2-.1 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.1z" /><path d="M8 12.3l2.6 2.6L16.2 9.3" fill="none" stroke="var(--pa-on-brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

export function Avatar({ name, image, size = 44, ring }: { name: string; image?: string; size?: number; ring?: boolean }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [image]);
  return (
    <span className={`pa-av ${ring ? "ring" : ""}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {image && !broken ? <img src={media(image)} alt="" loading="lazy" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  );
}

export function Ring({ value, size = 56, stroke = 5, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="pa-ring" style={{ width: size, height: size }} role="img" aria-label={`${value}%`}>
      <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="track" /><circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} /></svg>
      <span>{children}</span>
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`pa-switch ${on ? "on" : ""}`} onClick={() => { onChange(!on); native.haptic(); }}><i /></button>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [NoInfer<T>, string, number?][]; onChange: (v: NoInfer<T>) => void }) {
  return (
    <div className="pa-seg" role="tablist">
      {options.map(([k, l, n]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => { onChange(k); native.haptic(); }}>
          {l}{n ? <i>{n}</i> : null}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, max }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  return (
    <div className="pa-chips">
      {options.map((o) => {
        const on = value.includes(o);
        const full = !on && max !== undefined && value.length >= max;
        return (
          <button key={o} type="button" className={on ? "on" : ""} aria-pressed={on} disabled={full} onClick={() => { onChange(on ? value.filter((x) => x !== o) : [...value, o]); native.haptic(); }}>
            {on && <Icon name="check" size={14} stroke={2.6} />}{o}
          </button>
        );
      })}
    </div>
  );
}

// Press and hold to confirm, for decisions made under the physio's name.
export function HoldButton({ label, done, onConfirm, ms = 1100, disabled }: { label: string; done: string; onConfirm: () => void; ms?: number; disabled?: boolean }) {
  const [p, setP] = useState(0);
  const [ok, setOk] = useState(false);
  const raf = useRef(0);
  const t0 = useRef(0);
  const stop = () => { cancelAnimationFrame(raf.current); if (!ok) setP(0); };
  const start = () => {
    if (disabled || ok) return;
    native.haptic();
    t0.current = performance.now();
    const tick = (t: number) => {
      const v = Math.min(1, (t - t0.current) / ms);
      setP(v);
      if (v < 1) raf.current = requestAnimationFrame(tick);
      else { setOk(true); native.haptic("success"); setTimeout(onConfirm, 380); }
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <button type="button" className={`pa-hold ${ok ? "ok" : ""}`} disabled={disabled} style={{ ["--p" as string]: p }}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") stop(); }}
      aria-label={`${label}. Press and hold to confirm.`}>
      <span className="fill" aria-hidden="true" />
      <span className="lbl">{ok ? <><Icon name="check" size={18} stroke={2.6} />{done}</> : p > 0 ? "Keep holding…" : label}</span>
    </button>
  );
}

/* ---------- surfaces ---------- */

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("pa-locked");
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true }), 60);
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", key);
    return () => { document.documentElement.classList.remove("pa-locked"); removeEventListener("keydown", key); prev?.focus?.({ preventScroll: true }); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="pa-sheet-bg" onClick={onClose}>
      <div ref={ref} className="pa-sheet" role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} onClick={(e) => e.stopPropagation()}>
        <span className="pa-grab" aria-hidden="true" />
        {title && <h2 className="pa-sheet-title" id={id}>{title}</h2>}
        <div className="pa-sheet-body">{children}</div>
        {footer && <div className="pa-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export const Card = ({ children, onClick, href, className = "", tone }: { children: ReactNode; onClick?: () => void; href?: string; className?: string; tone?: "ok" | "wt" | "no" | "brand" | "ghost" }) => {
  const cls = `pa-card ${tone ?? ""} ${onClick || href ? "tap" : ""} ${className}`;
  if (href) return <a className={cls} href={href}>{children}</a>;
  if (onClick) return <button type="button" className={cls} onClick={onClick}>{children}</button>;
  return <div className={cls}>{children}</div>;
};

export const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="pa-section"><div className="pa-section-head"><h2>{title}</h2>{action}</div>{children}</section>
);

export const Skeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="pa-skel" aria-hidden="true">{Array.from({ length: lines }, (_, i) => <i key={i} style={{ width: `${92 - i * 14}%` }} />)}</div>
);

export const Empty = ({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) => (
  <div className="pa-empty"><span><Icon name={icon} size={26} /></span><b>{title}</b>{children && <p>{children}</p>}</div>
);

export const Saved = ({ at }: { at: number }) => <span className={`pa-saved ${at ? "on" : ""}`} key={at} aria-live="polite">{at ? <><Icon name="check" size={13} stroke={2.6} />Saved</> : null}</span>;

// Small burst for milestones. Pure CSS particles; skipped under reduced motion.
export function Confetti() {
  const colors = ["var(--pa-brand)", "var(--pa-mint)", "var(--pa-sun)", "var(--pa-coral)"];
  return (
    <div className="pa-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % 4], animationDelay: `${(i % 9) * 0.04}s`, ["--x" as string]: `${((i * 53) % 120) - 60}px`, ["--r" as string]: `${(i * 97) % 360}deg` }} />
      ))}
    </div>
  );
}

/* ---------- time ---------- */

export const ago = (iso?: string) => {
  if (!iso) return "";
  const m = Math.round((Date.now() - +new Date(iso)) / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? "yesterday" : `${d} days ago`;
};
export const daysLeft = (iso: string) => Math.max(0, Math.ceil((+new Date(iso) - Date.now()) / 864e5));
export const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
export const fmtPhone = (p = "") => p.replace(/^(\d{5})(\d{0,5}).*/, (_, a, b) => (b ? `${a} ${b}` : a));
