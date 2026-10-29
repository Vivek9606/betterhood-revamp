import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "motion/react";
import { Reveal } from "./primitives";

interface Step { n: string; title: string; text: string; img: string; tone: "cream" | "lilac" | "sun" | "mint" | "plum" }
interface Props { steps: Step[] }

export default function Process({ steps }: Props) {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [dist, setDist] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  useEffect(() => {
    const measure = () => {
      setHorizontal(innerWidth > 760 && !reduce);
      if (track.current) setDist(Math.max(0, track.current.scrollWidth - innerWidth));
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [reduce]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 30 });
  const x = useTransform(p, [0, 1], [0, -dist]);
  const bar = useTransform(p, [0, 1], ["0%", "100%"]);

  const intro = (
    <div className="st-proc-intro">
      <p className="st-kicker"><span>03</span> How we build</p>
      <h2 className="st-h2">Co-created with physiotherapists. <em>Designed for everyday life.</em></h2>
      <p className="st-lead">Our physio partners don't just endorse our products, they help build them — and they're clinically accountable for every one.</p>
    </div>
  );

  if (!horizontal) {
    return (
      <section className="st-proc st-proc-stack" aria-label="Chapter three: how we build">
        <div className="wrap">
          {intro}
          {steps.map((s, i) => (
            <Reveal key={s.n} i={i % 2} className={`st-step st-tone-${s.tone}`}>
              <span className="st-step-n">{s.n}</span>
              <img src={s.img} alt="" loading="lazy" />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="st-proc" style={{ height: `calc(100vh + ${dist}px)` }} aria-label="Chapter three: how we build">
      <div className="st-proc-stage">
        <motion.div ref={track} className="st-proc-track" style={{ x }}>
          {intro}
          {steps.map((s) => (
            <article key={s.n} className={`st-step st-tone-${s.tone}`}>
              <span className="st-step-n">{s.n}</span>
              <div className="st-step-img"><img src={s.img} alt="" loading="lazy" /></div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
          <div className="st-proc-end" aria-hidden="true">→</div>
        </motion.div>
        <div className="st-rail wrap"><motion.i style={{ width: bar }} /></div>
      </div>
    </section>
  );
}
