import { z } from "zod";

const str = (max: number) => z.string().max(max).optional().nullable();

export const Event = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64).regex(/^[a-z0-9_:.-]+$/i),
  ts: z.number().int(),
  path: str(512),
  title: str(300),
  props: z.record(z.string(), z.unknown()).optional().default({}),
});

// Session context, captured by the browser when the session starts and resent with each batch
export const Ctx = z.object({
  started_at: z.number().int(),
  landing: str(512),
  referrer: str(1024),
  utm_source: str(200),
  utm_medium: str(200),
  utm_campaign: str(200),
  utm_term: str(200),
  utm_content: str(200),
  gclid: str(300),
  fbclid: str(300),
  screen: str(32),
  language: str(32),
  timezone: str(64),
});

export const Batch = z.object({
  aid: z.string().uuid(),
  sid: z.string().uuid(),
  ctx: Ctx,
  events: z.array(Event).min(1).max(100),
});

export type Batch = z.infer<typeof Batch>;
export type Event = z.infer<typeof Event>;
