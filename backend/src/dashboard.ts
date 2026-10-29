// Read-only queries behind the internal dashboard (/dashboard). Mounted behind basic auth in server.ts.
import { Hono } from "hono";
import { sql } from "./db.js";
import { normEmail, normPhone } from "./collect.js";

export const api = new Hono();

// ?days=N (default 30) → [from, to) plus the equally long period before it, for comparisons
function range(q: (k: string) => string | undefined) {
  const days = Math.min(Math.max(Number(q("days")) || 30, 1), 365);
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const prev = new Date(from.getTime() - days * 86_400_000);
  return { days, from, to, prev };
}

api.get("/overview", async (c) => {
  const { days, from, to, prev } = range((k) => c.req.query(k));
  const kpis = (a: Date, b: Date) => sql`
    select
      (select count(distinct visitor_id) from analytics.sessions where started_at >= ${a} and started_at < ${b})::int as visitors,
      (select count(*) from analytics.sessions where started_at >= ${a} and started_at < ${b})::int as sessions,
      (select coalesce(sum(page_views), 0) from analytics.sessions where started_at >= ${a} and started_at < ${b})::int as page_views,
      (select coalesce(round(avg(engaged_ms) / 1000), 0) from analytics.sessions where started_at >= ${a} and started_at < ${b})::int as avg_engaged_s,
      (select coalesce(round(100.0 * count(*) filter (where page_views <= 1) / nullif(count(*), 0)), 0) from analytics.sessions where started_at >= ${a} and started_at < ${b})::int as bounce_rate,
      (select count(*) from analytics.leads where created_at >= ${a} and created_at < ${b})::int as leads,
      (select count(*) from analytics.assessment_results where created_at >= ${a} and created_at < ${b})::int as assessments,
      (select count(*) from analytics.users where created_at >= ${a} and created_at < ${b})::int as new_people`;

  const [[now], [before], daily, channels, landing, pages, devices, cities, referrers, live] = await Promise.all([
    kpis(from, to),
    kpis(prev, from),
    sql`
      select to_char(d, 'YYYY-MM-DD') as day,
        coalesce(s.sessions, 0)::int as sessions, coalesce(s.visitors, 0)::int as visitors, coalesce(s.page_views, 0)::int as page_views
      from generate_series(date_trunc('day', ${from}::timestamptz), date_trunc('day', ${to}::timestamptz), interval '1 day') d
      left join (
        select date_trunc('day', started_at) as day, count(*) as sessions, count(distinct visitor_id) as visitors, sum(page_views) as page_views
        from analytics.sessions where started_at >= ${from} group by 1
      ) s on s.day = d
      order by d`,
    sql`
      select coalesce(channel, 'direct') as label, count(*)::int as sessions,
        count(*) filter (where exists (select 1 from analytics.leads l where l.session_id = s.id)
                            or exists (select 1 from analytics.assessment_results a where a.session_id = s.id))::int as converted
      from analytics.sessions s where started_at >= ${from} group by 1 order by 2 desc`,
    sql`
      select landing_path as label, count(*)::int as sessions,
        round(100.0 * count(*) filter (where page_views <= 1) / count(*))::int as bounce_rate,
        count(*) filter (where exists (select 1 from analytics.leads l where l.session_id = s.id)
                            or exists (select 1 from analytics.assessment_results a where a.session_id = s.id))::int as converted
      from analytics.sessions s where started_at >= ${from} and landing_path is not null group by 1 order by 2 desc limit 25`,
    sql`
      select v.path as label, count(*)::int as views, count(distinct v.visitor_id)::int as visitors,
        round(avg(l.engaged_ms) / 1000)::int as avg_engaged_s,
        round(avg(l.max_scroll))::int as avg_scroll
      from analytics.events v
      -- a page can be left several times (tab switches): add those up per page view
      left join (
        select props->>'view_id' as view_id, sum((props->>'engaged_ms')::numeric) as engaged_ms, max((props->>'max_scroll')::numeric) as max_scroll
        from analytics.events where name = 'page_leave' and ts >= ${from} group by 1
      ) l on l.view_id = v.event_id::text
      where v.name = 'page_view' and v.ts >= ${from}
      group by 1 order by 2 desc limit 40`,
    sql`select coalesce(device_type, 'unknown') as label, count(*)::int as sessions from analytics.sessions where started_at >= ${from} group by 1 order by 2 desc`,
    sql`select coalesce(city, 'Unknown') || coalesce(', ' || country, '') as label, count(*)::int as sessions from analytics.sessions where started_at >= ${from} group by 1 order by 2 desc limit 15`,
    sql`select referrer_host as label, count(*)::int as sessions from analytics.sessions where started_at >= ${from} and referrer_host is not null group by 1 order by 2 desc limit 15`,
    sql`select count(*)::int as n from analytics.sessions where last_seen_at > now() - interval '5 minutes'`,
  ]);
  return c.json({ days, kpis: now, prev: before, daily, channels, landing, pages, devices, cities, referrers, live: live[0].n });
});

api.get("/assessments", async (c) => {
  const { from } = range((k) => c.req.query(k));
  const [funnel, steps, results, abandons] = await Promise.all([
    sql`
      select props->>'assessment' as assessment,
        count(distinct session_id) filter (where name = 'page_view_assessment')::int as viewed,
        count(distinct session_id) filter (where name = 'assessment_start')::int as started,
        count(distinct session_id) filter (where name = 'assessment_complete')::int as completed
      from (
        select session_id, props, name from analytics.events
        where ts >= ${from} and name in ('assessment_start', 'assessment_complete')
        union all
        select session_id, jsonb_build_object('assessment', trim(both '/' from path)), 'page_view_assessment'
        from analytics.events where ts >= ${from} and name = 'page_view' and path like '/assessment-%'
      ) x group by 1 order by 2 desc`,
    sql`
      select props->>'assessment' as assessment, (props->>'step')::int as step, max((props->>'total')::int)::int as total,
        count(distinct session_id)::int as sessions
      from analytics.events where ts >= ${from} and name = 'assessment_step'
      group by 1, 2 order by 1, 2`,
    sql`
      select assessment, coalesce(condition, result, 'Scored') as label, count(*)::int as n,
        round(avg((scores->>'overall')::numeric), 1)::float as avg_overall
      from analytics.assessment_results where created_at >= ${from}
      group by 1, 2 order by 1, 3 desc`,
    sql`
      select props->>'assessment' as assessment, (props->>'step')::int as step, count(*)::int as n
      from analytics.events where ts >= ${from} and name = 'assessment_abandon'
      group by 1, 2 order by 1, 2`,
  ]);
  return c.json({ funnel, steps, results, abandons });
});

api.get("/behaviour", async (c) => {
  const { from } = range((k) => c.req.query(k));
  const [events, searches, outbound, painmap, physio, forms, errors, vitals] = await Promise.all([
    sql`select name as label, count(*)::int as n, count(distinct session_id)::int as sessions from analytics.events where ts >= ${from} group by 1 order by 2 desc`,
    sql`
      select props->>'where' as "where", lower(props->>'q') as q, count(*)::int as n, min((props->>'results')::int)::int as results
      from analytics.events where ts >= ${from} and name = 'search' and length(props->>'q') > 1
      group by 1, 2 order by 3 desc limit 50`,
    sql`
      select props->>'kind' as kind, props->>'url' as url, count(*)::int as n
      from analytics.events where ts >= ${from} and name = 'outbound_click'
      group by 1, 2 order by 3 desc limit 40`,
    sql`select props->>'spot' as label, count(*)::int as n from analytics.events where ts >= ${from} and name = 'painmap_select' group by 1 order by 2 desc`,
    sql`
      select path as label, count(*) filter (where props->>'kind' in ('tel', 'whatsapp'))::int as contacts, count(*)::int as clicks
      from analytics.events where ts >= ${from} and name = 'outbound_click' and path like '/physio/%'
      group by 1 order by 2 desc limit 25`,
    sql`
      select props->>'form' as form,
        count(distinct session_id) filter (where name = 'form_start')::int as started,
        count(distinct session_id) filter (where name = 'form_submit')::int as submitted
      from analytics.events where ts >= ${from} and name in ('form_start', 'form_submit')
      group by 1 order by 2 desc`,
    sql`
      select props->>'message' as message, path, count(*)::int as n
      from analytics.events where ts >= ${from} and name = 'js_error'
      group by 1, 2 order by 3 desc limit 20`,
    sql`
      select props->>'metric' as metric, path,
        percentile_cont(0.75) within group (order by (props->>'value')::float)::float as p75, count(*)::int as n
      from analytics.events where ts >= ${from} and name = 'web_vital'
      group by 1, 2 having count(*) >= 3 order by 3 desc limit 30`,
  ]);
  return c.json({ events, searches, outbound, painmap, physio, forms, errors, vitals });
});

api.get("/leads", async (c) => {
  const { from } = range((k) => c.req.query(k));
  const [leads, assessments] = await Promise.all([
    sql`
      select l.id, l.form, l.name, l.email, l.phone, l.path, l.created_at, l.visitor_id, l.user_id, s.channel, s.utm_source, s.utm_campaign, s.landing_path
      from analytics.leads l left join analytics.sessions s on s.id = l.session_id
      where l.created_at >= ${from} order by l.created_at desc limit 500`,
    sql`
      select a.id, a.assessment, a.kind, a.area, a.condition, a.result, a.advisory, a.scores, a.name, a.email, a.phone, a.created_at,
        a.visitor_id, a.user_id, s.channel, s.utm_source, s.utm_campaign
      from analytics.assessment_results a left join analytics.sessions s on s.id = a.session_id
      where a.created_at >= ${from} order by a.created_at desc limit 500`,
  ]);
  return c.json({ leads, assessments });
});

api.get("/sessions", async (c) => {
  const { from } = range((k) => c.req.query(k));
  const limit = Math.min(Number(c.req.query("limit")) || 100, 500);
  const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
  const rows = await sql`
    select s.id, s.visitor_id, s.user_id, s.started_at, s.last_seen_at, s.landing_path, s.exit_path, s.channel, s.utm_source, s.utm_campaign,
      s.device_type, s.os, s.browser, s.city, s.country, s.page_views, s.event_count, s.engaged_ms, v.session_count,
      u.name as user_name, u.email as user_email, u.phone as user_phone
    from analytics.sessions s
    join analytics.visitors v on v.id = s.visitor_id
    left join analytics.users u on u.id = s.user_id
    where s.started_at >= ${from}
    order by s.started_at desc limit ${limit} offset ${offset}`;
  return c.json({ sessions: rows });
});

// Everything we know about one person: ?user= | ?visitor= | ?session= | ?q=<email or phone>
api.get("/journey", async (c) => {
  let { user, visitor, session, q } = c.req.query();
  if (q) {
    const email = normEmail(q), phone = normPhone(q);
    const [u] = await sql`select id from analytics.users where (${email}::text is not null and lower(email) = ${email}) or (${phone}::text is not null and phone = ${phone}) limit 1`;
    if (!u) return c.json({ error: "No one found with that email or phone" }, 404);
    user = u.id;
  }
  if (session && !visitor && !user) {
    const [s] = await sql`select visitor_id, user_id from analytics.sessions where id = ${session}`;
    if (!s) return c.json({ error: "Session not found" }, 404);
    user = s.user_id ?? undefined;
    visitor = s.visitor_id;
  }
  if (visitor && !user) {
    const [v] = await sql`select user_id from analytics.visitors where id = ${visitor}`;
    user = v?.user_id ?? undefined;
  }
  if (!user && !visitor) return c.json({ error: "Pass user, visitor, session or q" }, 400);

  const visitors = user
    ? await sql`select * from analytics.visitors where user_id = ${user} order by first_seen_at`
    : await sql`select * from analytics.visitors where id = ${visitor!}`;
  const vids = visitors.map((v) => v.id as string);
  if (!vids.length) return c.json({ error: "Not found" }, 404);

  const [[person], sessions, events, leads, assessments] = await Promise.all([
    user ? sql`select * from analytics.users where id = ${user}` : Promise.resolve([null]),
    sql`select * from analytics.sessions where visitor_id = any(${vids}::uuid[]) order by started_at`,
    sql`select session_id, visitor_id, name, path, title, props, ts from analytics.events where visitor_id = any(${vids}::uuid[]) order by ts limit 3000`,
    sql`select * from analytics.leads where visitor_id = any(${vids}::uuid[]) order by created_at`,
    sql`select * from analytics.assessment_results where visitor_id = any(${vids}::uuid[]) order by created_at`,
  ]);
  return c.json({ person, visitors, sessions, events, leads, assessments });
});
