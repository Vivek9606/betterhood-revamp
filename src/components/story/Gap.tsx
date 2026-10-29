import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion } from "motion/react";
import { Magnetic, Arrow, EASE } from "./primitives";

const DECADES = [20, 30, 40, 50, 60, 70, 80];
const at = (age: number) => ((age - 20) / 60) * 100; // % along the track

const BEATS = [
  { k: "01", line: <>Current practices often focus on <em className="coral">treatment only after issues arise.</em></>, sub: "While research in longevity and physiotherapy offers solutions to extend healthspan, care usually begins once pain has already arrived." },
  { k: "02", line: <>Yet the signs show up <em>as early as our 30s.</em></>, sub: "We noticed these issues in our parents — and saw signs of aging appearing in ourselves." },
  { k: "03", line: <>That's the gap <em>betterhood fills.</em></>, sub: "Preventive, age-tailored care for your muscles, bones and joints — long before treatment becomes the only option." },
];

export default function Gap({ founders }: { founders: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 28 });
  const [beat, setBeat] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setBeat(v < 0.26 ? 0 : v < 0.5 ? 1 : v < 0.74 ? 2 : 3));

  // the late "treatment" zone draws in, then the gold band sweeps across the gap
  const lateW = useTransform(p, [0.04, 0.2], [0, 100 - at(50)]);
  const fillW = useTransform(p, [0.5, 0.7], [0, at(50) - at(30)]);
  const lateWs = useTransform(lateW, (v) => `${v}%`);
  const fillWs = useTransform(fillW, (v) => `${v}%`);
  const fillLabel = useTransform(p, [0.62, 0.7], [0, 1]);
  const youX = useTransform(p, [0.02, 0.3, 0.5, 0.7], [at(20), at(30), at(30), at(50)]);
  const youLeft = useTransform(youX, (v) => `${v}%`);
  const trackScale = useTransform(p, [0.74, 0.86], [1, 0.94]);
  const trackO = useTransform(p, [0.74, 0.86], [1, 0.45]);
  const trackY = useTransform(p, [0.74, 0.86], [0, -30]);
  const [youAge, setYouAge] = useState(20);
  useMotionValueEvent(youX, "change", (v) => setYouAge(20 + (v / 100) * 60));

  const finalStatic = reduce;
  const b = BEATS[Math.min(beat, 2)];

  return (
    <section ref={ref} className="st-gap" aria-label="The gap betterhood fills">
      <div className="st-gap-stage">
        <div className="wrap st-gap-inner">
          <div className="st-gap-top">
            <ol className="st-beats" aria-hidden="true">
              {BEATS.map((x, i) => <li key={x.k} className={i === Math.min(beat, 2) ? "on" : i < beat ? "passed" : ""}>{x.k}</li>)}
            </ol>
            <div className="st-gap-copy" aria-live="polite">
              <AnimatePresence mode="wait">
                {beat < 3 || finalStatic ? (
                  <motion.div key={finalStatic ? "all" : b.k} initial={{ opacity: 0, y: 30, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -30, filter: "blur(8px)" }} transition={{ duration: 0.55, ease: EASE }}>
                    <h3 className="st-gap-line">{b.line}</h3>
                    <p className="st-gap-sub">{b.sub}</p>
                  </motion.div>
                ) : (
                  <motion.div key="mission" className="st-mission" initial={{ opacity: 0, y: 30, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: EASE }}>
                    <p className="st-statement">We are building ‘betterhood' to fill this gap with a holistic, age-tailored approach — striving to become <em>India's most comprehensive pain-care ecosystem.</em></p>
                    <div className="st-sign-row">
                      <img src={founders} alt="Neha and Vikram, founders of betterhood" loading="lazy" />
                      <div><p className="st-sign">Neha & Vikram</p><p className="st-sign-role">Founders, betterhood</p></div>
                      <Magnetic href="/about-us/" className="st-btn st-btn-glass">Read our story <Arrow /></Magnetic>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <motion.div className="st-life" style={reduce ? undefined : { scale: trackScale, opacity: trackO, y: trackY }}>
            <div className="st-life-track">
              {DECADES.slice(1, -1).map((d) => <i key={d} className="st-life-tick" style={{ left: `${at(d)}%` }} />)}
              <motion.span className="st-life-late" style={{ left: `${at(50)}%`, width: reduce ? `${100 - at(50)}%` : lateWs }}>
                <span>Treatment begins</span>
              </motion.span>
              <motion.span className="st-life-fill" style={{ left: `${at(30)}%`, width: reduce ? `${at(50) - at(30)}%` : fillWs }}>
                <motion.span style={reduce ? undefined : { opacity: fillLabel }}>The gap betterhood fills</motion.span>
              </motion.span>
              {!reduce && (
                <motion.span className="st-you" style={{ left: youLeft }}>
                  <b>You</b>
                </motion.span>
              )}
            </div>
            <ol className="st-life-ages">
              {DECADES.map((d) => (
                <li key={d} style={{ left: `${at(d)}%` }} className={youAge >= d - 0.5 ? "lit" : ""}>
                  {d}<small>s</small>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
