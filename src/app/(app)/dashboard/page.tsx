import { REVENUE_ROUTES } from "@/data/opportunity-board";
import { formatINR } from "@/lib/money";
import { Card, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { getSettings } from "@/server/settings";
import { loadRevenue } from "@/server/services/revenue";

export const metadata = { title: "Revenue" };

export default async function DashboardPage() {
  await requirePageUser();
  const db = getDb();
  const settings = await getSettings(db);
  const r = await loadRevenue(db, settings);
  const days = Math.ceil((new Date(`${settings.revenue.targetDate}T00:00:00`).getTime() - Date.now()) / 86_400_000);

  return (
    <div>
      <PageHeader eyebrow="Revenue" title="Recurring revenue" subtitle={`Target ${formatINR(r.targetMonthly)}/month by ${new Date(`${settings.revenue.targetDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}${days > 0 ? ` · ${days} days left` : ""}. Signed = accepted quotations only, net of discount, excluding tax.`} />

      <Card className="mb-6 overflow-hidden bg-panel p-6 text-white sm:p-8">
        <p className="text-[12px] uppercase tracking-[0.16em] text-accent">Signed recurring revenue</p>
        <p className="num mt-2 text-[40px] font-semibold leading-none sm:text-[52px]">{formatINR(r.signedMonthly)}<span className="text-[20px] text-white/50">/mo</span></p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(r.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to target">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(1, r.progress * 100)}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[13px] text-white/60">
          <span>{Math.round(r.progress * 100)}% of target · includes {formatINR(r.startingSigned)} starting position</span>
          <span>Gap <span className="num text-white">{formatINR(r.gap)}</span>/mo</span>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Active recurring clients" value={String(r.activeClients)} />
        <Tile label="Average per client" value={`${formatINR(r.averagePerClient)}/mo`} />
        <Tile label="Pipeline — recurring" value={`${formatINR(r.pipelineMonthly)}/mo`} note={`${r.openCount} open proposal${r.openCount === 1 ? "" : "s"} · not signed`} />
        <Tile label="Pipeline — one-time" value={formatINR(r.pipelineOneTime)} note="Open proposals" />
        <Tile label="Signed one-time / setup" value={formatINR(r.signedOneTime)} note="Project & setup fees" />
        <Tile label="Cash collected" value={formatINR(r.cashCollected)} note="Recorded payments — not revenue, not profit" />
        <Tile label="Won" value={String(r.won)} />
        <Tile label="Lost / expired" value={`${r.lost} / ${r.expired}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bars title="Signed monthly revenue by industry" rows={r.byIndustry} empty="No accepted quotations yet." />
        <Bars title="Signed monthly revenue by packaged offer" rows={r.byOffer} empty="No accepted offers yet." />
      </div>

      <section className="mt-6">
        <p className="eyebrow mb-3">Five routes to the target (Opportunity Board)</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {REVENUE_ROUTES.map((route) => {
            const needed = Math.max(0, Math.ceil(r.gap / (route.monthlyEach * 100)));
            return (
              <Card key={route.id} className="p-4">
                <p className="num text-[24px] font-semibold">{route.clients}</p>
                <p className="text-[13px] font-medium">{route.label}</p>
                <p className="mt-1 text-[12px] text-ink-3">{route.description}</p>
                <p className="mt-2 text-[12px] text-ink-2">Gap covered by <span className="num font-semibold">{needed}</span> more at this price</p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="num mt-1 text-[20px] font-semibold">{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-ink-3">{note}</p>}
    </Card>
  );
}

function Bars({ title, rows, empty }: { title: string; rows: { label: string; monthly: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.monthly));
  return (
    <Card className="p-5">
      <p className="mb-4 text-[15px] font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[14px] text-ink-3">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${formatINR(r.monthly)}/mo`}>
              <div className="mb-1 flex justify-between gap-3 text-[13px]"><span>{r.label}</span><span className="num text-ink-2">{formatINR(r.monthly)}/mo</span></div>
              <div className="h-2 rounded-full bg-surface-2"><div className="h-full rounded-[4px] bg-ink" style={{ width: `${(r.monthly / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
