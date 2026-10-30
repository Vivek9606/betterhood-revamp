// The /learn/ hero's sentence finder: "My [area] hurts [when …] and I want to [goal]" → matching reads.
// Used at build time (first paint shows the default sentence's results) and in the browser.

export type Row = { s: string; t: string; d: string; e: string; i: string; c: string[]; h: string[]; w: string[]; o: string[]; m: number; v: boolean };
type Opt = { v: string; label: string; icon: string };

// v = by-health-concern slug; plural areas take "hurt" instead of "hurts"
export const areas: (Opt & { plural?: boolean })[] = [
  { v: "back-pain", label: "back", icon: "back" },
  { v: "neck-pain", label: "neck", icon: "neck" },
  { v: "shoulder-pain", label: "shoulder", icon: "shoulder" },
  { v: "knee-pain", label: "knee", icon: "knee" },
  { v: "feet-pain", label: "feet", icon: "foot", plural: true },
  { v: "joint-pain", label: "joints", icon: "elbow", plural: true },
  { v: "", label: "body", icon: "activity" },
];

// matched against the title and excerpt, since posts aren't tagged by situation
export const moments: (Opt & { re: RegExp | null })[] = [
  { v: "desk", label: "when I sit at my desk", icon: "desk", re: /\b(desk|sitting|sit|office|work from home|laptop|workstation|chair)\b/i },
  { v: "sleep", label: "when I sleep or wake up", icon: "moon", re: /\b(sleep\w*|pillow|mattress|morning|wake|waking|bed)\b/i },
  { v: "active", label: "when I walk or exercise", icon: "dumbbell", re: /\b(run\w*|walk\w*|gym|workout|exercis\w*|sport\w*|training|yoga|cycling|stairs)\b/i },
  { v: "lift", label: "when I lift or carry", icon: "briefcase", re: /\b(lift\w*|carry\w*|bend\w*|heavy|baby|backpack)\b/i },
  { v: "phone", label: "when I'm on my phone", icon: "phone", re: /\b(phone|text neck|screen\w*|scroll\w*|tech neck)\b/i },
  { v: "travel", label: "when I drive or travel", icon: "car", re: /\b(driv\w*|travel\w*|commut\w*|flight|car)\b/i },
  { v: "age", label: "as I get older", icon: "heart", re: /\b(age|ageing|aging|older|senior\w*|menopause|elderly|bone density|osteo\w*)\b/i },
  { v: "", label: "most of the time", icon: "clock", re: null },
];

export const goals: (Opt & { test: ((r: Row) => boolean) | null })[] = [
  { v: "science", label: "understand why", icon: "book", test: (r) => r.w.includes("science") },
  { v: "protocol", label: "follow a routine", icon: "clipboard", test: (r) => r.w.includes("protocol") },
  { v: "recovery", label: "get quick relief", icon: "leaf", test: (r) => r.o.includes("recovery") },
  { v: "posture", label: "fix my posture", icon: "posture", test: (r) => r.o.includes("posture") },
  { v: "video", label: "watch a video", icon: "play", test: (r) => r.v },
  { v: "", label: "read anything", icon: "sparkles", test: null },
];

export type Pick = { area: string; moment: string; goal: string };
export const defaultPick: Pick = { area: "back-pain", moment: "desk", goal: "science" };

const byV = <T extends Opt>(list: T[], v: string) => list.find((o) => o.v === v) ?? list[list.length - 1];
export const optArea = (v: string) => byV(areas, v);
export const optMoment = (v: string) => byV(moments, v);
export const optGoal = (v: string) => byV(goals, v);

export function matches(rows: Row[], p: Pick) {
  const re = optMoment(p.moment).re, test = optGoal(p.goal).test;
  return rows
    .filter((r) => (!p.area || r.h.includes(p.area)) && (!test || test(r)) && (!re || re.test(r.t + " " + r.e)))
    // a title that names the situation is a better answer than a passing mention in the excerpt
    .map((r) => ({ r, k: (re && re.test(r.t) ? 2 : 0) + (r.i ? 1 : 0) }))
    .sort((a, b) => b.k - a.k || b.r.d.localeCompare(a.r.d))
    .map((x) => x.r);
}

// When the exact sentence has nothing, loosen it step by step so the visitor never hits a dead end
export function find(rows: Row[], p: Pick) {
  const exact = matches(rows, p);
  if (exact.length) return { list: exact, exact: exact.length, loosened: null as null | "moment" | "goal" };
  const noMoment = matches(rows, { ...p, moment: "" });
  if (noMoment.length) return { list: noMoment, exact: 0, loosened: "moment" as const };
  return { list: matches(rows, { ...p, moment: "", goal: "" }), exact: 0, loosened: "goal" as const };
}
