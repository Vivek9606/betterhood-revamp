import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion, type MotionValue } from "motion/react";
import { Rich, EASE } from "./primitives";

interface P { name: string; role: string; image: string; badge: string; quote: string | null }
interface Props {
  clinic: { title: string; sub: string; steps: { text: string; icon: string }[] };
  physios: { title: string; people: P[] };
}
const STEP = 60;

function Orbiter({ p, i, rot, active, onPick }: { p: P; i: number; rot: MotionValue<number>; active: boolean; onPick: () => void }) {
  const t = useTransform(rot, (r) => {
    const a = i * STEP + r;
    return `translate(-50%, -50%) rotate(${a}deg) translateY(calc(var(--orbit-r) * -1)) rotate(${-a}deg)`;
  });
  return (
    <motion.button className={`st-orb ${active ? "on" : ""}`} style={{ transform: t }} onClick={onPick} aria-label={p.name} aria-pressed={active}>
      <img src={p.image} alt="" loading="lazy" decoding="async" width={108} height={108} />
    </motion.button>
  );
}

// "Not just co-creators" (the clinic promise) on the left; the physios we work with orbit on the right,
// turning one step per scroll beat. All names and credentials are also in a plain list for crawlers.
export default function Physios({ clinic, physios }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });
  const people = physios.people;
  const n = people.length;
  const [pick, setPick] = useState<number | null>(null);
  const scrollRot = useTransform(p, [0, 1], [0, -STEP * (n - 1)]);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollRot, "change", (r) => { setActive(((Math.round(-r / STEP) % n) + n) % n); setPick(null); });
  useMotionValueEvent(p, "change", (v) => setStep(Math.min(clinic.steps.length - 1, Math.floor(v * clinic.steps.length))));
  const current = pick ?? active;
  const ring = useTransform(p, [0, 1], [0, 90]);
  const ringRot = useTransform(ring, (v) => `rotate(${v}deg)`);
  const ph = people[current];

  return (
    <section ref={ref} className="st-physios" aria-label="Clinically accountable physios">
      <div className="st-physios-stage">
        <div className="wrap st-physios-grid">
          <div className="st-physios-copy">
            <h2 className="st-h2"><Rich text={clinic.title} bold="em" /></h2>
            <p className="st-lead">{clinic.sub}</p>
            <ol className="st-checks">
              {clinic.steps.map((s, i) => (
                <li key={s.text} className={reduce || i <= step ? "on" : ""}>
                  <span><img src={s.icon} alt="" width={36} height={36} loading="lazy" /></span>
                  <p><Rich text={s.text} /></p>
                </li>
              ))}
            </ol>
          </div>

          <div className="st-orbit-col">
            <h2 className="st-orbit-title">{physios.title}</h2>
            <div className="st-orbit">
              <motion.div className="st-orbit-ring" style={reduce ? undefined : { transform: ringRot }} aria-hidden="true" />
              <div className="st-orbit-core" aria-live="polite">
                <AnimatePresence mode="wait">
                  <motion.div key={ph.name} className="st-core-in" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.4, ease: EASE }}>
                    <img src={ph.image} alt={ph.name} width={92} height={92} loading="lazy" />
                    <p className="st-core-n">{ph.name}</p>
                    <p className="st-core-r">{ph.role}</p>
                    {ph.badge && <span className="st-verified">✓ {ph.badge}</span>}
                    {ph.quote && <p className="st-core-q">{ph.quote}</p>}
                  </motion.div>
                </AnimatePresence>
              </div>
              {people.map((x, i) => <Orbiter key={x.name} p={x} i={i} rot={scrollRot} active={i === current} onPick={() => setPick(i)} />)}
            </div>
            <ul className="sr-only">
              {people.map((x) => <li key={x.name}>{x.name}, {x.role}{x.badge ? ` (${x.badge})` : ""}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
