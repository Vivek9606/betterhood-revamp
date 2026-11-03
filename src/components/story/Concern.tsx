import { useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { MaskLines, Rich, Arrow, EASE } from "./primitives";
import { sentences } from "../../lib/rich";

export interface ConcernProduct { title: string; href: string; image: string; rating: number | null; reviews: number; price: string; compare: string | null }
export interface ConcernTab { label: string; href: string; banner: string; products: ConcernProduct[]; cta: string; note: string }
interface Props {
  eyebrow: string; more: { label: string; href: string }; title: string; sub: string; tabs: ConcernTab[];
  bannerSize?: number[];
}

const img = (s: string) => s.replace(/_400x400(?=\.)/, "_160x160");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Shop by concern: the nine relief kits from the live homepage. Every panel is rendered into the
// HTML (inactive ones are `hidden`), so all collection and product links stay crawlable.
export default function Concern({ eyebrow, more, title, sub, tabs, bannerSize }: Props) {
  const [active, setActive] = useState(0);
  const pick = (i: number) => setActive(i);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + tabs.length) % tabs.length;
    pick(n);
    document.getElementById(`concern-tab-${slug(tabs[n].label)}`)?.focus();
  };

  return (
    <section className="st-map" id="find" aria-label="Shop by concern">
      <div className="wrap">
        <div className="st-map-head">
          <div className="st-eyerow">
            <p className="st-kicker">{eyebrow}</p>
            <a className="st-link" href={more.href}>{more.label} <Arrow size={15} /></a>
          </div>
          <MaskLines className="st-h2" lines={sentences(title).map((l, i) => <Rich key={i} text={l} bold="em" />)} />
          <p className="st-lead">{sub}</p>
        </div>

        <LayoutGroup>
          <div className="st-map-chips" role="tablist" aria-label="Concerns">
            {tabs.map((t, i) => (
              <button key={t.label} id={`concern-tab-${slug(t.label)}`} role="tab" aria-selected={i === active} aria-controls={`concern-${slug(t.label)}`}
                tabIndex={i === active ? 0 : -1} className={i === active ? "on" : ""} onClick={() => pick(i)} onKeyDown={(e) => onKey(e, i)}>
                {i === active && <motion.span layoutId="chip-bg" className="st-chip-bg" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <span className="st-chip-t">{t.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        {tabs.map((t, i) => (
          <motion.div key={t.label} id={`concern-${slug(t.label)}`} role="tabpanel" aria-labelledby={`concern-tab-${slug(t.label)}`} hidden={i !== active}
            className="st-cpanel" initial={false} animate={i === active ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }} transition={{ duration: 0.5, ease: EASE }}>
            <a className="st-cbanner" href={t.href}>
              <img src={t.banner} alt={`betterhood ${t.label} kit`} width={bannerSize?.[0]} height={bannerSize?.[1]} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </a>
            <div className="st-cside">
              <ul className="st-cprods">
                {t.products.map((p) => (
                  <li key={p.href}>
                    <a className="st-cprod" href={p.href}>
                      <img src={img(p.image)} alt="" width={80} height={80} loading="lazy" decoding="async" />
                      <span className="st-cprod-info">
                        <span className="st-cprod-t">{p.title}</span>
                        {p.rating != null && <span className="st-cprod-r"><span aria-hidden="true">★</span> {p.rating} | {p.reviews} {p.reviews === 1 ? "Review" : "Reviews"}</span>}
                        <span className="st-cprod-p"><strong>{p.price}</strong>{p.compare && <s>{p.compare}</s>}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="st-cfoot">
                <a className="st-btn st-btn-plum" href={t.href}>{t.cta} <Arrow /></a>
                {t.note && <p className="st-cnote"><span aria-hidden="true">✓</span> {t.note}</p>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
