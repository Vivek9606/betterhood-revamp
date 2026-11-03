import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useVelocity, useTransform, useSpring } from "motion/react";
import { MaskLines } from "./primitives";

interface Reel { id: string; tag: string; length: string | null }
interface Props { title: string; sub: string; reels: Reel[] }

// "Don't just take our word for it": draggable testimonial reels that open in a shared-element player.
export default function Proof({ title, sub, reels }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const play = (r: Reel) => setOpen(r.id);
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
  // "Don't just take our word for it." -> "Don't just take" / "our word for it."
  const words = title.split(" ");
  const cut = Math.ceil(words.length / 2) - 1;

  return (
    <section className="st-proof" aria-label="Testimonials">
      <div className="wrap">
        <MaskLines className="st-h2 st-light" lines={[words.slice(0, cut).join(" "), <em key="e">{words.slice(cut).join(" ")}</em>]} />
        <p className="st-lead-light st-proof-sub">{sub} <span className="st-hint">Drag to explore →</span></p>
      </div>

      <div ref={wrap} className="st-reels">
        <motion.div ref={track} className="st-reels-track" drag="x" dragConstraints={{ left: -limit, right: 0 }} dragElastic={0.08}
          style={{ x, skewX: skew }} onDragStart={() => (dragged.current = true)} onDragEnd={() => setTimeout(() => (dragged.current = false), 50)}>
          {reels.map((r) => (
            <motion.button key={r.id} layoutId={`reel-${r.id}`} className="st-reel" onClick={() => !dragged.current && play(r)} whileHover={{ y: -8 }} aria-label={`Play ${r.tag} testimonial video`}>
              <img src={`https://i.ytimg.com/vi/${r.id}/oar2.jpg`} onError={(e) => ((e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`)} alt="" width={230} height={409} draggable={false} loading="lazy" decoding="async" />
              <span className="st-reel-tag">{r.tag}</span>
              {r.length && <span className="st-reel-len">{r.length}</span>}
              <span className="st-reel-play"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg></span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="st-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Testimonial video">
            <motion.div layoutId={`reel-${open}`} className="st-modal-frame" onClick={(e) => e.stopPropagation()}>
              <iframe src={`https://www.youtube-nocookie.com/embed/${open}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title="Testimonial video" />
            </motion.div>
            <button className="st-modal-x" onClick={() => setOpen(null)} aria-label="Close video">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
