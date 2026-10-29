import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion } from "motion/react";
import Figure from "./Figure";
import { EASE } from "./primitives";

const ages = [
  { age: "20s", title: "Posture problems begin", text: "Tech neck, wrist strain and poor desk habits start building the foundation for chronic pain." },
  { age: "30s", title: "The decade it shows up", text: "Lower back pain, knee issues and repetitive strain become hard to ignore for the first time." },
  { age: "40s", title: "Compensation kicks in", text: "Your body starts compensating for old injuries. What feels manageable starts limiting how you move." },
  { age: "50s+", title: "Chronic becomes daily", text: "Arthritis, spondylosis and joint degeneration peak. By then, lasting damage is harder to reverse." },
];

export default function Decades() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const s = useTransform(p, [0.08, 0.92], [0, 1], { clamp: true });
  const pain = [useTransform(p, [0.1, 0.2], [0, 1]), useTransform(p, [0.32, 0.42], [0, 1]), useTransform(p, [0.4, 0.5], [0, 1]), useTransform(p, [0.6, 0.7], [0, 1])];
  const [i, setI] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setI(Math.min(3, Math.max(0, Math.floor(v * 4 * 0.999)))));
  const bar = useTransform(p, [0, 1], ["0%", "100%"]);
  const sStatic = useTransform(p, () => 0.55);
  const a = ages[i];

  return (
    <section ref={ref} className="st-decades" id="chapter-1" aria-label="Chapter one: it starts quietly">
      <div className="st-decades-stage">
        <div className="wrap st-decades-grid">
          <div className="st-decades-copy">
            <p className="st-kicker"><span>01</span> It starts quietly</p>
            <h2 className="st-h2">Most people <em>wait too long.</em></h2>
            <p className="st-lead">Pain shows up differently at every age. Most people ignore the early signs until it's much harder to reverse. Here is what your body is most vulnerable to, and when.</p>
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
