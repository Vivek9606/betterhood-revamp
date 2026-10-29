-- Visitor journey tracking for betterhood.in
-- Everything lives in its own "analytics" schema, NOT "public": Supabase exposes "public" through its
-- REST API to anyone holding the anon key, and this data (contact details, health answers) must only
-- be reachable through the backend.

create schema if not exists analytics;
revoke all on schema analytics from anon, authenticated;

-- A person we know by email and/or phone (from a form or an assessment)
create table if not exists analytics.users (
  id            uuid primary key default gen_random_uuid(),
  email         text,
  phone         text,
  name          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists users_email_uq on analytics.users (lower(email)) where email is not null;
create unique index if not exists users_phone_uq on analytics.users (phone) where phone is not null;

-- One browser (anonymous id kept in localStorage + cookie)
create table if not exists analytics.visitors (
  id               uuid primary key,
  user_id          uuid references analytics.users(id) on delete set null,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  session_count    int not null default 0,
  -- first-touch attribution
  first_landing    text,
  first_referrer   text,
  first_channel    text,
  first_source     text,
  first_medium     text,
  first_campaign   text
);
create index if not exists visitors_user_idx on analytics.visitors (user_id);
create index if not exists visitors_last_seen_idx on analytics.visitors (last_seen_at desc);

-- One visit (ends after 30 min of inactivity or when the campaign changes)
create table if not exists analytics.sessions (
  id              uuid primary key,
  visitor_id      uuid not null references analytics.visitors(id) on delete cascade,
  user_id         uuid references analytics.users(id) on delete set null,
  started_at      timestamptz not null,
  last_seen_at    timestamptz not null,
  landing_path    text,
  exit_path       text,
  referrer        text,
  referrer_host   text,
  channel         text,          -- paid / organic / social / email / referral / direct
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  gclid           text,
  fbclid          text,
  device_type     text,          -- mobile / tablet / desktop
  os              text,
  browser         text,
  screen          text,
  language        text,
  timezone        text,
  country         text,
  region          text,
  city            text,
  page_views      int not null default 0,
  event_count     int not null default 0,
  engaged_ms      bigint not null default 0
);
create index if not exists sessions_visitor_idx on analytics.sessions (visitor_id, started_at desc);
create index if not exists sessions_started_idx on analytics.sessions (started_at desc);
create index if not exists sessions_user_idx on analytics.sessions (user_id);

-- The log: every event a visitor triggers
create table if not exists analytics.events (
  id           bigint generated always as identity primary key,
  event_id     uuid not null unique,     -- generated in the browser, makes retries idempotent
  session_id   uuid not null references analytics.sessions(id) on delete cascade,
  visitor_id   uuid not null references analytics.visitors(id) on delete cascade,
  name         text not null,
  path         text,
  title        text,
  props        jsonb not null default '{}',
  ts           timestamptz not null,     -- when it happened (browser clock, clamped by the server)
  received_at  timestamptz not null default now()
);
create index if not exists events_session_idx on analytics.events (session_id, ts);
create index if not exists events_visitor_idx on analytics.events (visitor_id, ts);
create index if not exists events_name_ts_idx on analytics.events (name, ts desc);
create index if not exists events_ts_idx on analytics.events (ts desc);
create index if not exists events_path_idx on analytics.events (path, ts desc) where name = 'page_view';

-- Every form submission (contact, corporate wellness, newsletter, waitlists, eBooks...)
create table if not exists analytics.leads (
  id          bigint generated always as identity primary key,
  form        text not null,
  session_id  uuid references analytics.sessions(id) on delete set null,
  visitor_id  uuid references analytics.visitors(id) on delete set null,
  user_id     uuid references analytics.users(id) on delete set null,
  path        text,
  name        text,
  email       text,
  phone       text,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists leads_created_idx on analytics.leads (created_at desc);
create index if not exists leads_user_idx on analytics.leads (user_id);

-- Every completed assessment, with scores, diagnosis and the individual answers
create table if not exists analytics.assessment_results (
  id            bigint generated always as identity primary key,
  assessment    text not null,           -- slug, e.g. assessment-knee-pain-level-1
  session_id    uuid references analytics.sessions(id) on delete set null,
  visitor_id    uuid references analytics.visitors(id) on delete set null,
  user_id       uuid references analytics.users(id) on delete set null,
  kind          text,                    -- pain / health / longevity
  area          text,                    -- knee / back / neck / shoulder ...
  result        text,                    -- winning category for pain assessments (muscle/nerve/bone/joint)
  condition     text,                    -- e.g. Osteoarthritis
  advisory      boolean,
  scores        jsonb not null default '{}',
  answers       jsonb not null default '[]',   -- [{id, label, value}]
  name          text,
  email         text,
  phone         text,
  created_at    timestamptz not null default now()
);
create index if not exists ar_created_idx on analytics.assessment_results (created_at desc);
create index if not exists ar_assessment_idx on analytics.assessment_results (assessment, created_at desc);

-- ---------- Views for the common questions (query these from the Supabase SQL editor too) ----------

create or replace view analytics.v_daily as
select d::date as day,
  (select count(*) from analytics.sessions s where s.started_at >= d and s.started_at < d + interval '1 day') as sessions,
  (select count(distinct visitor_id) from analytics.sessions s where s.started_at >= d and s.started_at < d + interval '1 day') as visitors,
  (select count(*) from analytics.events e where e.name = 'page_view' and e.ts >= d and e.ts < d + interval '1 day') as page_views,
  (select count(*) from analytics.leads l where l.created_at >= d and l.created_at < d + interval '1 day') as leads,
  (select count(*) from analytics.assessment_results a where a.created_at >= d and a.created_at < d + interval '1 day') as assessments
from generate_series(date_trunc('day', now()) - interval '89 days', date_trunc('day', now()), interval '1 day') d;

-- Where people drop out of each assessment: how many sessions reached each step
create or replace view analytics.v_assessment_steps as
select props->>'assessment' as assessment,
       (props->>'step')::int as step,
       max((props->>'total')::int) as total_steps,
       count(distinct session_id) as sessions
from analytics.events
where name = 'assessment_step'
group by 1, 2;

-- Attribution: which channel / campaign brings sessions that convert
create or replace view analytics.v_attribution as
select coalesce(s.channel, 'direct') as channel, s.utm_source, s.utm_campaign,
       count(*) as sessions,
       count(*) filter (where exists (select 1 from analytics.leads l where l.session_id = s.id)) as lead_sessions,
       count(*) filter (where exists (select 1 from analytics.assessment_results a where a.session_id = s.id)) as assessment_sessions
from analytics.sessions s
group by 1, 2, 3;
