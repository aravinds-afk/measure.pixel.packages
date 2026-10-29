"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { PHASES } from "@/data/growth-plan";
import { addDays } from "@/lib/today";
import { useToast } from "@/components/toast";
import { Badge, Button, buttonClass, Card, cx } from "@/components/ui";
import type { TodayData } from "@/server/services/today";

const CHANNEL_TONE: Record<string, "dark" | "info" | "accent" | "warn" | "ok" | "neutral"> = {
  CEO: "dark", Pipeline: "warn", LinkedIn: "info", Instagram: "accent", YouTube: "neutral", BNI: "ok",
};

const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });

export function TodayView({ data, firstName, isToday }: { data: TodayData; firstName: string; isToday: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState(new Set(data.done));
  const [brief, setBrief] = useState(data.brief?.text ?? null);
  const [writing, setWriting] = useState(false);
  const r = data.revenue;
  const pos = data.position;
  const streamStage = pos.clamped <= 30 ? "day30" : pos.clamped <= 60 ? "day60" : "day90";

  const toggle = async (id: string) => {
    const next = !done.has(id);
    setDone((s) => { const c = new Set(s); if (next) c.add(id); else c.delete(id); return c; });
    try {
      await api("/api/today/tasks", { body: { id, done: next } });
    } catch (e) {
      setDone((s) => { const c = new Set(s); if (next) c.delete(id); else c.add(id); return c; });
      toast("danger", (e as Error).message);
    }
  };

  const write = async () => {
    setWriting(true);
    try {
      const res = await api<{ text: string }>("/api/today/brief", { body: {} });
      setBrief(res.text);
    } catch (e) {
      toast("danger", (e as Error).message);
    } finally {
      setWriting(false);
    }
  };

  const doneToday = data.tasks.filter((t) => done.has(t.id)).length;
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greeting = !isToday ? "Plan for" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <Link href={`/today?date=${addDays(data.date, -1)}`} className="text-ink-3 hover:text-ink">← {fmtDay(addDays(data.date, -1), { weekday: "short", day: "numeric" })}</Link>
          {!isToday && <Link href="/today" className="font-medium underline">Back to today</Link>}
          <Link href={`/today?date=${addDays(data.date, 1)}`} className="text-ink-3 hover:text-ink">{fmtDay(addDays(data.date, 1), { weekday: "short", day: "numeric" })} →</Link>
        </div>
        <p className="eyebrow">{fmtDay(data.date)} · {pos.started ? `Day ${Math.min(pos.day, data.plan.days)} of ${data.plan.days}` : `Plan starts ${fmtDay(data.plan.start, { day: "numeric", month: "short" })}`} · {pos.phase.name}</p>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">{greeting}{isToday ? `, ${firstName}.` : ` ${fmtDay(data.date, { weekday: "long", day: "numeric", month: "short" })}.`}</h1>
        <p className="max-w-2xl text-[15px] text-ink-2">{data.plan.positioning}</p>
      </header>

      <section className="rounded-[18px] bg-panel p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-accent">North star · {data.plan.northStar}</p>
            <p className="num mt-2 text-[36px] font-semibold leading-none sm:text-[46px]">{formatINR(r.signedMonthly)}<span className="text-[18px] text-white/50">/mo signed</span></p>
          </div>
          <div className="num text-right text-[14px] text-white/70">
            <p>Gap <span className="text-white">{formatINR(r.gap)}</span>/mo</p>
            <p>{data.pace.daysToTarget > 0 ? `${data.pace.daysToTarget} days to 23 Jan` : "Target date passed"}</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(1, r.progress * 100)}%` }} /></div>
        <p className="mt-4 text-[14px] text-white/80">
          Pace needed: <b className="text-white">{data.pace.perWeek} discovery conversations a week</b> → {data.pace.clientsNeeded} more retainers at the average retainer, closing 1 in {Math.round(1 / data.pace.closeRate)}. Pipeline: {formatINR(r.pipelineMonthly)}/mo across {r.openCount} open proposal{r.openCount === 1 ? "" : "s"}.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Today's three" sub={`${doneToday} of ${data.tasks.length} tasks done today`} />
        <div className="grid gap-3 lg:grid-cols-3">
          {data.top.map((t, i) => (
            <button key={t.id} onClick={() => toggle(t.id)} aria-pressed={done.has(t.id)}
              className={cx("card flex min-h-[120px] flex-col items-start gap-3 p-5 text-left transition-colors", done.has(t.id) && "opacity-60")}>
              <span className="flex w-full items-center justify-between"><span className="num text-[13px] text-ink-3">0{i + 1}</span><Check on={done.has(t.id)} /></span>
              <span className={cx("text-[16px] font-medium leading-snug", done.has(t.id) && "line-through")}>{t.text}</span>
              <Badge tone={CHANNEL_TONE[t.channel]}>{t.channel}</Badge>
            </button>
          ))}
        </div>
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold">Morning brief</p>
            <p className="text-[13px] text-ink-3">{data.aiEnabled ? "Written by Claude from today's season, pipeline and plan." : "Set ANTHROPIC_API_KEY on the server to have Claude write this each morning."}</p>
          </div>
          {data.aiEnabled && isToday && <Button variant={brief ? "secondary" : "primary"} size="sm" onClick={write} loading={writing}>{brief ? "Rewrite" : "Write today's brief"}</Button>}
        </div>
        {brief && <div className="mt-4 border-t border-border pt-4"><Markdownish text={brief} /></div>}
      </Card>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Season now" sub="Who to be in front of, what they're dealing with, and what they search for. Planning assumptions — check them against your pipeline." />
        <div className="grid gap-3 lg:grid-cols-3">
          {data.seasons.slice(0, 3).map((s) => (
            <Card key={s.id} className="flex flex-col gap-3 p-5">
              <p className="text-[17px] font-semibold">{s.name}</p>
              <p className="text-[14px] text-ink-2">{s.happening}</p>
              <div className="flex flex-wrap gap-1.5">{s.industryNames.map((n) => <Badge key={n}>{n}</Badge>)}</div>
              <Row label="Approach">{s.decisionMakers}</Row>
              <Row label="Lead with">{s.leadOfferName}</Row>
              <Row label="They search">{s.searches.map((q) => `“${q}”`).join(" · ")}</Row>
              <Row label="Angle">{s.angle}</Row>
            </Card>
          ))}
        </div>
        {data.events.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[13px]">
            {data.events.map((e) => <span key={e.date} className="rounded-full bg-surface-2 px-3 py-1.5"><b>{e.name}</b> · {e.inDays === 0 ? "today" : `in ${e.inDays} days`}</span>)}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="All of today" sub={`Content pillar: ${data.pillar.name} — ${data.pillar.promptHint}.`} action={<Link href="/audits/new" className={buttonClass("secondary", "sm")}>Run automatic audit</Link>} />
        <TaskList tasks={data.tasks} done={done} toggle={toggle} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Next 3 days" />
        <div className="grid gap-3 lg:grid-cols-3">
          {data.next3.map((d) => (
            <Card key={d.date} className="p-4">
              <p className="mb-2 text-[14px] font-semibold">{fmtDay(d.date, { weekday: "long", day: "numeric", month: "short" })}</p>
              <ul className="flex flex-col gap-2 text-[13px]">
                {d.tasks.filter((t) => t.source !== "daily").map((t) => (
                  <li key={t.id} className="flex gap-2"><Badge tone={CHANNEL_TONE[t.channel]}>{t.channel}</Badge><span className="min-w-0">{t.text}</span></li>
                ))}
                <li className="text-ink-3">+ daily: 1 conversation · 5 touches · follow-ups</li>
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="90-day roadmap" sub={`${fmtDay(data.plan.start, { day: "numeric", month: "short" })} → ${fmtDay(addDays(data.plan.start, data.plan.days - 1), { day: "numeric", month: "short", year: "numeric" })}`} />
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pos.clamped} aria-valuemax={data.plan.days} aria-label="Plan progress">
          <div className="h-full bg-ink" style={{ width: `${pos.started ? (Math.min(pos.day, data.plan.days) / data.plan.days) * 100 : 0}%` }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => (
            <Card key={p.id} className={cx("p-4", p.id === pos.phase.id && "border-ink")}>
              <p className="num text-[12px] text-ink-3">Days {p.fromDay}–{p.toDay}{p.id === pos.phase.id ? " · now" : ""}</p>
              <p className="text-[16px] font-semibold">{p.name}</p>
              <p className="mt-1 text-[13px] text-ink-2">{p.goal}</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[13px]">{p.milestones.map((m) => <li key={m}>{m}</li>)}</ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Be in front of decision-makers" sub={data.plan.audience} />
        <Card className="divide-y divide-border">
          {data.visibility.map((v) => (
            <div key={v.channel} className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr_160px]">
              <p className="font-medium">{v.channel}</p>
              <p className="text-[14px] text-ink-2">{v.play}</p>
              <p className="text-[13px] text-ink-3 sm:text-right">{v.cadence}</p>
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Income streams" sub={`Milestones for day ${streamStage === "day30" ? 30 : streamStage === "day60" ? 60 : 90}. Retainers fund the target; the rest grow alongside.`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.incomeStreams.map((st) => (
            <Card key={st.id} className="p-4">
              <p className="text-[15px] font-semibold">{st.name}</p>
              <p className="text-[12px] text-ink-3">{st.role}</p>
              <p className="mt-2 text-[14px]"><span className="text-ink-3">By day {streamStage.slice(3)}: </span>{st[streamStage]}</p>
              <p className="mt-1 text-[13px] text-ink-2">Weekly: {st.weekly}</p>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-center text-[12px] text-ink-3"><button onClick={() => router.refresh()} className="underline">Refresh</button> · Seasons and windows are planning assumptions for Chennai; edit them in src/data/growth-plan.ts.</p>
    </div>
  );
}

function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
        {sub && <p className="text-[14px] text-ink-2">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <p className="text-[13px]"><span className="text-ink-3">{label}: </span>{children}</p>;
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cx("flex h-6 w-6 items-center justify-center rounded-full border text-[13px]", on ? "border-ink bg-ink text-white" : "border-border-strong")}>{on ? "✓" : ""}</span>
  );
}

function TaskList({ tasks, done, toggle }: { tasks: TodayData["tasks"]; done: Set<string>; toggle: (id: string) => void }) {
  const total = tasks.reduce((n, t) => n + t.minutes, 0);
  return (
    <Card className="divide-y divide-border">
      {tasks.map((t) => (
        <button key={t.id} onClick={() => toggle(t.id)} aria-pressed={done.has(t.id)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-surface-2">
          <Check on={done.has(t.id)} />
          <span className="min-w-0 flex-1">
            <span className={cx("text-[15px]", done.has(t.id) && "text-ink-3 line-through")}>{t.text}</span>
            <span className="mt-1 flex gap-2"><Badge tone={CHANNEL_TONE[t.channel]}>{t.channel}</Badge>{t.minutes > 0 && <span className="text-[12px] text-ink-3">{t.minutes} min</span>}</span>
          </span>
        </button>
      ))}
      <p className="px-5 py-2.5 text-[12px] text-ink-3">About {Math.round(total / 15) / 4} hours planned. Pipeline items appear automatically from follow-up dates, expiring quotations and unsent drafts.</p>
    </Card>
  );
}

/** Renders the brief's light markdown (headings, bullets, bold) without HTML injection. */
function Markdownish({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));
  return (
    <div className="flex flex-col gap-2 text-[15px] leading-relaxed">
      {text.split("\n").filter((l) => l.trim()).map((l, i) => {
        const h = l.match(/^#{1,4}\s+(.*)/);
        if (h) return <p key={i} className="mt-2 font-semibold">{inline(h[1])}</p>;
        const b = l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
        if (b) return <p key={i} className="flex gap-2"><span className="text-ink-3">•</span><span>{inline(b[1])}</span></p>;
        return <p key={i}>{inline(l)}</p>;
      })}
    </div>
  );
}
