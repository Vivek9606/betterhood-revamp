// Turns raw request data into what we store: device from the user agent, city from the IP (the IP
// itself is never stored), the marketing channel from referrer + UTM tags, and a bot filter.
import UAParser from "ua-parser-js";
import geoip from "geoip-lite";

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|whatsapp|curl|wget|python|axios|node-fetch|go-http/i;

export const isBot = (ua = "") => !ua || BOT.test(ua);

export function device(ua = "") {
  const r = new UAParser(ua).getResult();
  const type = r.device.type === "mobile" || r.device.type === "tablet" ? r.device.type : "desktop";
  return { device_type: type, os: r.os.name ?? null, browser: r.browser.name ?? null };
}

export function clientIp(headers: Headers, fallback?: string) {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    fallback ??
    ""
  );
}

export function geo(ip: string) {
  const g = ip ? geoip.lookup(ip) : null;
  return { country: g?.country || null, region: g?.region || null, city: g?.city || null };
}

const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia)\./;
const SOCIAL = /(^|\.)(facebook|fb|instagram|t\.co|twitter|x|linkedin|lnkd|youtube|youtu|pinterest|reddit|quora|whatsapp|wa\.me|telegram|threads)\./;
const EMAIL = /(^|\.)(mail\.google|outlook|mail\.yahoo)\./;

export function channel(s: { utm_source?: string | null; utm_medium?: string | null; gclid?: string | null; fbclid?: string | null; referrer_host?: string | null }) {
  const medium = (s.utm_medium ?? "").toLowerCase();
  const source = (s.utm_source ?? "").toLowerCase();
  const host = (s.referrer_host ?? "").toLowerCase();
  if (s.gclid || /cpc|ppc|paid|ads?$|display|cpm/.test(medium)) return "paid";
  if (medium === "email" || /newsletter|email/.test(source) || EMAIL.test(host + ".")) return "email";
  if (/whatsapp|wati/.test(source) || /whatsapp/.test(medium)) return "whatsapp";
  if (s.fbclid || /social/.test(medium) || SOCIAL.test(host + ".") || /facebook|instagram|youtube|linkedin|meta/.test(source)) return "social";
  if (SEARCH.test(host + ".")) return "organic";
  if (source || medium) return "campaign";
  if (host) return "referral";
  return "direct";
}
