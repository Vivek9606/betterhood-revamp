import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { Magnetic, Arrow } from "./primitives";
import { segs } from "../../lib/rich";

interface Props {
  title: string; sub: string; cta: { label: string; href: string };
  image: string; imageMobile: string; size?: number[]; sizeMobile?: number[];
}

// Message on the left, the stretching figure framed in an arch on the right (standing tall is the
// brand idea). The headline and photo are painted on the first frame (they're the LCP), and only the
// scroll parallax waits for hydration; the entrance motion is plain CSS (story.css).
export default function Hero({ title, sub, cta, image, imageMobile, size, sizeMobile }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 800], [0, 90]);
  const archY = useTransform(scrollY, [0, 800], [0, -40]);
  // "[[b]]Physio trusted pain care[[/b]] for everyday movement": the bold part, then the accent line
  const parts = segs(title);
  const lead = parts.filter((s) => s.b).map((s) => s.t).join(" ").trim();
  const rest = parts.filter((s) => !s.b).map((s) => s.t).join("").trim();

  return (
    <section className="st-hero" aria-label="Hero">
      <div className="wrap st-hero-grid">
        <div className="st-hero-copy">
          <h1 className="st-display st-hero-h1">
            <span className="st-hl" style={{ ["--i" as never]: 0 }}>{lead || rest}</span>{" "}
            {lead && <em className="st-hl" style={{ ["--i" as never]: 1 }}>{rest}</em>}
          </h1>
          <p className="st-hero-sub st-in" style={{ ["--d" as never]: "0.35s" }}>{sub}</p>
          <div className="st-hero-cta st-in" style={{ ["--d" as never]: "0.5s" }}>
            <Magnetic href={cta.href} className="st-btn st-btn-plum">{cta.label} <Arrow /></Magnetic>
          </div>
        </div>

        <motion.div className="st-arch" style={reduce ? undefined : { y: archY }}>
          <motion.picture style={reduce ? undefined : { y: imgY }}>
            <source media="(max-width: 781px)" srcSet={imageMobile} width={sizeMobile?.[0]} height={sizeMobile?.[1]} />
            <img src={image} alt="A smiling woman sitting cross-legged, stretching her arms overhead" fetchPriority="high" decoding="async" width={size?.[0]} height={size?.[1]} />
          </motion.picture>
        </motion.div>
      </div>
    </section>
  );
}
