import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import Gap from "./Gap";

const QUOTE = "Why do we age? Are chronic pain and cognitive decline inevitable, or can we influence the aging process? We noticed these issues in our parents and saw signs of aging appearing in ourselves as early as in our 30s.";

function Word({ w, i, n, p }: { w: string; i: number; n: number; p: MotionValue<number> }) {
  const start = i / n, end = start + 1.5 / n;
  const o = useTransform(p, [start, end], [0.14, 1]);
  return <motion.span style={{ opacity: o }}>{w} </motion.span>;
}

export default function Origin({ founders }: { founders: string; team?: string }) {
  const quoteRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: q } = useScroll({ target: quoteRef, offset: ["start 0.85", "end 0.5"] });
  const words = QUOTE.split(" ");

  return (
    <section className="st-origin" aria-label="Chapter two: why we exist">
      <div className="wrap">
        <p className="st-kicker st-kicker-light"><span>02</span> Why we exist</p>
        <div ref={quoteRef} className="st-quote" aria-label={QUOTE}>
          <span aria-hidden="true">{reduce ? QUOTE : words.map((w, i) => <Word key={i} w={w} i={i} n={words.length} p={q} />)}</span>
        </div>
      </div>

      <Gap founders={founders} />
    </section>
  );
}
