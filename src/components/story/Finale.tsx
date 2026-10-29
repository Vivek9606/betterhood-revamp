import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import Figure from "./Figure";
import { MaskLines, Magnetic, Arrow, Reveal } from "./primitives";

interface Props { areas: { key: string; label: string; stat: string; href: string }[] }

export default function Finale({ areas }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "center 0.5"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const s = useTransform(p, [0, 1], [1, 0]);
  const pain = [useTransform(p, [0, 0.5], [1, 0]), useTransform(p, [0.1, 0.6], [1, 0]), useTransform(p, [0.2, 0.7], [1, 0]), useTransform(p, [0.3, 0.8], [1, 0])];
  const glow = useTransform(p, [0.6, 1], [0, 1]);

  return (
    <section ref={ref} className="st-finale" aria-label="Chapter nine: stand tall">
      <div className="wrap st-finale-grid">
        <div className="st-finale-fig">
          <motion.div className="st-finale-glow" style={{ opacity: glow }} aria-hidden="true" />
          <Figure s={s} pain={pain} tone="dark" />
        </div>
        <div className="st-finale-copy">
          <p className="st-kicker st-kicker-light"><span>09</span> Your turn</p>
          <MaskLines className="st-h2 st-light" lines={["Catch the signs early.", <em key="e">Stand tall for longer.</em>]} />
          <p className="st-lead-light">Find out how your musculoskeletal health is doing before small issues become chronic problems. Free, physio-designed, 5 minutes.</p>
          <ul className="st-areas">
            {areas.map((a, i) => (
              <Reveal as="li" i={i} key={a.key}>
                <a href={a.href}><strong>{a.label}</strong><span>{a.stat}</span><Arrow /></a>
              </Reveal>
            ))}
          </ul>
          <Magnetic href="/quiz-landing-page/" className="st-btn st-btn-sun st-btn-xl">Begin free assessment <Arrow /></Magnetic>
        </div>
      </div>
    </section>
  );
}
