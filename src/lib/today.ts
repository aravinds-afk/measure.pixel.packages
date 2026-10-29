import { CONTENT_PILLARS, DAILY_NON_NEGOTIABLES, EVENTS, PHASES, PLAN, SEASONS, WEEKLY_RHYTHM, type DailyTask, type Season } from "@/data/growth-plan";

/** Pure planning maths for the morning page. Dates are YYYY-MM-DD in the business's local calendar. */

export const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

export function inSeason(s: Season, date: string) {
  const md = date.slice(5);
  return s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to;
}

/** Seasons active on a date, most specific first (year-round seasons last). */
export function activeSeasons(date: string): Season[] {
  const span = (s: Season) => {
    const [fm, fd] = s.from.split("-").map(Number);
    const [tm, td] = s.to.split("-").map(Number);
    const a = fm * 31 + fd, b = tm * 31 + td;
    return a <= b ? b - a : 372 - a + b;
  };
  return SEASONS.filter((s) => inSeason(s, date)).sort((a, b) => span(a) - span(b));
}

export type PlanTask = DailyTask & { id: string; date: string; source: "rhythm" | "daily" | "pipeline" | "event" };

export type PipelineSignals = {
  followUpsDue: { clientName: string; clientId: string; date: string }[];
  expiringQuotes: { number: string; quoteId: string; clientName: string; validUntil: string }[];
  staleDrafts: { number: string; quoteId: string; clientName: string }[];
  auditsWithoutQuote: { auditId: string; clientName: string }[];
};

const firstIndustryName = (s: Season, names: Record<string, string>) => names[s.industries[0]] ?? s.industries[0];

function fill(text: string, ctx: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? `{${k}}`);
}

/** Tasks for one date: rhythm (filled with the date's season/pillar), non-negotiables, events, and pipeline signals for today. */
export function tasksFor(date: string, industryNames: Record<string, string>, pipeline?: PipelineSignals): PlanTask[] {
  const seasons = activeSeasons(date);
  const n = Math.max(0, dayDiff(PLAN.start, date));
  // Rotate the focus season by day so the week covers more than one industry.
  const focus = seasons.length ? seasons[n % Math.min(seasons.length, 3)] : SEASONS[0];
  const pillar = CONTENT_PILLARS[n % CONTENT_PILLARS.length];
  const ctx = {
    pillar: pillar.name.toLowerCase(),
    industry: firstIndustryName(focus, industryNames).toLowerCase(),
    decisionMakers: focus.decisionMakers.toLowerCase(),
    decisionMakersShort: focus.decisionMakers.split(",")[0].toLowerCase(),
    angle: focus.angle,
    season: focus.name.toLowerCase(),
    searchIntent: focus.searches[0].replace(/^digital marketing |agency|company/gi, "").trim() || "grow enquiries",
  };
  const wd = weekday(date);
  const out: PlanTask[] = [];
  for (const t of WEEKLY_RHYTHM[wd] ?? []) out.push({ ...t, text: fill(t.text, ctx), id: `${date}:${t.key}`, date, source: "rhythm" });
  if (wd !== 0) for (const t of DAILY_NON_NEGOTIABLES) out.push({ ...t, id: `${date}:${t.key}`, date, source: "daily" });
  for (const e of EVENTS) {
    const d = dayDiff(date, e.date);
    if (d === 0) out.unshift({ key: `event-${e.date}`, channel: "CEO", text: `${e.name} today. ${e.note}`, minutes: 0, id: `${date}:event-${e.date}`, date, source: "event" });
    else if (d === 3 || d === 7) out.push({ key: `event-prep-${e.date}`, channel: "CEO", text: `${e.name} in ${d} days. ${e.note}`, minutes: 10, id: `${date}:event-prep-${e.date}`, date, source: "event" });
  }
  if (pipeline) {
    for (const f of pipeline.followUpsDue) out.unshift({ key: `fu-${f.clientId}`, channel: "Pipeline", text: `Follow up with ${f.clientName} (due ${f.date}).`, minutes: 10, id: `${date}:fu-${f.clientId}`, date, source: "pipeline" });
    for (const q of pipeline.expiringQuotes) out.unshift({ key: `exp-${q.quoteId}`, channel: "Pipeline", text: `${q.number} for ${q.clientName} expires ${q.validUntil}. Call for a decision or revise it.`, minutes: 15, id: `${date}:exp-${q.quoteId}`, date, source: "pipeline" });
    for (const q of pipeline.staleDrafts) out.push({ key: `draft-${q.quoteId}`, channel: "Pipeline", text: `Draft ${q.number} for ${q.clientName} is unsent. Finish and send it or delete it.`, minutes: 15, id: `${date}:draft-${q.quoteId}`, date, source: "pipeline" });
    for (const a of pipeline.auditsWithoutQuote) out.push({ key: `aud-${a.auditId}`, channel: "Pipeline", text: `${a.clientName} has an audit but no quotation. Build one.`, minutes: 15, id: `${date}:aud-${a.auditId}`, date, source: "pipeline" });
  }
  return out;
}

/** The three things that matter most today: pipeline money first, then a conversation, then visibility. */
export function topThree(tasks: PlanTask[]): PlanTask[] {
  const rank = (t: PlanTask) =>
    t.source === "pipeline" && t.key.startsWith("exp-") ? 0
    : t.source === "pipeline" && t.key.startsWith("fu-") ? 1
    : t.key === "daily-conversation" ? 2
    : t.source === "event" && t.minutes === 0 ? 3
    : t.channel === "BNI" ? 4
    : t.source === "rhythm" && t.channel === "Pipeline" ? 5
    : t.source === "pipeline" ? 6
    : t.source === "rhythm" ? 7
    : 8;
  return [...tasks].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}

export function planPosition(date: string) {
  const day = dayDiff(PLAN.start, date) + 1;
  const clamped = Math.min(Math.max(day, 1), PLAN.days);
  const phase = PHASES.find((p) => clamped >= p.fromDay && clamped <= p.toDay) ?? PHASES[PHASES.length - 1];
  return { day, clamped, week: Math.ceil(clamped / 7), phase, daysLeft: Math.max(0, PLAN.days - day + 1), started: day >= 1, finished: day > PLAN.days };
}

/** Required pace to close the revenue gap by the target date. */
export function pace(input: { gap: number; avgRetainer: number; closeRate: number; today: string; targetDate: string }) {
  const clientsNeeded = input.avgRetainer > 0 ? Math.ceil(input.gap / input.avgRetainer) : 0;
  const conversationsNeeded = input.closeRate > 0 ? Math.ceil(clientsNeeded / input.closeRate) : 0;
  const weeksLeft = Math.max(1, Math.ceil(dayDiff(input.today, input.targetDate) / 7));
  return { clientsNeeded, conversationsNeeded, weeksLeft, closeRate: input.closeRate, perWeek: Math.ceil(conversationsNeeded / weeksLeft), daysToTarget: dayDiff(input.today, input.targetDate) };
}

export function upcomingEvents(date: string, withinDays = 30) {
  return EVENTS.map((e) => ({ ...e, inDays: dayDiff(date, e.date) })).filter((e) => e.inDays >= 0 && e.inDays <= withinDays);
}

export function pillarFor(date: string) {
  return CONTENT_PILLARS[Math.max(0, dayDiff(PLAN.start, date)) % CONTENT_PILLARS.length];
}
