import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { sql } from "./db.js";
import { ingest } from "./collect.js";
import { api } from "./dashboard.js";
import { clientIp, device, geo, isBot } from "./enrich.js";
import { Batch } from "./validate.js";

const app = new Hono();
const origins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:4321").split(",").map((o) => o.trim()).filter(Boolean);

// Simple per-IP limiter: 240 batches a minute is far more than a real visitor sends
const hits = new Map<string, { n: number; reset: number }>();
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, 60_000).unref();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  return ++h.n > 240;
}

app.get("/health", async (c) => {
  await sql`select 1`;
  return c.json({ ok: true });
});

app.use("/v1/*", cors({ origin: origins, allowMethods: ["POST", "OPTIONS"], maxAge: 86400 }));

// The browser tracker posts batches here (sendBeacon sends text/plain, so we parse the body ourselves)
app.post("/v1/collect", async (c) => {
  const ua = c.req.header("user-agent") ?? "";
  if (isBot(ua)) return c.body(null, 204);
  const origin = c.req.header("origin");
  if (origin && !origins.includes(origin)) return c.body(null, 403);
  const ip = clientIp(c.req.raw.headers, (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming?.socket?.remoteAddress);
  if (limited(ip)) return c.body(null, 429);

  const text = await c.req.text();
  if (text.length > 256_000) return c.body(null, 413);
  let json: unknown;
  try { json = JSON.parse(text); } catch { return c.body(null, 400); }
  const parsed = Batch.safeParse(json);
  if (!parsed.success) return c.json({ error: parsed.error.issues.slice(0, 3) }, 400);

  try {
    await ingest(parsed.data, { ...device(ua), ...geo(ip) });
  } catch (err) {
    console.error("ingest failed", err);
    return c.body(null, 500);
  }
  return c.body(null, 204);
});

// ---- Internal dashboard ----
const user = process.env.DASHBOARD_USER || "admin";
const password = process.env.DASHBOARD_PASSWORD;
if (!password) console.warn("DASHBOARD_PASSWORD is not set: /dashboard is disabled");
const guard = password ? basicAuth({ username: user, password }) : async () => new Response("Dashboard disabled: set DASHBOARD_PASSWORD", { status: 503 });

app.use("/dashboard", guard);
app.use("/dashboard/*", guard);
app.use("/api/*", guard);
app.route("/api", api);

const dashboardHtml = () => readFileSync(join(import.meta.dirname, "..", "dashboard", "index.html"), "utf8");
app.get("/dashboard", (c) => c.html(dashboardHtml()));
app.get("/", (c) => c.redirect("/dashboard"));

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: "Server error" }, 500);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => console.log(`betterhood backend on http://localhost:${port}  (dashboard: /dashboard)`));
