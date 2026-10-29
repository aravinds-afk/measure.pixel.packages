import "server-only";
import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { INCOME_STREAMS, PLAN, VISIBILITY_PLAYS } from "@/data/growth-plan";
import { activeSeasons, addDays, pace, pillarFor, planPosition, tasksFor, topThree, upcomingEvents, type PipelineSignals } from "@/lib/today";
import type { DB } from "../db";
import * as s from "../db/schema";
import type { Settings } from "../settings";
import { getBrief } from "./brief";
import { effectiveStatus } from "./quotes";
import { loadRevenue } from "./revenue";

/** Today's date in the business's time zone (IST by default), YYYY-MM-DD. */
export function localToday(timeZone = "Asia/Kolkata", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

async function pipelineSignals(db: DB, date: string): Promise<PipelineSignals> {
  const [due, quotes, audits] = await Promise.all([
    db.select().from(s.clients).where(and(isNotNull(s.clients.nextFollowUp), lte(s.clients.nextFollowUp, date))),
    db.select({ q: s.quotes, name: s.clients.businessName }).from(s.quotes).innerJoin(s.clients, eq(s.clients.id, s.quotes.clientId)).where(inArray(s.quotes.status, ["draft", "presented", "sent"])),
    db.select({ a: s.audits, name: s.clients.businessName }).from(s.audits).innerJoin(s.clients, eq(s.clients.id, s.audits.clientId)).where(gte(s.audits.createdAt, addDays(date, -21))),
  ]);
  const withQuote = new Set((await db.select({ auditId: s.quotes.auditId }).from(s.quotes)).map((x) => x.auditId));
  const latestPerRoot = new Map<string, (typeof quotes)[number]>();
  for (const x of quotes) {
    const c = latestPerRoot.get(x.q.rootId);
    if (!c || x.q.version > c.q.version) latestPerRoot.set(x.q.rootId, x);
  }
  const open = [...latestPerRoot.values()];
  return {
    followUpsDue: due.map((c) => ({ clientId: c.id, clientName: c.businessName, date: c.nextFollowUp! })),
    expiringQuotes: open
      .filter((x) => (x.q.status === "presented" || x.q.status === "sent") && effectiveStatus(x.q, date) !== "expired" && x.q.validUntil && x.q.validUntil <= addDays(date, 3))
      .map((x) => ({ quoteId: x.q.id, number: x.q.number, clientName: x.name, validUntil: x.q.validUntil! })),
    staleDrafts: open.filter((x) => x.q.status === "draft" && x.q.updatedAt.slice(0, 10) <= addDays(date, -2)).map((x) => ({ quoteId: x.q.id, number: x.q.number, clientName: x.name })),
    auditsWithoutQuote: audits.filter((x) => !withQuote.has(x.a.id) && Object.keys(x.a.responses).length > 0).map((x) => ({ auditId: x.a.id, clientName: x.name })),
  };
}

export async function buildToday(db: DB, settings: Settings, date: string) {
  const [industries, revenue, signals, doneRows, brief, offers] = await Promise.all([
    db.select().from(s.industries),
    loadRevenue(db, settings),
    pipelineSignals(db, date),
    db.select().from(s.planProgress).where(and(gte(s.planProgress.date, date), lte(s.planProgress.date, addDays(date, 3)))),
    getBrief(db, date),
    db.select().from(s.offers),
  ]);
  const names = Object.fromEntries(industries.map((i) => [i.id, i.name]));
  const offerName = Object.fromEntries(offers.map((o) => [o.id, o.name]));
  const tasks = tasksFor(date, names, signals);
  const next3 = [1, 2, 3].map((n) => {
    const d = addDays(date, n);
    return { date: d, tasks: tasksFor(d, names) };
  });
  const position = planPosition(date);
  const p = pace({ gap: revenue.gap, avgRetainer: settings.plan.avgRetainer, closeRate: settings.plan.closeRate, today: date, targetDate: settings.revenue.targetDate });
  const seasons = activeSeasons(date).map((x) => ({ ...x, industryNames: x.industries.map((i) => names[i] ?? i), leadOfferName: offerName[x.leadOffer] ?? x.leadOffer }));

  return {
    date,
    plan: PLAN,
    position,
    revenue,
    pace: p,
    seasons,
    pillar: pillarFor(date),
    events: upcomingEvents(date, 30),
    tasks,
    top: topThree(tasks),
    next3,
    done: doneRows.map((r) => r.id),
    signals,
    incomeStreams: INCOME_STREAMS,
    visibility: VISIBILITY_PLAYS,
    brief: brief ? { text: brief.text, createdAt: brief.createdAt } : null,
    aiEnabled: !!process.env.ANTHROPIC_API_KEY,
  };
}
export type TodayData = Awaited<ReturnType<typeof buildToday>>;

/** Compact context for the AI brief: facts only, no personal data beyond business names. */
export function briefContext(t: TodayData) {
  return {
    date: t.date,
    planDay: `${t.position.clamped} of ${t.plan.days}`,
    phase: { name: t.position.phase.name, goal: t.position.phase.goal },
    revenue: { signedPerMonthINR: t.revenue.signedMonthly / 100, targetINR: t.revenue.targetMonthly / 100, gapINR: t.revenue.gap / 100, pipelinePerMonthINR: t.revenue.pipelineMonthly / 100, openProposals: t.revenue.openCount },
    pace: t.pace,
    seasons: t.seasons.slice(0, 3).map((x) => ({ name: x.name, happening: x.happening, industries: x.industryNames, decisionMakers: x.decisionMakers, leadOffer: x.leadOfferName, angle: x.angle, searches: x.searches })),
    contentPillar: t.pillar.name,
    upcomingEvents: t.events.map((e) => `${e.name} in ${e.inDays} days`),
    plannedTasks: t.tasks.map((x) => `[${x.channel}] ${x.text}`),
    incomeStreams: t.incomeStreams.map((x) => ({ name: x.name, next: t.position.clamped <= 30 ? x.day30 : t.position.clamped <= 60 ? x.day60 : x.day90 })),
  };
}
