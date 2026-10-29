import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, useReducedMotion, animate, type Variants } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Headline that reveals line by line from behind a mask. Pass lines as an array. */
export function MaskLines({ lines, className = "", delay = 0, as: Tag = "h2", trigger = "view" }: {
  lines: ReactNode[]; className?: string; delay?: number; as?: "h1" | "h2" | "h3" | "p"; trigger?: "view" | "load";
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const reduce = useReducedMotion();
  const show = trigger === "load" || inView;
  const MotionTag = motion[Tag] as typeof motion.h2;
  return (
    <MotionTag ref={ref as never} className={`st-mask ${className}`}>
      {lines.map((line, i) => (
        <span className="st-mask-line" key={i}>
          <motion.span
            className="st-mask-inner"
            initial={reduce ? false : { y: "110%", rotate: 3 }}
            animate={show ? { y: "0%", rotate: 0 } : undefined}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.09 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: (i: number = 0) => ({ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE, delay: i * 0.08 } }),
};

/** Fades + lifts its children into place when scrolled into view. */
export function Reveal({ children, className = "", i = 0, as = "div" }: { children: ReactNode; className?: string; i?: number; as?: "div" | "p" | "li" | "span" }) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M className={className} variants={fadeUp} custom={i} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "0px 0px -10% 0px" }}>
      {children}
    </M>
  );
}

/** Animated number that counts up once visible. */
export function Counter({ to, decimals = 0, suffix = "", prefix = "" }: { to: number; decimals?: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setVal(to); return; }
    const c = animate(0, to, { duration: 2, ease: EASE, onUpdate: setVal });
    return () => c.stop();
  }, [inView, to, reduce]);
  return <span ref={ref}>{prefix}{val.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Button/link that leans toward the cursor. */
export function Magnetic({ children, href, className = "", strength = 0.35, ...rest }: { children: ReactNode; href: string; className?: string; strength?: number; target?: string; rel?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.96 }}
      {...rest}
    >
      {children}
    </motion.a>
  );
}

/** Infinite horizontal marquee; speed in seconds per loop. */
export function Marquee({ children, speed = 40, reverse = false, className = "" }: { children: ReactNode; speed?: number; reverse?: boolean; className?: string }) {
  return (
    <div className={`st-marquee ${className}`}>
      <div className="st-marquee-track" style={{ animationDuration: `${speed}s`, animationDirection: reverse ? "reverse" : "normal" }}>
        <div className="st-marquee-group">{children}</div>
        <div className="st-marquee-group" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

export const Arrow = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
