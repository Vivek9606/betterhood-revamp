import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import Figure from "./Figure";
import { Magnetic, Arrow, Rich } from "./primitives";

interface Props { title: string; text: string; cta: { label: string; href: string } }

// "Catch the Signs Early": the slouched figure from the decades chapter stands tall again.
export default function Finale({ title, text, cta }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "center 0.5"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const s = useTransform(p, [0, 1], [1, 0]);
  const pain = [useTransform(p, [0, 0.5], [1, 0]), useTransform(p, [0.1, 0.6], [1, 0]), useTransform(p, [0.2, 0.7], [1, 0]), useTransform(p, [0.3, 0.8], [1, 0])];
  const glow = useTransform(p, [0.6, 1], [0, 1]);

  return (
    <section ref={ref} className="st-finale" id="assessment" aria-label="Catch the signs early">
      <div className="wrap st-finale-grid">
        <div className="st-finale-fig">
          <motion.div className="st-finale-glow" style={{ opacity: glow }} aria-hidden="true" />
          <Figure s={s} pain={pain} tone="dark" />
        </div>
        <div className="st-finale-copy">
          <h2 className="st-h2 st-light"><Rich text={title} bold="em" /></h2>
          <p className="st-lead-light">{text}</p>
          <Magnetic href={cta.href} className="st-btn st-btn-sun st-btn-xl">{cta.label} <Arrow /></Magnetic>
        </div>
      </div>
    </section>
  );
}
