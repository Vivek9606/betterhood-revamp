// Stores one batch of browser events: upserts the visitor and session, appends the events to the log,
// and turns the special ones into structured rows:
//   identify             → users (and links the visitor's past sessions to that person)
//   form_submit          → leads
//   assessment_complete  → assessment_results
// Contact details and assessment answers are moved out of the event log into those tables.
import type { Sql, TransactionSql } from "postgres";
import { sql } from "./db.js";
import { channel } from "./enrich.js";
import type { Batch, Event } from "./validate.js";

type Tx = TransactionSql<Record<string, never>> | Sql;
type Enriched = { device_type: string; os: string | null; browser: string | null; country: string | null; region: string | null; city: string | null };

const DAY = 86_400_000;
const clampTs = (ts: number, now: number) => new Date(ts > now + 300_000 || ts < now - DAY ? now : ts);
const s = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const hostOf = (url?: string | null) => { try { return url ? new URL(url).hostname.replace(/^www\./, "") : null; } catch { return null; } };

export function normEmail(v: unknown) {
  const e = s(v, 254)?.toLowerCase();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}
export function normPhone(v: unknown) {
  let d = (s(v, 40) ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;            // Indian numbers without country code
  if (d.length === 12 && d.startsWith("910")) d = "91" + d.slice(3);
  return d.length >= 10 && d.length <= 15 ? d : null;
}

// Find the person by email, then phone; create them if new. Fills in details we didn't have yet.
export async function upsertUser(tx: Tx, input: { email?: unknown; phone?: unknown; name?: unknown }) {
  const email = normEmail(input.email), phone = normPhone(input.phone), name = s(input.name, 120);
  if (!email && !phone) return null;
  const [found] = await tx`
    select id from analytics.users
    where (${email}::text is not null and lower(email) = ${email}) or (${phone}::text is not null and phone = ${phone})
    order by (lower(email) = ${email}) desc nulls last limit 1`;
  if (found) {
    await tx`
      update analytics.users set
        email = case when email is null and ${email}::text is not null and not exists (select 1 from analytics.users u where lower(u.email) = ${email}) then ${email} else email end,
        phone = case when phone is null and ${phone}::text is not null and not exists (select 1 from analytics.users u where u.phone = ${phone}) then ${phone} else phone end,
        name = coalesce(${name}, name),
        updated_at = now()
      where id = ${found.id}`;
    return found.id as string;
  }
  const [row] = await tx`insert into analytics.users (email, phone, name) values (${email}, ${phone}, ${name}) returning id`;
  return row.id as string;
}

async function linkUser(tx: Tx, userId: string, visitorId: string) {
  await tx`update analytics.visitors set user_id = ${userId} where id = ${visitorId} and user_id is distinct from ${userId}`;
  await tx`update analytics.sessions set user_id = ${userId} where visitor_id = ${visitorId} and user_id is null`;
  await tx`update analytics.leads set user_id = ${userId} where visitor_id = ${visitorId} and user_id is null`;
  await tx`update analytics.assessment_results set user_id = ${userId} where visitor_id = ${visitorId} and user_id is null`;
}

const pick = (o: Record<string, unknown>, re: RegExp) => Object.entries(o).find(([k]) => re.test(k))?.[1];

export async function ingest(batch: Batch, env: Enriched) {
  const now = Date.now();
  const { aid, sid, ctx } = batch;
  const started = clampTs(ctx.started_at, now);
  const referrer_host = hostOf(ctx.referrer);
  const ch = channel({ ...ctx, referrer_host });
  const events = batch.events.map((e) => ({ ...e, at: clampTs(e.ts, now) }));
  const lastAt = events.reduce((m, e) => (e.at > m ? e.at : m), started);
  const lastPath = [...events].reverse().find((e) => e.path)?.path ?? null;

  await sql.begin(async (tx) => {
    await tx`
      insert into analytics.visitors (id, first_seen_at, last_seen_at, first_landing, first_referrer, first_channel, first_source, first_medium, first_campaign)
      values (${aid}, ${started}, ${lastAt}, ${s(ctx.landing, 512)}, ${s(ctx.referrer, 1024)}, ${ch}, ${s(ctx.utm_source)}, ${s(ctx.utm_medium)}, ${s(ctx.utm_campaign)})
      on conflict (id) do update set last_seen_at = greatest(analytics.visitors.last_seen_at, excluded.last_seen_at)`;

    const [sess] = await tx`
      insert into analytics.sessions (id, visitor_id, user_id, started_at, last_seen_at, landing_path, exit_path, referrer, referrer_host, channel,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, device_type, os, browser, screen, language, timezone, country, region, city)
      values (${sid}, ${aid}, (select user_id from analytics.visitors where id = ${aid}), ${started}, ${lastAt}, ${s(ctx.landing, 512)}, ${lastPath},
        ${s(ctx.referrer, 1024)}, ${referrer_host}, ${ch}, ${s(ctx.utm_source)}, ${s(ctx.utm_medium)}, ${s(ctx.utm_campaign)}, ${s(ctx.utm_term)},
        ${s(ctx.utm_content)}, ${s(ctx.gclid)}, ${s(ctx.fbclid)}, ${env.device_type}, ${env.os}, ${env.browser}, ${s(ctx.screen, 32)},
        ${s(ctx.language, 32)}, ${s(ctx.timezone, 64)}, ${env.country}, ${env.region}, ${env.city})
      on conflict (id) do update set
        last_seen_at = greatest(analytics.sessions.last_seen_at, excluded.last_seen_at),
        exit_path = coalesce(excluded.exit_path, analytics.sessions.exit_path)
      where analytics.sessions.visitor_id = excluded.visitor_id
      returning (xmax = 0) as inserted`;
    if (!sess) return; // session id belongs to another visitor: ignore the batch
    if (sess.inserted) await tx`update analytics.visitors set session_count = session_count + 1 where id = ${aid}`;

    // Pull PII / answers out of the special events before they go into the log
    const special: { e: Event & { at: Date }; raw: Record<string, unknown> }[] = [];
    const rows = events.map((e) => {
      const p = { ...e.props };
      if (e.name === "identify" || e.name === "form_submit" || e.name === "assessment_complete") {
        special.push({ e, raw: e.props });
        for (const k of ["email", "phone", "name", "fields", "answers"]) delete p[k];
        if (e.name === "form_submit" && e.props.fields && typeof e.props.fields === "object") p.field_names = Object.keys(e.props.fields);
      }
      return { event_id: e.id, session_id: sid, visitor_id: aid, name: e.name, path: s(e.path, 512), title: s(e.title, 300), props: p, ts: e.at };
    });

    const inserted = await tx`
      insert into analytics.events ${tx(rows.map((r) => ({ ...r, props: tx.json(r.props as never) })), "event_id", "session_id", "visitor_id", "name", "path", "title", "props", "ts")}
      on conflict (event_id) do nothing
      returning event_id, name, props`;

    const newIds = new Set(inserted.map((r) => r.event_id));
    const pageViews = inserted.filter((r) => r.name === "page_view").length;
    const engaged = inserted.reduce((n, r) => n + (r.name === "page_leave" ? Math.min(Number(r.props?.engaged_ms) || 0, 3_600_000) : 0), 0);
    if (inserted.length) {
      await tx`update analytics.sessions set page_views = page_views + ${pageViews}, event_count = event_count + ${inserted.length}, engaged_ms = engaged_ms + ${engaged} where id = ${sid}`;
    }

    for (const { e, raw } of special) {
      if (!newIds.has(e.id)) continue; // a retried batch: already handled
      if (e.name === "identify") {
        const uid = await upsertUser(tx, raw);
        if (uid) await linkUser(tx, uid, aid);
      } else if (e.name === "form_submit") {
        const fields = (raw.fields && typeof raw.fields === "object" ? raw.fields : {}) as Record<string, unknown>;
        const name = pick(fields, /^(name|full.?name|first.?name|your.?name)$/i), email = pick(fields, /e-?mail/i), phone = pick(fields, /phone|mobile|whatsapp/i);
        const uid = await upsertUser(tx, { name, email, phone });
        await tx`
          insert into analytics.leads (form, session_id, visitor_id, user_id, path, name, email, phone, data, created_at)
          values (${s(raw.form, 120) ?? "unknown"}, ${sid}, ${aid}, ${uid}, ${s(e.path, 512)}, ${s(name, 120)}, ${normEmail(email)}, ${normPhone(phone)}, ${tx.json(fields as never)}, ${e.at})`;
        if (uid) await linkUser(tx, uid, aid);
      } else {
        const uid = await upsertUser(tx, raw);
        await tx`
          insert into analytics.assessment_results (assessment, session_id, visitor_id, user_id, kind, area, result, condition, advisory, scores, answers, name, email, phone, created_at)
          values (${s(raw.assessment, 120) ?? "unknown"}, ${sid}, ${aid}, ${uid}, ${s(raw.kind, 40)}, ${s(raw.area, 40)}, ${s(raw.result, 80)}, ${s(raw.condition, 200)},
            ${typeof raw.advisory === "boolean" ? raw.advisory : null}, ${tx.json((raw.scores ?? {}) as never)}, ${tx.json((Array.isArray(raw.answers) ? raw.answers : []) as never)},
            ${s(raw.name, 120)}, ${normEmail(raw.email)}, ${normPhone(raw.phone)}, ${e.at})`;
        if (uid) await linkUser(tx, uid, aid);
      }
    }
  });
}
