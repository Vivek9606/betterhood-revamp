// Talking to the Betterhood app when a page runs inside its in-app frame (embed mode, see Base.astro).
//
// Messages (all `type`s start with "bh:"):
//   page → app  bh:ready               { flow }                      page is listening
//   app → page  bh:context             { token?, prefill? }          signed-in session / known details
//   page → app  bh:assessment-result   { result }                    an assessment was completed
//   app → page  bh:ack                 { id }                        the app saved it
//   page → app  bh:directory-published { slug, url, status }         a directory listing was saved

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
