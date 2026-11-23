// Talking to the Betterhood app when a page runs inside its in-app frame (embed mode, see Base.astro).
//
// Messages (all `type`s start with "bh:"):
//   page → app  bh:ready               { flow }                      page is listening
//   app → page  bh:context             { token?, prefill? }          signed-in session / known details
//   page → app  bh:assessment-result   { result }                    an assessment was completed
//   app → page  bh:ack                 { id }                        the app saved it
//   page → app  bh:directory-published { slug, url, status }         a directory listing was saved
//   page → app  bh:open-product        { handle }                    open a shop product in the app (Betty)
//   page → app  bh:open-link           { url }                       a link that leaves the website (the shop, WhatsApp…)

export type AppMessage = { type: string; [k: string]: unknown };

const root = document.documentElement;
export const isEmbedded = () => root.classList.contains("embed");
const appOrigin = () => root.dataset.embedOrigin;

/** Send a message to the app. Returns false when not embedded (or the app's origin is unknown). */
export function toApp(msg: AppMessage): boolean {
  const o = appOrigin();
  if (!isEmbedded() || !o) return false;
  window.parent.postMessage(msg, o);
  return true;
}

/** Listen for one kind of message from the app (only from our parent frame, at the origin it told us). */
export function fromApp<T extends AppMessage>(type: string, fn: (msg: T) => void): () => void {
  const h = (e: MessageEvent) => {
    if (e.source !== window.parent || e.origin !== appOrigin()) return;
    if ((e.data as AppMessage | null)?.type === type) fn(e.data as T);
  };
  window.addEventListener("message", h);
  return () => window.removeEventListener("message", h);
}

/** Resolve with the app's reply to `type`, or undefined after `ms`. */
export function waitForApp<T extends AppMessage>(type: string, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!isEmbedded() || !appOrigin()) return resolve(undefined);
    const off = fromApp<T>(type, (m) => { clearTimeout(t); off(); resolve(m); });
    const t = setTimeout(() => { off(); resolve(undefined); }, ms);
  });
}

/**
 * Links that leave the website can't load inside the app's frame (the shop refuses to be framed), so in embed
 * mode the app opens them: shop products in its own shop, everything else in its in-app browser.
 */
export function wireOutboundLinks() {
  if (!isEmbedded() || !appOrigin()) return;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !/^https?:$/.test(a.protocol) || a.origin === location.origin) return;
    if (toApp({ type: "bh:open-link", url: a.href })) e.preventDefault();
  });
}
