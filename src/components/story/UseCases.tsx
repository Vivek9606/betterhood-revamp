import { useState } from "react";
import { motion } from "motion/react";
import { MaskLines, Arrow } from "./primitives";

interface Props { items: { img: string; label: string; href: string }[]; all: string }

export default function UseCases({ items, all }: Props) {
  const [open, setOpen] = useState(0);
  return (
    <section className="st-uses" aria-label="Chapter five: built for how you live">
      <div className="wrap">
        <div className="st-uses-head">
          <div>
            <p className="st-kicker"><span>05</span> Shop by use case</p>
            <MaskLines className="st-h2" lines={["Built for", <em key="e">how you live.</em>]} />
          </div>
          <div>
            <p className="st-lead">Shop physio-curated kits for work, workouts, travel, and beyond.</p>
            <a className="st-link" href={all}>See all use cases <Arrow size={15} /></a>
          </div>
        </div>
        <div className="st-acc" onMouseLeave={() => {}}>
          {items.map((u, i) => (
            <motion.a
              key={u.label}
              href={u.href}
              layout
              className={`st-acc-item ${open === i ? "open" : ""}`}
              onMouseEnter={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              transition={{ layout: { type: "spring", stiffness: 160, damping: 24 } }}
            >
              <motion.img layout src={u.img} alt={u.label} loading="lazy" />
              <motion.span layout className="st-acc-label"><b>0{i + 1}</b> {u.label}</motion.span>
              <span className="st-acc-go"><Arrow /></span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
