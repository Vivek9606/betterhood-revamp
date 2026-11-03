import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion } from "motion/react";
import Figure from "./Figure";
import { EASE, Rich } from "./primitives";

interface Props { title: string; sub: string; intro: string; decades: { age: string; title: string; text: string }[] }

export default function Decades({ title, sub, intro, decades: ages }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const s = useTransform(p, [0.08, 0.92], [0, 1], { clamp: true });
  const pain = [useTransform(p, [0.1, 0.2], [0, 1]), useTransform(p, [0.32, 0.42], [0, 1]), useTransform(p, [0.4, 0.5], [0, 1]), useTransform(p, [0.6, 0.7], [0, 1])];
  const [i, setI] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setI(Math.min(ages.length - 1, Math.max(0, Math.floor(v * ages.length * 0.999)))));
  const bar = useTransform(p, [0, 1], ["0%", "100%"]);
  const sStatic = useTransform(p, () => 0.55);
  const a = ages[i];

  return (
    <section ref={ref} className="st-decades" id="chapter-1" aria-label="Most people wait too long">
      <div className="st-decades-stage">
        <div className="wrap st-decades-grid">
          <div className="st-decades-copy">
            <h2 className="st-h2"><Rich text={title} bold="em" /></h2>
            <p className="st-lead">{sub}</p>
            <p className="st-age-intro"><Rich text={intro} /></p>
            <ol className="st-ages" aria-label="Decades">
              {ages.map((x, j) => <li key={x.age} className={j === i ? "on" : j < i ? "past" : ""}>{x.age}</li>)}
            </ol>
            <div className="st-age-card" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={a.age} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.5, ease: EASE }}>
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* all four decades, for crawlers and screen readers (the card above shows one at a time) */}
            <dl className="sr-only">
              {ages.map((x) => <div key={x.age}><dt>{x.age}: {x.title}</dt><dd>{x.text}</dd></div>)}
            </dl>
          </div>

          <div className="st-decades-visual">
            <AnimatePresence mode="popLayout">
              <motion.span key={a.age} className="st-age-big" initial={{ opacity: 0, y: 80, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -80, filter: "blur(10px)" }} transition={{ duration: 0.7, ease: EASE }} aria-hidden="true">{a.age}</motion.span>
            </AnimatePresence>
            <Figure s={reduce ? sStatic : s} pain={pain} />
          </div>
        </div>
        <div className="st-rail wrap" aria-hidden="true"><motion.i style={{ width: bar }} /></div>
      </div>
    </section>
  );
}
