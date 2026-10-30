import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useVelocity, useTransform, useSpring } from "motion/react";
import { Counter, Marquee, MaskLines, Reveal } from "./primitives";

interface Props { reels: { id: string; tag: string; len: string }[]; press: { src: string; alt: string }[] }

export default function Proof({ reels, press }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const play = (r: { id: string; tag: string }) => { setOpen(r.id); import("../../scripts/tracker").then((t) => t.track("video_open", { video: r.id, tag: r.tag, zone: "Chapter six: proof" })); };
  const x = useMotionValue(0);
  const v = useVelocity(x);
  const skew = useSpring(useTransform(v, [-2000, 0, 2000], [8, 0, -8], { clamp: true }), { stiffness: 200, damping: 30 });
  useEffect(() => {
    const m = () => setLimit(Math.max(0, (track.current?.scrollWidth ?? 0) - (wrap.current?.clientWidth ?? 0)));
    m(); addEventListener("resize", m);
    return () => removeEventListener("resize", m);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  const dragged = useRef(false);

  const stats = [
    { n: <Counter to={40} suffix="K+" />, l: "Happy customers" },
    { n: <Counter to={4.6} decimals={1} suffix="★" />, l: "Average rating" },
    { n: <Counter to={980} />, l: "Physios recommend us" },
    { n: <Counter to={1000} suffix="+" />, l: "Expert articles" },
  ];

  return (
    <section className="st-proof" aria-label="Chapter six: proof">
      <div className="wrap">
        <p className="st-kicker st-kicker-light"><span>06</span> Real people, real relief</p>
        <MaskLines className="st-h2 st-light" lines={["Don't just take", <em key="e">our word for it.</em>]} />
        <ul className="st-stats">
          {stats.map((s, i) => <Reveal as="li" i={i} key={s.l}><strong>{s.n}</strong><span>{s.l}</span></Reveal>)}
        </ul>
        <p className="st-lead-light st-proof-sub">Hear from the professionals who prescribe it and the people who live with it, every day. <span className="st-hint">Drag to explore →</span></p>
      </div>

      <div ref={wrap} className="st-reels">
        <motion.div ref={track} className="st-reels-track" drag="x" dragConstraints={{ left: -limit, right: 0 }} dragElastic={0.08}
          style={{ x, skewX: skew }} onDragStart={() => (dragged.current = true)} onDragEnd={() => setTimeout(() => (dragged.current = false), 50)}>
          {reels.map((r) => (
            <motion.button key={r.id} layoutId={`reel-${r.id}`} className="st-reel" onClick={() => !dragged.current && play(r)} data-track-off whileHover={{ y: -8 }} aria-label={`Play ${r.tag} testimonial`}>
              <img src={`https://i.ytimg.com/vi/${r.id}/oar2.jpg`} onError={(e) => ((e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`)} alt="" draggable={false} loading="lazy" />
              <span className="st-reel-tag">{r.tag}</span>
              {r.len && <span className="st-reel-len">{r.len}</span>}
              <span className="st-reel-play"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg></span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="st-press">
        <p>As featured in</p>
        <Marquee speed={45}>{press.map((p) => <img key={p.src} src={p.src} alt={p.alt} loading="lazy" />)}</Marquee>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="st-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Testimonial video">
            <motion.div layoutId={`reel-${open}`} className="st-modal-frame" onClick={(e) => e.stopPropagation()}>
              <iframe src={`https://www.youtube.com/embed/${open}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title="Testimonial video" />
            </motion.div>
            <button className="st-modal-x" onClick={() => setOpen(null)} aria-label="Close video">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
