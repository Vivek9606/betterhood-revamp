import { useState } from "react";
import { motion } from "motion/react";
import { MaskLines, Rich, Arrow } from "./primitives";
import { sentences } from "../../lib/rich";

interface Props {
  eyebrow: string; more: { label: string; href: string }; title: string; sub: string;
  items: { image: string; label: string; href: string }[]; size?: number[];
}

export default function UseCases({ eyebrow, more, title, sub, items, size }: Props) {
  const [open, setOpen] = useState(0);
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
        <div className="st-acc">
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
              <motion.img layout src={u.image} alt={u.label} width={size?.[0]} height={size?.[1]} loading="lazy" decoding="async" />
              <motion.span layout className="st-acc-label"><b>0{i + 1}</b> {u.label}</motion.span>
              <span className="st-acc-go"><Arrow /></span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
