import { useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MaskLines, Rich, Arrow, EASE } from "./primitives";
import { sentences } from "../../lib/rich";

interface Item { image: string; label: string; href: string }
interface Props {
  eyebrow: string; more: { label: string; href: string }; title: string; sub: string;
  items: Item[]; size?: number[];
}

// "A day in your life": each kit is placed at the moment of the day it's for. The planner on the left picks the
// moment; the card on the right shows that kit in a frame tinted like the time of day.
type Moment = { time: string; moment: string; sky: string; order: number };
const MOMENTS: Record<string, Moment> = {
  gym: { time: "6:30 AM", moment: "Morning workout", sky: "linear-gradient(160deg, #ffe0b8 0%, #fff4e2 70%)", order: 0 },
  "desk-ergonomic": { time: "10:00 AM", moment: "Deep work at the desk", sky: "linear-gradient(160deg, #d9ecfb 0%, #f4f9fe 70%)", order: 1 },
  "badminton-essentials": { time: "6:30 PM", moment: "Evening game", sky: "linear-gradient(160deg, #f6c9a8 0%, #ead6e5 75%)", order: 2 },
  "long-drive-spine-care": { time: "Saturday", moment: "Weekend road trip", sky: "linear-gradient(160deg, #c9efd9 0%, #f1faf5 70%)", order: 3 },
  "parents-wellness": { time: "Sunday", moment: "Time with your parents", sky: "linear-gradient(160deg, #ead6e5 0%, #fbf6fa 70%)", order: 4 },
};
const slug = (href: string) => href.replace(/\/$/, "").split("/").pop() ?? "";
const momentOf = (u: Item, i: number): Moment =>
  MOMENTS[slug(u.href)] ?? { time: `0${i + 1}`, moment: u.label, sky: "linear-gradient(160deg, #ead6e5, #fbf6fa)", order: 10 + i };

export default function UseCases({ eyebrow, more, title, sub, items, size }: Props) {
  const reduce = useReducedMotion();
  const day = items.map((u, i) => ({ ...u, ...momentOf(u, i) })).sort((a, b) => a.order - b.order);
  const [open, setOpen] = useState(0);
  const cur = day[open]!;

  // arrow keys move along the day, as in any tab list
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (open + step + day.length) % day.length;
    setOpen(next);
    document.getElementById(`st-day-tab-${next}`)?.focus();
  };

  return (
    <section className="st-uses" aria-label="Shop by use case">
      <div className="wrap">
        <div className="st-uses-head">
          <div>
            <p className="st-kicker">{eyebrow}</p>
            <MaskLines className="st-h2" lines={sentences(title).map((l, i) => <Rich key={i} text={l} bold="em" />)} />
          </div>
          <div>
            <p className="st-lead">{sub}</p>
            <a className="st-link" href={more.href}>{more.label} <Arrow size={15} /></a>
          </div>
        </div>

        <div className="st-day" style={{ ["--n" as string]: day.length, ["--i" as string]: open }}>
          <div className="st-day-plan" role="tablist" aria-label="Moments in your day" aria-orientation="vertical">
            <span className="st-day-line" aria-hidden="true"><span className="st-day-sun" /></span>
            {day.map((u, i) => (
              <button
                key={u.href}
                id={`st-day-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={open === i}
                aria-controls="st-day-panel"
                tabIndex={open === i ? 0 : -1}
                className={`st-day-tab ${open === i ? "on" : ""}`}
                onClick={() => setOpen(i)}
                onMouseEnter={() => setOpen(i)}
                onKeyDown={onKey}
              >
                <span className="st-day-time">{u.time}</span>
                <span className="st-day-what">
                  <span className="st-day-moment">{u.moment}</span>
                  <span className="st-day-kit">{u.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="st-day-card" id="st-day-panel" role="tabpanel" aria-labelledby={`st-day-tab-${open}`} style={{ background: cur.sky }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.a
                key={cur.href}
                href={cur.href}
                className="st-day-shot"
                initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <img src={cur.image} alt={cur.label} width={size?.[0]} height={size?.[1]} loading="lazy" decoding="async" />
                <span className="st-day-chip">{cur.time} · {cur.moment}</span>
              </motion.a>
            </AnimatePresence>
            <div className="st-day-foot">
              <div>
                <p className="st-day-for">The kit for it</p>
                <p className="st-day-name">{cur.label}</p>
              </div>
              <a className="st-btn st-btn-plum" href={cur.href}>Shop this kit <Arrow size={16} /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
