import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Rich, Reveal, EASE } from "./primitives";

interface P { name: string; role: string; image: string; badge: string; quote: string | null }
interface Props {
  clinic: { title: string; sub: string; steps: { text: string; icon: string }[] };
  physios: { title: string; people: P[] };
}

const STAGES = ["Observe", "Test", "Review"];

// "Not just co-creators": every product carries a clinical sign-off file. The three checks tick off as the file
// scrolls into view and an approval stamp lands; below it, the physios who sign off, all visible at once.
export default function Physios({ clinic, physios }: Props) {
  const file = useRef<HTMLDivElement>(null);
  const seen = useInView(file, { once: true, margin: "0px 0px -20% 0px" });
  const reduce = useReducedMotion();
  const on = reduce || seen;
  const n = clinic.steps.length;

  return (
    <section className="st-physios" aria-label="Clinically accountable physios">
      <div className="wrap">
        <div className="st-signoff">
          <div className="st-signoff-copy">
            <h2 className="st-h2"><Rich text={clinic.title} bold="em" /></h2>
            <p className="st-lead">{clinic.sub}</p>
          </div>

          <div className="st-file" ref={file}>
            <div className="st-file-head">
              <span className="st-file-tag">Product file</span>
              <span className="st-file-title">Clinical sign-off</span>
            </div>
            <ol className="st-file-steps">
              {clinic.steps.map((s, i) => (
                <li key={s.text} className={on ? "on" : ""} style={{ transitionDelay: on && !reduce ? `${0.25 + i * 0.45}s` : undefined }}>
                  <span className="st-file-icon"><img src={s.icon} alt="" width={40} height={40} loading="lazy" /></span>
                  <div>
                    <p className="st-file-stage">{String(i + 1).padStart(2, "0")} · {STAGES[i] ?? "Check"}</p>
                    <p className="st-file-text"><Rich text={s.text} /></p>
                  </div>
                  <span className="st-file-tick" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </li>
              ))}
            </ol>
            <motion.div
              className="st-stamp"
              aria-hidden="true"
              initial={reduce ? false : { opacity: 0, scale: 1.6, rotate: -4 }}
              animate={on ? { opacity: 1, scale: 1, rotate: -12 } : undefined}
              transition={{ duration: 0.7, ease: EASE, delay: reduce ? 0 : 0.35 + n * 0.45 }}
            >
              <span>Physio</span>
              <b>Approved</b>
              <span>✓ before launch</span>
            </motion.div>
          </div>
        </div>

        <div className="st-panel">
          <h3 className="st-panel-title">{physios.title}</h3>
          <ul className="st-panel-list">
            {physios.people.map((p, i) => (
              <Reveal as="li" key={p.name} i={i % 3} className="st-sign">
                <img src={p.image} alt={p.name} width={88} height={88} loading="lazy" decoding="async" />
                <div className="st-sign-body">
                  <p className="st-sign-name">{p.name}</p>
                  <p className="st-sign-role">{p.role}</p>
                  {p.quote && <p className="st-sign-quote">{p.quote}</p>}
                  {p.badge && <span className="st-verified">✓ {p.badge}</span>}
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
