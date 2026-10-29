import type { ClientQuoteView } from "@/lib/client-view";
import { formatINR } from "@/lib/money";
import { BILLING_MODEL_LABELS } from "@/lib/quote-schema";
import { Wordmark } from "../ui";

/** Client-facing quotation. Renders only the sanitised ClientQuoteView. */

const STATUS_TEXT: Record<string, string> = {
  draft: "Draft — not yet issued",
  presented: "Proposal",
  sent: "Proposal",
  accepted: "Accepted",
  rejected: "Declined",
  expired: "Expired",
};

const fmtDate = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—");

export function itemPriceLines(i: ClientQuoteView["items"][number]): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const qty = i.quantity > 1 ? ` × ${i.quantity}` : "";
  switch (i.billingModel) {
    case "per_unit":
      out.push({ label: `${formatINR(i.unitPrice)} per ${i.unitLabel || "unit"}${qty}`, value: formatINR(i.unitPrice * i.quantity) });
      break;
    case "fixed_project":
    case "fixed_package":
      out.push({ label: `${BILLING_MODEL_LABELS[i.billingModel]}${qty}`, value: formatINR(i.unitPrice * i.quantity) });
      break;
    case "setup_plus_monthly":
      out.push({ label: `${i.upfrontLabel} fee${qty}`, value: i.setupFee ? formatINR(i.setupFee * i.quantity) : "Included" });
      out.push({ label: `Monthly${i.termMonths ? ` (× ${i.termMonths} months)` : ""}${qty}`, value: `${formatINR(i.monthlyFee * i.quantity)}/mo` });
      break;
    case "monthly":
      out.push({ label: `Monthly${qty}`, value: `${formatINR(i.monthlyFee * i.quantity)}/mo` });
      break;
    case "annual":
      out.push({ label: `Annual subscription${qty}`, value: `${formatINR(i.annualFee * i.quantity)}/yr` });
      break;
    case "custom":
      if (i.unitPrice) out.push({ label: `One-time${qty}`, value: formatINR(i.unitPrice * i.quantity) });
      if (i.monthlyFee) out.push({ label: `Monthly${qty}`, value: `${formatINR(i.monthlyFee * i.quantity)}/mo` });
      break;
    case "ad_spend":
      out.push({ label: "Advertising budget — paid to the platform", value: `${formatINR(i.monthlyFee * i.quantity)}/mo` });
      break;
    case "third_party":
      if (i.unitPrice) out.push({ label: "Third-party cost (at actuals)", value: formatINR(i.unitPrice * i.quantity) });
      if (i.monthlyFee) out.push({ label: "Third-party cost (at actuals)", value: `${formatINR(i.monthlyFee * i.quantity)}/mo` });
      break;
  }
  return out;
}

export function ClientQuote({ v }: { v: ClientQuoteView }) {
  const t = v.totals;
  const included = v.items.filter((i) => !i.optional);
  const optional = v.items.filter((i) => i.optional);
  const period = v.billing.frequency === "monthly" ? "month" : v.billing.frequency === "quarterly" ? "quarter" : "year";
  return (
    <article className="mx-auto max-w-[860px] text-ink">
      <header className="rounded-[18px] bg-panel px-6 py-7 text-white sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Wordmark inverted />
          <div className="text-right text-[13px] text-white/60">
            <p className="num">{v.number}{v.version > 1 ? ` · v${v.version}` : ""}</p>
            <p>{STATUS_TEXT[v.status]}</p>
          </div>
        </div>
        <p className="mt-10 text-[13px] uppercase tracking-[0.16em] text-accent">Growth proposal for</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">{v.client.businessName || "—"}</h1>
        <div className="mt-6 grid gap-4 text-[14px] text-white/70 sm:grid-cols-3">
          <div><p className="text-white/40">Issued</p><p className="text-white">{fmtDate(v.issueDate)}</p></div>
          <div><p className="text-white/40">Valid until</p><p className="text-white">{fmtDate(v.validUntil)}</p></div>
          <div><p className="text-white/40">Prepared for</p><p className="text-white">{v.client.contactPerson || v.client.businessName}</p></div>
        </div>
      </header>

      {(v.summary.needs || v.summary.solution) && (
        <section className="grid gap-6 px-1 py-8 sm:grid-cols-2">
          {v.summary.needs && (
            <div>
              <p className="eyebrow mb-2">What we heard</p>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{v.summary.needs}</p>
            </div>
          )}
          {v.summary.solution && (
            <div>
              <p className="eyebrow mb-2">Recommended solution</p>
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{v.summary.solution}</p>
            </div>
          )}
        </section>
      )}

      <section className="py-4">
        <p className="eyebrow mb-3 px-1">Scope & investment</p>
        <div className="flex flex-col gap-3">
          {included.map((i) => <ItemCard key={i.id} i={i} />)}
        </div>
      </section>

      {optional.length > 0 && (
        <section className="py-4">
          <p className="eyebrow mb-3 px-1">Optional add-ons — not included in the totals</p>
          <div className="flex flex-col gap-3">{optional.map((i) => <ItemCard key={i.id} i={i} optional />)}</div>
        </section>
      )}

      <section className="py-6">
        <div className="card overflow-hidden">
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Total label="One-time" value={t.oneTimeTotal} note={t.oneTimeTotal ? (v.tax.enabled ? `incl. ${v.tax.label}` : undefined) : "None"} />
            <Total label="Monthly" value={t.monthlyTotal} suffix="/mo" note={t.monthlyTotal ? (v.tax.enabled ? `incl. ${v.tax.label}` : undefined) : "None"} />
            <Total label="Annual" value={t.annualTotal} suffix="/yr" note={t.annualTotal ? undefined : "None"} />
          </div>
          <dl className="num divide-y divide-border border-t border-border text-[14px]">
            {t.discountOneTime + t.discountMonthly + t.discountAnnual > 0 && (
              <Row label={`Discount${v.discount?.reason ? ` — ${v.discount.reason}` : ""}`} value={[t.discountOneTime && `−${formatINR(t.discountOneTime)} one-time`, t.discountMonthly && `−${formatINR(t.discountMonthly)}/mo`, t.discountAnnual && `−${formatINR(t.discountAnnual)}/yr`].filter(Boolean).join(" · ")} />
            )}
            {v.tax.enabled && <Row label={`${v.tax.label} @ ${v.tax.ratePercent}%`} value={[t.taxOneTime && `${formatINR(t.taxOneTime)} one-time`, t.taxMonthly && `${formatINR(t.taxMonthly)}/mo`, t.taxAnnual && `${formatINR(t.taxAnnual)}/yr`].filter(Boolean).join(" · ") || formatINR(0)} />}
            {t.adSpendMonthly > 0 && <Row label="Advertising budget (paid directly to platforms, not included above)" value={`${formatINR(t.adSpendMonthly)}/mo`} />}
            {t.thirdPartyOneTime + t.thirdPartyMonthly > 0 && <Row label="Third-party costs at actuals (not included above)" value={[t.thirdPartyOneTime && formatINR(t.thirdPartyOneTime), t.thirdPartyMonthly && `${formatINR(t.thirdPartyMonthly)}/mo`].filter(Boolean).join(" + ")} />}
            {v.billing.contractMonths && <Row label={`Estimated contract value over ${v.billing.contractMonths} months (excl. tax)`} value={formatINR(t.estimatedContractValue ?? 0)} />}
          </dl>
          <div className="flex flex-wrap items-baseline justify-between gap-2 bg-accent px-5 py-4">
            <span className="text-[15px] font-semibold">Initial payment to start</span>
            <span className="num text-[24px] font-semibold">{formatINR(t.initialPaymentDue)}</span>
          </div>
          <p className="px-5 py-3 text-[12px] text-ink-3">
            Recurring fees billed per {period}
            {v.billing.firstRecurringDueUpfront && (t.monthlyNet > 0) ? "; the first period is included in the initial payment" : ""}.
            {v.billing.startDate ? ` Proposed start: ${fmtDate(v.billing.startDate)}.` : ""}
          </p>
        </div>
      </section>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <Terms title="Payment terms" body={v.terms.paymentTerms} />
        <Terms title="Next steps" body={v.terms.nextSteps} />
        <Terms title="Assumptions" body={v.terms.assumptions} />
        <Terms title="Exclusions" body={v.terms.exclusions} />
        {v.terms.custom && <Terms title="Additional terms" body={v.terms.custom} />}
      </section>

      <footer className="border-t border-border py-6 text-[13px] text-ink-3">
        <p className="font-medium text-ink">{v.company.name}</p>
        <p>{[v.company.email, v.company.phone, v.company.website].filter(Boolean).join(" · ")}</p>
        {v.company.address && <p>{v.company.address}</p>}
        {v.company.gstin && <p>GSTIN {v.company.gstin}</p>}
      </footer>
    </article>
  );
}

function ItemCard({ i, optional }: { i: ClientQuoteView["items"][number]; optional?: boolean }) {
  const lines = itemPriceLines(i);
  return (
    <div className={`card p-5 ${optional ? "border-dashed" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold">{i.name}</h3>
          {i.description && <p className="mt-1 text-[14px] text-ink-2">{i.description}</p>}
          {i.deliverables.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {i.deliverables.map((d) => <li key={d} className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px]">{d}</li>)}
            </ul>
          )}
          {i.notes && <p className="mt-3 whitespace-pre-line text-[13px] text-ink-2">{i.notes}</p>}
        </div>
        <dl className="num shrink-0 text-[14px] sm:min-w-[220px] sm:text-right">
          {lines.map((l, k) => (
            <div key={k} className="flex justify-between gap-4 sm:block">
              <dt className="text-[12px] text-ink-3">{l.label}</dt>
              <dd className="font-semibold">{l.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Total({ label, value, suffix, note }: { label: string; value: number; suffix?: string; note?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="num mt-1 text-[22px] font-semibold">{value ? `${formatINR(value)}${suffix ?? ""}` : "—"}</p>
      {note && <p className="text-[12px] text-ink-3">{note}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="font-sans text-ink-2">{label}</dt>
      <dd className="sm:text-right">{value}</dd>
    </div>
  );
}

function Terms({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}
