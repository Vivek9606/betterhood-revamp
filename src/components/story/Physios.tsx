import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion, type MotionValue } from "motion/react";
import { Magnetic, Arrow, EASE } from "./primitives";

interface P { name: string; role: string; img: string }
const STEP = 60;

function Orbiter({ p, i, rot, active, onPick }: { p: P; i: number; rot: MotionValue<number>; active: boolean; onPick: () => void }) {
  const t = useTransform(rot, (r) => {
    const a = i * STEP + r;
    return `translate(-50%, -50%) rotate(${a}deg) translateY(calc(var(--orbit-r) * -1)) rotate(${-a}deg)`;
  });
  return (
    <motion.button className={`st-orb ${active ? "on" : ""}`} style={{ transform: t }} onClick={onPick} aria-label={p.name} aria-pressed={active}>
      <img src={p.img} alt="" loading="lazy" />
    </motion.button>
  );
}

const COMMITMENTS = [
  "They observe real patient patterns before design begins.",
  "They push every prototype through real-world clinical testing.",
  "Every product undergoes physiotherapist review before launch.",
];

export default function Physios({ physios }: { physios: P[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });
  const n = physios.length;
  const [pick, setPick] = useState<number | null>(null);
  const scrollRot = useTransform(p, [0, 1], [0, -STEP * (n - 1)]);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollRot, "change", (r) => { setActive(((Math.round(-r / STEP) % n) + n) % n); setPick(null); });
  useMotionValueEvent(p, "change", (v) => setStep(Math.min(2, Math.floor(v * 3))));
  const current = pick ?? active;
  const ring = useTransform(p, [0, 1], [0, 90]);
  const ringRot = useTransform(ring, (v) => `rotate(${v}deg)`);
  const ph = physios[current];

  return (
    <section ref={ref} className="st-physios" aria-label="Chapter seven: clinically accountable">
      <div className="st-physios-stage">
        <div className="wrap st-physios-grid">
          <div className="st-physios-copy">
            <p className="st-kicker"><span>07</span> Clinically accountable</p>
            <h2 className="st-h2">Not just co-creators. <em>Our physios are clinically accountable.</em></h2>
            <p className="st-lead">Our physio partners don't just endorse our products, they help build them.</p>
            <ol className="st-checks">
              {COMMITMENTS.map((t, i) => (
                <li key={t} className={reduce || i <= step ? "on" : ""}><span>{i + 1}</span>{t}</li>
              ))}
            </ol>
            <Magnetic href="/physio-directory/" className="st-btn st-btn-plum">Find a certified physio <Arrow /></Magnetic>
          </div>

          <div className="st-orbit">
            <motion.div className="st-orbit-ring" style={reduce ? undefined : { transform: ringRot }} aria-hidden="true" />
            <div className="st-orbit-core" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={ph.name} className="st-core-in" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.4, ease: EASE }}>
                  <img src={ph.img} alt={ph.name} />
                  <p className="st-core-n">{ph.name}</p>
                  <p className="st-core-r">{ph.role}</p>
                  <span className="st-verified">✓ Verified physio partner</span>
                </motion.div>
              </AnimatePresence>
            </div>
            {physios.map((x, i) => <Orbiter key={x.name} p={x} i={i} rot={scrollRot} active={i === current} onPick={() => setPick(i)} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
