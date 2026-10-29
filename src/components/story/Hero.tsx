import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { MaskLines, Magnetic, Arrow, EASE } from "./primitives";

interface Props { image: string }

// Fills the first screen exactly: message on the left, the stretching figure framed in an arch
// (standing tall is the whole brand idea) on the right.
export default function Hero({ image }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 800], [0, 90]);
  const archY = useTransform(scrollY, [0, 800], [0, -40]);

  return (
    <section className="st-hero" aria-label="Introduction">
      <div className="wrap st-hero-grid">
        <div className="st-hero-copy">
          <MaskLines as="h1" trigger="load" delay={0.1} className="st-display" lines={["Physio trusted", "pain care for", <em key="e">everyday movement.</em>]} />
          <motion.p className="st-hero-sub" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}>
            To move better. Recover better. Stay active for longer.
          </motion.p>
          <motion.div className="st-hero-cta" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.65 }}>
            <Magnetic href="#find" className="st-btn st-btn-plum">Find your solution <Arrow /></Magnetic>
            <a href="/quiz-landing-page/" className="st-link">Take the free assessment</a>
          </motion.div>
          <motion.ul className="st-trust" aria-label="Why people trust betterhood" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.9 }}>
            <li><strong>40K+</strong><span>happy customers</span></li>
            <li><strong>4.6★</strong><span>average rating</span></li>
            <li><strong>IAP</strong><span>certified</span></li>
          </motion.ul>
        </div>

        <motion.div className="st-arch" style={reduce ? undefined : { y: archY }}
          initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0% round 999px 999px 32px 32px)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0% round 999px 999px 32px 32px)" }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}>
          <motion.img src={image} alt="A woman stretching tall, smiling" fetchPriority="high"
            style={reduce ? undefined : { y: imgY }}
            initial={reduce ? false : { scale: 1.25 }} animate={{ scale: 1.08 }} transition={{ duration: 1.8, ease: EASE, delay: 0.2 }} />
          <span className="st-arch-tag">Co-created with physiotherapists</span>
        </motion.div>
      </div>
    </section>
  );
}
