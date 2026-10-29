// Site-wide motion layer (vanilla Motion, no React needed on ordinary pages):
//  - Lenis smooth scrolling
//  - [data-reveal]  fade/lift on enter         - [data-stagger]  children cascade in
//  - .h1 / .display / .h2 (in page heroes and section heads) reveal word by word
//  - [data-parallax] images drift slightly with scroll
import { animate, inView, scroll, stagger } from "motion";
import Lenis from "lenis";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = [0.22, 1, 0.36, 1] as const;

if (!reduce) {
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -90 } });
  const raf = (t: number) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  (window as any).__lenis = lenis;
  // pause smooth scroll while a modal dialog is open
  new MutationObserver(() => (document.querySelector("dialog[open]") ? lenis.stop() : lenis.start())).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
}

function splitWords(el: HTMLElement) {
  if (el.dataset.split) return [];
  el.dataset.split = "1";
  const words: HTMLElement[] = [];
  const walk = (node: Node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent!.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const outer = document.createElement("span");
          outer.className = "sw";
          const inner = document.createElement("span");
          inner.className = "sw-i";
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
          words.push(inner);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !(n as Element).matches("svg, img, br")) walk(n);
    });
  };
  walk(el);
  return words;
}

function init() {
  if (reduce) { document.querySelectorAll("[data-reveal]").forEach((e) => e.classList.add("is-in")); return; }

  // headline word reveals (page heroes + section heads; the homepage story handles its own)
  document.querySelectorAll<HTMLElement>("main :is(h1.h1, h1.display, .section-head .h2, .t-head .h1)").forEach((h) => {
    if (h.closest("[data-no-split], astro-island")) return;
    const words = splitWords(h);
    if (!words.length) return;
    words.forEach((w) => (w.style.transform = "translateY(110%)"));
    inView(h, () => { animate(words, { y: ["110%", "0%"] }, { duration: 0.9, ease, delay: stagger(0.04) }); }, { margin: "0px 0px -8% 0px" });
  });

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    inView(el, () => { el.classList.add("is-in"); }, { margin: "0px 0px -8% 0px" });
  });

  // grids of cards cascade in
  document.querySelectorAll<HTMLElement>("main :is([data-stagger], .grid, .scroller, .ql-grid, .c-cards, .modules, .steps)").forEach((g) => {
    if (g.closest("astro-island")) return;
    const kids = [...g.children] as HTMLElement[];
    if (kids.length < 2) return;
    kids.forEach((k) => { k.style.opacity = "0"; k.style.transform = "translateY(36px)"; });
    inView(g, () => { animate(kids, { opacity: [0, 1], y: [36, 0] }, { duration: 0.8, ease, delay: stagger(0.06, { startDelay: 0.05 }) }); }, { margin: "0px 0px -6% 0px" });
  });

  // gentle parallax on large hero/feature images
  document.querySelectorAll<HTMLElement>("main :is([data-parallax], .a-hero img, .ab-photos img, .l-banner img, .ph-photo img)").forEach((img) => {
    const target = img.parentElement!;
    scroll(animate(img, { y: ["-6%", "6%"], scale: [1.08, 1.08] }, { ease: "linear" }), { target, offset: ["start end", "end start"] });
  });
}
init();
