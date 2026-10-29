import type { ClientQuoteView } from "./client-view";
import { formatINR } from "./money";

/** Plain-text quotation summary for WhatsApp/email. Client-safe (built from ClientQuoteView). */
export function quoteSummaryText(v: ClientQuoteView, link?: string): string {
  const t = v.totals;
  const lines: string[] = [];
  lines.push(`${v.company.name} — Proposal ${v.number}${v.version > 1 ? ` v${v.version}` : ""}`);
  lines.push(`For: ${v.client.businessName}`);
  if (v.validUntil) lines.push(`Valid until: ${v.validUntil}`);
  lines.push("");
  for (const i of v.items.filter((x) => !x.optional)) {
    const parts: string[] = [];
    if (i.billingModel === "setup_plus_monthly") {
      parts.push(i.setupFee ? `${i.upfrontLabel} ${formatINR(i.setupFee * i.quantity)}` : `${i.upfrontLabel} included`);
      parts.push(`${formatINR(i.monthlyFee * i.quantity)}/mo${i.termMonths ? ` × ${i.termMonths}` : ""}`);
    } else if (i.billingModel === "monthly" || i.billingModel === "ad_spend") parts.push(`${formatINR(i.monthlyFee * i.quantity)}/mo${i.billingModel === "ad_spend" ? " ad budget" : ""}`);
    else if (i.billingModel === "annual") parts.push(`${formatINR(i.annualFee * i.quantity)}/yr`);
    else {
      if (i.unitPrice) parts.push(`${i.quantity > 1 ? `${i.quantity} × ${formatINR(i.unitPrice)} = ` : ""}${formatINR(i.unitPrice * i.quantity)}`);
      if (i.monthlyFee) parts.push(`${formatINR(i.monthlyFee * i.quantity)}/mo`);
    }
    lines.push(`• ${i.name}: ${parts.join(" + ")}`);
  }
  const optional = v.items.filter((x) => x.optional);
  if (optional.length) {
    lines.push("");
    lines.push(`Optional: ${optional.map((o) => o.name).join(", ")}`);
  }
  lines.push("");
  if (t.oneTimeTotal) lines.push(`One-time: ${formatINR(t.oneTimeTotal)}`);
  if (t.monthlyTotal) lines.push(`Monthly: ${formatINR(t.monthlyTotal)}/mo`);
  if (t.annualTotal) lines.push(`Annual: ${formatINR(t.annualTotal)}/yr`);
  if (v.tax.enabled) lines.push(`(Totals include ${v.tax.label} @ ${v.tax.ratePercent}%)`);
  if (t.adSpendMonthly) lines.push(`Ad budget paid to platforms: ${formatINR(t.adSpendMonthly)}/mo (not included)`);
  lines.push(`Initial payment to start: ${formatINR(t.initialPaymentDue)}`);
  if (link) {
    lines.push("");
    lines.push(`View the full proposal: ${link}`);
  }
  return lines.join("\n");
}
