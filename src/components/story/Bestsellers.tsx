import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "motion/react";
import { MaskLines, Arrow } from "./primitives";

export interface Prod { handle: string; title: string; price: number; compare: number | null; image: string; image2: string; rating: number | null; reviews: number }
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function TiltCard({ p, base }: { p: Prod; base: string }) {
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 200, damping: 20 });
  const glare = useTransform([mx, my] as never, ([x, y]: number[]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,.45), transparent 55%)`);
  const off = p.compare && p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;
  const img = (s: string) => `${s}${s.includes("?") ? "&" : "?"}width=600`;
  return (
    <motion.a href={base + p.handle} target="_blank" rel="noopener" className="st-prod" style={{ rotateX: rx, rotateY: ry }} draggable={false}
      onPointerMove={(e) => { if (e.pointerType !== "mouse") return; const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height); }}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}>
      <div className="st-prod-img">
        <img src={img(p.image)} alt={p.title} loading="lazy" draggable={false} />
        {p.image2 && <img className="alt" src={img(p.image2)} alt="" loading="lazy" draggable={false} />}
        {off >= 10 && <span className="st-off">−{off}%</span>}
        <motion.span className="st-glare" style={{ background: glare }} />
      </div>
      <div className="st-prod-body">
        <p className="st-prod-t">{p.title}</p>
        {p.rating && <p className="st-prod-r">★ {p.rating} <span>· {p.reviews} reviews</span></p>}
        <p className="st-prod-p"><strong>{inr(p.price)}</strong>{off > 0 && <s>{inr(p.compare!)}</s>}</p>
      </div>
    </motion.a>
  );
}

export default function Bestsellers({ products, base, all }: { products: Prod[]; base: string; all: string }) {
  const wrap = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(0);
  const x = useMotionValue(0);
  const dragged = useRef(false);
  useEffect(() => { const m = () => setLimit(Math.max(0, (track.current?.scrollWidth ?? 0) - (wrap.current?.clientWidth ?? 0))); m(); addEventListener("resize", m); return () => removeEventListener("resize", m); }, []);
  const nudge = (d: number) => animate(x, Math.min(0, Math.max(-limit, x.get() - d * 600)), { type: "spring", stiffness: 140, damping: 26 });

  return (
    <section className="st-best" aria-label="Chapter eight: bestsellers">
      <div className="wrap st-best-head">
        <div>
          <p className="st-kicker"><span>08</span> Bestsellers</p>
          <MaskLines className="st-h2" lines={["One place.", <em key="e">Everything your pain needs.</em>]} />
        </div>
        <div className="st-best-ctrl">
          <button onClick={() => nudge(-1)} aria-label="Previous products">←</button>
          <button onClick={() => nudge(1)} aria-label="More products">→</button>
          <a className="st-btn st-btn-line" href={all}>Shop all <Arrow /></a>
        </div>
      </div>
      <div ref={wrap} className="st-best-wrap">
        <motion.div ref={track} className="st-best-track" drag="x" dragConstraints={{ left: -limit, right: 0 }} dragElastic={0.06} style={{ x }}
          onDragStart={() => (dragged.current = true)} onDragEnd={() => setTimeout(() => (dragged.current = false), 60)}
          onClickCapture={(e) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); } }}>
          {products.map((p) => <TiltCard key={p.handle} p={p} base={base} />)}
        </motion.div>
      </div>
    </section>
  );
}
