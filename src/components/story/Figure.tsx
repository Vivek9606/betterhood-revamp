import { motion, useTransform, type MotionValue } from "motion/react";
import { lerp } from "./primitives";

// Side-profile figure whose posture is driven by s (0 = standing tall, 1 = fully slouched).
const U = { hx: 150, hy: 70, tx: 150, ty: 112, c1x: 152, c1y: 182, c2x: 148, c2y: 262, ax: 150, ay: 138, hdx: 150, hdy: 288, kx: 151, ky: 400 };
const S = { hx: 214, hy: 132, tx: 197, ty: 152, c1x: 116, c1y: 168, c2x: 116, c2y: 262, ax: 172, ay: 160, hdx: 208, hdy: 270, kx: 170, ky: 396 };
const at = (s: number) => Object.fromEntries(Object.keys(U).map((k) => [k, lerp(U[k as keyof typeof U], S[k as keyof typeof S], s)])) as typeof U;

interface Props { s: MotionValue<number>; pain?: MotionValue<number>[]; tone?: "light" | "dark" }

export default function Figure({ s, pain = [], tone = "light" }: Props) {
  const spine = useTransform(s, (v) => { const g = at(v); return `M${g.tx} ${g.ty} C ${g.c1x} ${g.c1y}, ${g.c2x} ${g.c2y}, 150 322`; });
  const neck = useTransform(s, (v) => { const g = at(v); return `M${g.hx - (g.hx - g.tx) * 0.35} ${g.hy + 30} L ${g.tx} ${g.ty}`; });
  const arm = useTransform(s, (v) => { const g = at(v); const ex = (g.ax + g.hdx) / 2 + 14 * v, ey = (g.ay + g.hdy) / 2; return `M${g.ax} ${g.ay} Q ${ex} ${ey}, ${g.hdx} ${g.hdy}`; });
  const leg = useTransform(s, (v) => { const g = at(v); return `M150 326 Q ${g.kx + 6} ${(326 + g.ky) / 2}, ${g.kx} ${g.ky} L 148 470`; });
  const leg2 = useTransform(s, (v) => { const g = at(v); return `M150 326 Q ${g.kx - 4} ${(326 + g.ky) / 2}, ${g.kx - 10} ${g.ky + 2} L 132 470`; });
  const hx = useTransform(s, (v) => at(v).hx);
  const hy = useTransform(s, (v) => at(v).hy);
  // pain points: neck, lower back, knee, shoulder
  const pts = [
    { x: useTransform(s, (v) => at(v).tx), y: useTransform(s, (v) => at(v).ty - 6) },
    { x: useTransform(s, (v) => lerp(148, 128, v)), y: useTransform(s, () => 272) },
    { x: useTransform(s, (v) => at(v).kx), y: useTransform(s, (v) => at(v).ky) },
    { x: useTransform(s, (v) => at(v).ax), y: useTransform(s, (v) => at(v).ay) },
  ];
  const ink = tone === "dark" ? "#f5eaf2" : "#3a1240";
  const soft = tone === "dark" ? "rgba(245,234,242,.35)" : "rgba(94,25,81,.25)";

  return (
    <svg viewBox="40 10 240 480" className="st-figure" aria-hidden="true">
      <defs>
        <radialGradient id={`glow-${tone}`}><stop offset="0" stopColor="#ff7a59" stopOpacity=".9" /><stop offset="1" stopColor="#ff7a59" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="150" cy="474" rx="70" ry="8" fill={soft} />
      <motion.path d={leg2} stroke={soft} strokeWidth="12" strokeLinecap="round" fill="none" />
      <motion.path d={leg} stroke={ink} strokeWidth="12" strokeLinecap="round" fill="none" />
      <motion.path d={spine} stroke={soft} strokeWidth="22" strokeLinecap="round" fill="none" />
      <motion.path d={spine} stroke={ink} strokeWidth="9" strokeLinecap="round" strokeDasharray="9 7" fill="none" />
      <motion.path d={neck} stroke={ink} strokeWidth="9" strokeLinecap="round" fill="none" />
      <motion.path d={arm} stroke={ink} strokeWidth="10" strokeLinecap="round" fill="none" opacity=".85" />
      <motion.circle cx={hx} cy={hy} r="28" fill={ink} />
      {pain.map((o, i) => (
        <motion.g key={i} style={{ opacity: o }}>
          <motion.circle cx={pts[i].x} cy={pts[i].y} r="30" fill={`url(#glow-${tone})`} />
          <motion.circle cx={pts[i].x} cy={pts[i].y} r="7" fill="#ff7a59" stroke="#fff" strokeWidth="3" />
        </motion.g>
      ))}
    </svg>
  );
}
