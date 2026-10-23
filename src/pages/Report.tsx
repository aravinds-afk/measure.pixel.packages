import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, Bookmark, CalendarCheck, ChevronDown, Lightbulb, MessageCircle, Printer, Share2, Sparkle, ThumbsDown, ThumbsUp, Zap,
} from "lucide-react";
import { getCategory, getSphere, type CompatibilityResult, type MemberProfile, type ReferralOpportunity, type Scripts } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import { IS_ARTIFACT } from "../lib/env.ts";
import type { Feedback } from "../lib/backend/index.ts";
import {
  Avatar, Badge, Bar, Button, Card, CardHeader, CategoryIcon, categoryName, ConfidenceBadge, CopyButton, ErrorNote, Modal, Notice, ProvenanceBadge,
  ScoreRing, Spinner, Tabs, Textarea, cx,
} from "../components/ui.tsx";

export default function Report() {
  const { a, b } = useParams();
  const { backend, memberById, session, toast } = useApp();
  const ma = memberById(a);
  const mb = memberById(b);
  const q = useAsync(() => backend.compatibility(a!, b!), [a, b]);
  const fb = useAsync(() => backend.myFeedback(), [a, b]);
  const [explanation, setExplanation] = useState<{ text: string; source: string } | null>(null);
  const [explaining, setExplaining] = useState(false);

  if (!ma || !mb) return <ErrorNote message="One of these members is not visible to you or no longer active." />;
  if (q.error) return <ErrorNote message={q.error} />;
  if (q.loading || !q.data) return <Spinner label="Calculating compatibility…" />;
  const r = q.data;
  const involved = session?.memberId === ma.id || session?.memberId === mb.id;
  const other = session?.memberId === ma.id ? mb : ma;

  async function share() {
    const url = window.location.href;
    const text = `${ma!.fullName} + ${mb!.fullName}: ${r.score}/100 (${r.label}) on ConnectSphere`;
    try {
      if (navigator.share && !IS_ARTIFACT) {
        await navigator.share({ title: "Compatibility report", text, url });
        return;
      }
    } catch {
      /* share unavailable or cancelled: fall back to copying */
    }
    try {
      await navigator.clipboard.writeText(IS_ARTIFACT ? `${text}\n\n${r.summary}` : url);
      toast(IS_ARTIFACT ? "Report summary copied" : "Link copied. Only chapter members can open it.", "info");
    } catch {
      toast("Copying is blocked in this browser.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/compatibility" className="text-sm text-blue-700 hover:underline">← Compare other members</Link>
        <div className="flex flex-wrap gap-2">
          {involved && <Button variant="secondary" onClick={async () => { try { await backend.saveConnection(other.id, r.score); toast("Saved to your connections"); } catch (e) { toast((e as Error).message, "error"); } }}><Bookmark className="h-4 w-4" /> Save</Button>}
          {involved && <Link to={`/meetings?with=${other.id}`}><Button variant="secondary"><CalendarCheck className="h-4 w-4" /> Plan one-to-one</Button></Link>}
          <Button variant="secondary" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
          {!IS_ARTIFACT && <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Export PDF</Button>}
        </div>
      </div>

      {/* A. Overview */}
      <Card className="print-area overflow-hidden">
        <div className="bg-gradient-to-br from-navy-950 to-navy-800 px-5 py-6 text-white sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-300">Compatibility report</div>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">{r.headline}</h1>
        </div>
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <Person m={ma} align="left" />
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={r.score} size={150} stroke={12} />
            <div className="text-center font-display text-base font-bold text-navy-950">{r.exploratory ? "Exploratory assessment" : r.label}</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <ConfidenceBadge level={r.confidence.level} />
              {r.history.proven ? <Badge tone="green">Proven: {r.history.aToB + r.history.bToA} referrals recorded</Badge> : <Badge>Potential — no referral history yet</Badge>}
              {r.isCompetitor && <Badge tone="amber">Same category</Badge>}
            </div>
          </div>
          <Person m={mb} align="right" />
        </div>
        <div className="border-t border-slate-100 px-5 py-5 sm:px-8">
          <h2 className="mb-2 text-sm font-semibold text-navy-950">Why this match works</h2>
          <ul className="space-y-1.5">
            {r.whyBullets.map((w, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{w}</li>)}
          </ul>
          <p className="mt-4 text-sm text-slate-600">{r.summary}</p>
          {r.confidence.level !== "High" && (
            <div className="mt-4"><Notice tone="warn">
              {r.confidence.note}
              {r.confidence.missing.memberA.length > 0 && <div className="mt-1 text-xs">{ma.fullName} is missing: {r.confidence.missing.memberA.join(", ")}.</div>}
              {r.confidence.missing.memberB.length > 0 && <div className="text-xs">{mb.fullName} is missing: {r.confidence.missing.memberB.join(", ")}.</div>}
            </Notice></div>
          )}
          <div className="no-print mt-4">
            {explanation ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 text-sm text-slate-800">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-violet-800"><Sparkle className="h-3.5 w-3.5" /> {explanation.source === "ai" ? "AI-written explanation (from the facts above only)" : "Plain-language explanation"}</div>
                {explanation.text}
              </div>
            ) : (
              <Button variant="ghost" size="sm" loading={explaining} onClick={async () => { setExplaining(true); try { setExplanation(await backend.explain(ma.id, mb.id)); } catch (e) { toast((e as Error).message, "error"); } finally { setExplaining(false); } }}>
                <Sparkle className="h-3.5 w-3.5" /> Explain in plain language
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Breakdown r={r} />
      <Matches r={r} ma={ma} mb={mb} />

      {/* C. Referral exchange */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OpportunityPanel title={`Referrals ${ma.fullName.split(" ")[0]} can give ${mb.fullName.split(" ")[0]}`} strength={r.directional.aToB} opps={r.referrals.aToB} feedback={fb.data ?? []} onFeedback={fb.reload} />
        <OpportunityPanel title={`Referrals ${mb.fullName.split(" ")[0]} can give ${ma.fullName.split(" ")[0]}`} strength={r.directional.bToA} opps={r.referrals.bToA} feedback={fb.data ?? []} onFeedback={fb.reload} />
      </div>

      <TriggerIntel r={r} ma={ma} mb={mb} />
      <ScriptsPanel r={r} ma={ma} mb={mb} />
      <SideBySide ma={ma} mb={mb} />
      <p className="text-center text-[11px] text-slate-400">Engine v{r.engineVersion} · calculated {new Date(r.computedAt).toLocaleString()} · Scores indicate potential compatibility and are not revenue forecasts.</p>
    </div>
  );
}

function Person({ m, align }: { m: MemberProfile; align: "left" | "right" }) {
  return (
    <Link to={`/members/${m.id}`} className={cx("flex items-center gap-3", align === "right" && "lg:flex-row-reverse lg:text-right")}>
      <Avatar member={m} size={64} />
      <div className="min-w-0">
        <div className="text-lg font-semibold text-navy-950">{m.fullName}</div>
        <div className={cx("flex items-center gap-1.5 text-sm text-navy-800", align === "right" && "lg:justify-end")}><CategoryIcon categoryId={m.categoryId} /> {categoryName(m)}</div>
        <div className="text-xs text-slate-500">{m.company}</div>
      </div>
    </Link>
  );
}

function Breakdown({ r }: { r: CompatibilityResult }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="Score breakdown" subtitle="Compatibility = Σ (factor score × weight). Factors without enough data are excluded and their weight redistributed — never counted as zero." />
      <div className="divide-y divide-slate-100">
        {r.factors.map((f) => (
          <div key={f.key}>
            <button className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto_auto]" onClick={() => setOpen(open === f.key ? null : f.key)} aria-expanded={open === f.key}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-navy-950">{f.label}</div>
                <div className="text-[11px] text-slate-500">Weight {f.weight}%{f.score != null && f.effectiveWeight !== f.weight ? ` → ${f.effectiveWeight}% after redistribution` : ""}</div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">{f.score == null ? <span className="text-xs text-slate-400">Not enough data</span> : <><Bar value={f.score} /><span className="w-8 text-right text-xs font-semibold">{f.score}</span></>}</div>
              <div className="text-right text-sm font-semibold text-navy-900">{f.score == null ? "—" : `+${f.contribution}`}</div>
              <ChevronDown className={cx("hidden h-4 w-4 text-slate-400 transition sm:block", open === f.key && "rotate-180")} />
            </button>
            {open === f.key && (
              <div className="bg-slate-50/60 px-5 pb-4 pt-1 text-sm">
                <ul className="list-disc space-y-1 pl-5 text-slate-700">{f.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {f.evidence.length > 0 && (
                  <div className="mt-2 space-y-1">{f.evidence.map((e, i) => <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><Badge tone={e.source === "member_data" ? "blue" : e.source === "referral_history" ? "green" : "slate"}>{e.source.replace(/_/g, " ")}</Badge>{e.provenance && <ProvenanceBadge provenance={e.provenance} />}{e.text}</div>)}</div>
                )}
              </div>
            )}
          </div>
        ))}
        {r.adjustments.map((a) => (
          <div key={a.key} className="flex items-start justify-between gap-3 bg-amber-50/60 px-5 py-3 text-sm">
            <div><div className="font-medium text-amber-900">{a.label}</div><div className="text-xs text-amber-800">{a.description}</div></div>
            <div className="whitespace-nowrap font-semibold text-amber-900">{a.before} → {a.after}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3 text-sm font-semibold"><span>Total</span><span>{r.score} / 100</span></div>
      </div>
    </Card>
  );
}

function List({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {items.length ? <ul className="space-y-1">{items.map((i, k) => <li key={k} className="text-sm text-slate-700">• {i}</li>)}</ul> : <p className="text-sm text-slate-400">{empty}</p>}
    </div>
  );
}

function Matches({ r, ma, mb }: { r: CompatibilityResult; ma: MemberProfile; mb: MemberProfile }) {
  const m = r.matches;
  return (
    <Card>
      <CardHeader title="What matches them" subtitle="Drawn from both members' profile data." />
      <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <List title="Shared target customers" items={m.sharedCustomers} empty="No overlapping customer types listed." />
        <List title="Complementary services" items={m.complementaryServices} empty="Services not listed on one profile." />
        <List title="Common industries" items={m.commonIndustries} empty="No common industries listed." />
        <List title="Shared geographic markets" items={m.sharedMarkets} empty="No shared markets listed." />
        <List title="Customer problems they solve together" items={m.problemsTogether} empty="Problems solved not listed." />
        <List title="Opportunities to collaborate" items={m.collaborationIdeas} empty="No established collaboration pattern." />
        <div className="sm:col-span-2 lg:col-span-3"><List title={`Gaps in ${ma.fullName.split(" ")[0]} and ${mb.fullName.split(" ")[0]}'s combined offering`} items={m.gaps} empty="No gaps identified." /></div>
        {r.sharedSpheres.length > 0 && <div className="flex flex-wrap gap-1.5 sm:col-span-2 lg:col-span-3">{r.sharedSpheres.map((s) => <Badge key={s} tone="blue">{getSphere(s)?.name} sphere</Badge>)}</div>}
      </div>
    </Card>
  );
}

function OpportunityPanel({ title, strength, opps, feedback, onFeedback }: { title: string; strength: number; opps: ReferralOpportunity[]; feedback: Feedback[]; onFeedback: () => void }) {
  return (
    <Card>
      <CardHeader icon={<ArrowRight className="h-4 w-4" />} title={title} subtitle={<span className="flex items-center gap-2">Referral likelihood <span className="inline-block w-24"><Bar value={strength} /></span> {strength}</span>} />
      <div className="space-y-4 p-4">{opps.map((o) => <OpportunityCard key={o.id} o={o} feedback={feedback.find((f) => f.key === o.id)} onFeedback={onFeedback} />)}</div>
    </Card>
  );
}

function OpportunityCard({ o, feedback, onFeedback }: { o: ReferralOpportunity; feedback?: Feedback; onFeedback: () => void }) {
  const { backend, toast } = useApp();
  const [intro, setIntro] = useState(o.suggestedIntro);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const send = async (verdict: "useful" | "inaccurate", n?: string) => {
    try {
      await backend.giveFeedback(o.id, o.giverId, o.receiverId, verdict, n);
      toast(verdict === "useful" ? "Thanks — marked useful" : "Thanks — flagged for admin review");
      onFeedback();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge tone="navy">{o.type}</Badge>
        <ConfidenceBadge level={o.confidence} />
      </div>
      <h3 className="mt-2 text-sm font-semibold text-navy-950">{o.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{o.relevance}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {o.lookFor.length > 0 && <List title="People to look for" items={o.lookFor} empty="" />}
        {o.qualificationQuestions.length > 0 && <List title="Qualification questions" items={o.qualificationQuestions} empty="" />}
      </div>
      {o.triggerSituations.length > 0 && <div className="mt-3"><List title="Trigger situations" items={o.triggerSituations} empty="" /></div>}
      {o.triggerWords.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Trigger words</div>
          <div className="flex flex-wrap gap-1.5">{o.triggerWords.map((w) => <Badge key={w} tone="blue">“{w}”</Badge>)}</div>
        </div>
      )}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested introduction</span><CopyButton text={intro} /></div>
        <Textarea aria-label="Suggested introduction" value={intro} onChange={(e) => setIntro(e.target.value)} className="text-[13px]" />
      </div>
      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium text-slate-600">Evidence ({o.evidence.length})</summary>
        <ul className="mt-2 space-y-1">{o.evidence.map((e, i) => <li key={i} className="flex flex-wrap items-center gap-1.5"><Badge tone={e.source === "member_data" ? "blue" : "slate"}>{e.source.replace(/_/g, " ")}</Badge>{e.provenance && <ProvenanceBadge provenance={e.provenance} />}{e.text}</li>)}</ul>
      </details>
      <div className="no-print mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">Is this recommendation useful?</span>
        <Button size="sm" variant={feedback?.verdict === "useful" ? "primary" : "ghost"} onClick={() => send("useful")} aria-label="Useful"><ThumbsUp className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant={feedback?.verdict === "inaccurate" ? "danger" : "ghost"} onClick={() => setNoteOpen(true)} aria-label="Inaccurate"><ThumbsDown className="h-3.5 w-3.5" /></Button>
      </div>
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="What's inaccurate?">
        <Textarea placeholder="e.g. I don't serve this customer type any more" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2"><Button variant="secondary" onClick={() => setNoteOpen(false)}>Cancel</Button><Button onClick={async () => { await send("inaccurate", note); setNoteOpen(false); }}>Flag as inaccurate</Button></div>
      </Modal>
    </div>
  );
}

function TriggerIntel({ r, ma, mb }: { r: CompatibilityResult; ma: MemberProfile; mb: MemberProfile }) {
  const name = (id: string) => (id === ma.id ? ma.fullName.split(" ")[0] : mb.fullName.split(" ")[0]);
  return (
    <Card>
      <CardHeader icon={<Zap className="h-4 w-4" />} title="Referral trigger intelligence" subtitle="Real-world moments when a referral between these two may arise, and which professions in the chapter also respond." />
      {r.triggers.length ? (
        <ul className="divide-y divide-slate-100">
          {r.triggers.map((t, i) => (
            <li key={i} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-navy-950">{t.situation}</div>
                <Badge tone="blue">{name(t.spotter)} spots it → {name(t.beneficiary)}</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-500">Listen for: {t.words.map((w) => `“${w}”`).join(", ")}</div>
              {t.categories.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{t.categories.map((c) => <Badge key={c}><CategoryIcon categoryId={c} className="h-3 w-3" /> {getCategory(c)?.name}</Badge>)}</div>}
            </li>
          ))}
        </ul>
      ) : <p className="px-5 py-4 text-sm text-slate-500">No established trigger situations link these two professions. Use a one-to-one to discover them.</p>}
    </Card>
  );
}

const SCRIPT_LABELS: [keyof Scripts, string][] = [
  ["fifteenSecond", "15-second referral explanation"],
  ["oneToOne", "One-to-one talking point"],
  ["whatsapp", "WhatsApp introduction"],
  ["testimonialRequest", "Testimonial / case-study request"],
];

function ScriptsPanel({ r, ma, mb }: { r: CompatibilityResult; ma: MemberProfile; mb: MemberProfile }) {
  const { backend, session, toast } = useApp();
  const [dir, setDir] = useState<"aAboutB" | "bAboutA">(session?.memberId === mb.id ? "bAboutA" : "aAboutB");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const saved = useAsync(() => backend.listSaved(), []);
  const conn = useMemo(() => {
    const other = session?.memberId === ma.id ? mb.id : session?.memberId === mb.id ? ma.id : null;
    return saved.data?.find((s) => s.targetMemberId === other);
  }, [saved.data, session, ma.id, mb.id]);
  useEffect(() => {
    if (conn?.scripts) setEdits(conn.scripts);
  }, [conn?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const scripts = r.scripts[dir];
  const val = (k: keyof Scripts) => edits[`${dir}.${k}`] ?? scripts[k];
  const speaker = dir === "aAboutB" ? ma : mb;
  const subject = dir === "aAboutB" ? mb : ma;
  return (
    <Card>
      <CardHeader icon={<MessageCircle className="h-4 w-4" />} title="Sample referral conversations" subtitle="Editable scripts. Replace the [bracketed] placeholders before sending." action={conn ? <Button size="sm" onClick={async () => { await backend.updateConnection(conn.id, { scripts: edits }); toast("Scripts saved to your connection"); }}>Save my edits</Button> : undefined} />
      <div className="px-5 pt-4">
        <Tabs value={dir} onChange={setDir} tabs={[{ value: "aAboutB", label: `${ma.fullName.split(" ")[0]} talking about ${mb.fullName.split(" ")[0]}` }, { value: "bAboutA", label: `${mb.fullName.split(" ")[0]} talking about ${ma.fullName.split(" ")[0]}` }]} />
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {SCRIPT_LABELS.map(([k, label]) => (
          <div key={k}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
              <div className="flex">
                {k === "whatsapp" && <a className="no-print inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50" href={`https://wa.me/?text=${encodeURIComponent(val(k))}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>}
                <CopyButton text={val(k)} />
              </div>
            </div>
            <Textarea aria-label={label} value={val(k)} onChange={(e) => setEdits((x) => ({ ...x, [`${dir}.${k}`]: e.target.value }))} className="min-h-[110px] text-[13px]" />
          </div>
        ))}
      </div>
      {!conn && session?.memberId && (session.memberId === ma.id || session.memberId === mb.id) && <p className="px-5 pb-4 text-xs text-slate-500"><Lightbulb className="mr-1 inline h-3.5 w-3.5" />Save this connection to keep your edited scripts.</p>}
      <span className="sr-only">{speaker.fullName} about {subject.fullName}</span>
    </Card>
  );
}

function SideBySide({ ma, mb }: { ma: MemberProfile; mb: MemberProfile }) {
  const rows: [string, (m: MemberProfile) => string][] = [
    ["Category", (m) => categoryName(m)],
    ["Company", (m) => m.company ?? "—"],
    ["Services", (m) => m.services.join(", ") || "—"],
    ["Customer types", (m) => m.customerSegments.join(", ") || "—"],
    ["Company size", (m) => m.companySizes.join(", ") || "—"],
    ["Industries", (m) => m.industries.join(", ") || "—"],
    ["Service area", (m) => m.serviceAreas.join(", ") || "—"],
    ["Problems solved", (m) => m.problemsSolved.join(", ") || "—"],
    ["Ideal referral", (m) => m.idealReferral ?? "—"],
  ];
  return (
    <Card>
      <CardHeader title="Side-by-side comparison" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="w-40 px-5 py-2 font-medium"></th><th className="px-5 py-2 font-semibold text-navy-950">{ma.fullName}</th><th className="px-5 py-2 font-semibold text-navy-950">{mb.fullName}</th></tr></thead>
          <tbody>{rows.map(([label, fn]) => <tr key={label} className="border-b border-slate-50 align-top"><td className="px-5 py-2 text-xs font-medium text-slate-500">{label}</td><td className="px-5 py-2 text-slate-700">{fn(ma)}</td><td className="px-5 py-2 text-slate-700">{fn(mb)}</td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}
