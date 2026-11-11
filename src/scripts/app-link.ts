// "Keep this in the app" links from website results to the betterhood app (capacitor-app).
// The result travels in the URL fragment (#import=…), which browsers never send to a server, and without the
// visitor's name or contact details. The app saves it to their account once they sign in (lib/assessments.ts there).
import { isEmbedded } from "./embed";

const APP = String(import.meta.env.PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

/** Link to the app carrying this result, or "" when there is no app to link to (not configured, or already in it). */
export function appLink(slug: string, record?: Record<string, unknown> | null): string {
  if (!APP || isEmbedded()) return "";
  if (!record) return `${APP}/welcome`;
  const { name: _n, email: _e, phone: _p, answers: _a, ...result } = record;
  const json = JSON.stringify({ slug, ...result });
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${APP}/welcome#import=${b64}`;
}
