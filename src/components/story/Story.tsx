import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import { MaskLines, Rich, Reveal } from "./primitives";
import { sentences } from "../../lib/rich";

interface Props {
  title: string;
  cards: { title: string; text: string; pin: string }[];
  background: { desktop: string; mobile: string };
  art: string[];
  sizes?: Record<string, number[]>;
}

// where the line drawings float (same spots as the live page), and how fast each drifts on scroll
const SPOTS = [
  { x: 4, y: 40, w: 120, speed: -60 }, // the live page has this at 15%/25%, which sits behind the larger headline here
  { x: 70, y: 75, w: 180, speed: 50 },
  { x: 10, y: 84, w: 160, speed: -40 },
  { x: 80, y: 40, w: 170, speed: 70 },
];

function Art({ src, i, p, wh }: { src: string; i: number; p: MotionValue<number>; wh?: number[] }) {
  const s = SPOTS[i % SPOTS.length];
  const y = useTransform(p, [0, 1], [-s.speed, s.speed]);
  const r = useTransform(p, [0, 1], [i % 2 ? -6 : 6, i % 2 ? 6 : -6]);
  return <motion.img className="st-story-art" src={src} alt="" width={wh?.[0]} height={wh?.[1]} loading="lazy" decoding="async" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.w, y, rotate: r }} />;
}

export default function Story({ title, cards, background, art, sizes = {} }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <section ref={ref} className="st-story" aria-label="Co-created with physiotherapists">
      <picture className="st-story-bg" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet={background.mobile} />
        <img src={background.desktop} alt="" width={sizes[background.desktop]?.[0]} height={sizes[background.desktop]?.[1]} loading="lazy" decoding="async" />
      </picture>
      {!reduce && art.map((a, i) => <Art key={a} src={a} i={i} p={scrollYProgress} wh={sizes[a]} />)}
      <div className="wrap st-story-inner">
        <MaskLines className="st-h2" lines={sentences(title).map((l, i) => <Rich key={i} text={l} bold="em" />)} />
        <div className="st-postcards">
          {cards.map((c, i) => (
            <Reveal key={c.title} i={i} className={`st-postcard ${i % 2 ? "tint-gold" : "tint-pink"}`}>
              <img className="st-pin" src={c.pin} alt="" loading="lazy" width={56} height={60} />
              <div className="st-postcard-in">
                <h3>{c.title}</h3>
                <p><Rich text={c.text} /></p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
