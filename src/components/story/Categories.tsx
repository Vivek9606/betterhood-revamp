import { useState } from "react";
import { motion } from "motion/react";
import { MaskLines, Rich, Reveal, Arrow } from "./primitives";
import { sentences } from "../../lib/rich";

interface Item { href: string; image: string; imageMobile: string; alt: string; size?: number[]; sizeMobile?: number[] }
interface Props { title: string; sub: string; video: string | null; items: Item[]; viewAll: { label: string; href: string } }

// "One place. Everything your pain needs." The brand film (loaded only when played) beside the
// three category banners from the live homepage.
export default function Categories({ title, sub, video, items, viewAll }: Props) {
  const [playing, setPlaying] = useState(false);
  const play = () => setPlaying(true);

  return (
    <section className="st-cat" aria-label="Shop by category">
      <div className="wrap">
        <div className="st-cat-head">
          <MaskLines className="st-h2" lines={sentences(title).map((l, i) => <Rich key={i} text={l} bold="em" />)} />
          <p className="st-lead">{sub}</p>
        </div>
        <div className="st-cat-grid">
          {video && (
            <Reveal className="st-cat-video">
              {playing ? (
                <iframe src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`} title="betterhood: the full range" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <button onClick={play} aria-label="Play the betterhood range video">
                  <img src={`https://i.ytimg.com/vi/${video}/hqdefault.jpg`} alt="" width={480} height={360} loading="lazy" decoding="async" />
                  <motion.span className="st-reel-play" whileHover={{ scale: 1.1 }}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg></motion.span>
                </button>
              )}
            </Reveal>
          )}
          <ul className="st-cat-list">
            {items.map((c, i) => (
              <Reveal as="li" i={i} key={c.href}>
                <a href={c.href} className="st-catrow">
                  <picture>
                    <source media="(max-width: 760px)" srcSet={c.imageMobile} width={c.sizeMobile?.[0]} height={c.sizeMobile?.[1]} />
                    <img src={c.image} alt={c.alt} width={c.size?.[0]} height={c.size?.[1]} loading="lazy" decoding="async" />
                  </picture>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
        <div className="st-cat-foot">
          <a className="st-btn st-btn-line" href={viewAll.href}>{viewAll.label} <Arrow /></a>
        </div>
      </div>
    </section>
  );
}
