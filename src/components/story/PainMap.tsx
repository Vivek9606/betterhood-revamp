import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { MaskLines, Marquee, Arrow, EASE } from "./primitives";

export interface Spot { id: string; x: number; y: number; name: string; short: string; line: string; shop: string; learn: string; assess?: string }
interface Props { spots: Spot[]; tiles: { img: string; href: string; label: string }[] }

export default function PainMap({ spots, tiles }: Props) {
  const [active, setActive] = useState(spots[2].id);
  const s = spots.find((x) => x.id === active)!;
  // the tracker touches window/document, so load it on click rather than during server rendering
  const pick = (p: Spot) => { setActive(p.id); import("../../scripts/tracker").then((t) => t.track("painmap_select", { spot: p.name })); };

  return (
    <section className="st-map" id="find" aria-label="Chapter four: every pain is different">
      <div className="wrap">
        <div className="st-map-head">
          <p className="st-kicker"><span>04</span> Shop by concern</p>
          <MaskLines className="st-h2" lines={["Every pain is different.", <em key="e">So is the solution.</em>]} />
          <p className="st-lead">Shop physio-curated kits for targeted relief, recovery and support. Tap where it hurts.</p>
        </div>

        <div className="st-map-grid">
          <div className="st-body">
            <svg viewBox="0 0 200 420" aria-hidden="true" className="st-body-svg">
              <defs>
                <linearGradient id="bodyg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#f5eaf2" /></linearGradient>
              </defs>
              <g fill="url(#bodyg)" stroke="#d7b3cf" strokeWidth="1.6">
                <circle cx="100" cy="40" r="25" />
                <path d="M90 62h20v14H90z" />
                <path d="M64 80c0-6 6-9 13-9h46c7 0 13 3 13 9l6 112c0 7-5 11-12 11H70c-7 0-12-4-12-11z" />
                <path d="M62 82c-12 4-17 13-21 28l-11 62c-1 6 8 9 10 3l18-60" />
                <path d="M138 82c12 4 17 13 21 28l11 62c1 6-8 9-10 3l-18-60" />
                <path d="M72 200h25l-2 88-6 92c0 8-15 8-15 0l-4-92z" />
                <path d="M103 200h25l2 88-4 92c0 8-15 8-15 0l-6-92z" />
              </g>
              <path d="M100 78c-4 30 4 60 0 90s-2 24 0 30" fill="none" stroke="#9b4a8c" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" opacity=".5" />
            </svg>
            {spots.map((p) => (
              <button key={p.id} className={`st-spot ${p.id === active ? "on" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => pick(p)} aria-pressed={p.id === active} aria-label={p.name}>
                <span />
                {p.id === active && <motion.i layoutId="spot-ring" className="st-spot-ring" transition={{ type: "spring", stiffness: 300, damping: 26 }} />}
              </button>
            ))}
          </div>

          <div className="st-map-panel">
            <AnimatePresence mode="wait">
              <motion.article key={s.id} className="st-map-card" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }} transition={{ duration: 0.45, ease: EASE }} aria-live="polite">
                <span className="st-map-tag">Relief kit</span>
                <h3>{s.name}</h3>
                <p>{s.line}</p>
                <div className="st-map-actions">
                  <a className="st-btn st-btn-plum" href={s.shop} data-track="painmap_cta" data-track-spot={s.name} data-track-cta="shop">Shop the relief kit <Arrow /></a>
                  {s.assess && <a className="st-btn st-btn-line" href={s.assess} data-track="painmap_cta" data-track-spot={s.name} data-track-cta="assessment">5-min assessment</a>}
                </div>
                <a className="st-link" href={`/learn/by-health-concern/${s.learn}/`} data-track="painmap_cta" data-track-spot={s.name} data-track-cta="learn">Read expert articles <Arrow size={15} /></a>
              </motion.article>
            </AnimatePresence>
            <LayoutGroup>
              <ul className="st-map-chips">
                {spots.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => pick(p)} className={p.id === active ? "on" : ""}>
                      {p.id === active && <motion.span layoutId="chip-bg" className="st-chip-bg" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                      <span className="st-chip-t">{p.short}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </LayoutGroup>
          </div>
        </div>
      </div>
      <Marquee speed={55} className="st-tiles">
        {tiles.map((t) => <a key={t.img} href={t.href} className="st-tile"><img src={t.img} alt={t.label} loading="lazy" /></a>)}
      </Marquee>
    </section>
  );
}
