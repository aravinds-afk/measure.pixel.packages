"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";
import type { QuoteTotals } from "@/lib/pricing";
import { cx } from "@/components/ui";

function Line({ label, value, strong, muted, negative }: { label: string; value: string; strong?: boolean; muted?: boolean; negative?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-3 py-1.5 text-[14px]", muted && "text-ink-3")}>
      <span className={cx(strong && "font-semibold")}>{label}</span>
      <span className={cx("num", strong && "text-[16px] font-semibold", negative && "text-ok")}>{value}</span>
    </div>
  );
}

export function TotalsBreakdown({ t, showInternal, taxLabel, contractMonths }: { t: QuoteTotals; showInternal: boolean; taxLabel: string; contractMonths: number | null }) {
  const discount = t.discountOneTime + t.discountMonthly + t.discountAnnual;
  return (
    <div>
      <p className="eyebrow mb-1">One-time</p>
      <Line label="Subtotal" value={formatINR(t.oneTimeSubtotal)} />
      {t.discountOneTime > 0 && <Line label="Discount" value={`−${formatINR(t.discountOneTime)}`} negative />}
      {t.taxRatePercent > 0 && <Line label={`${taxLabel} ${t.taxRatePercent}%`} value={formatINR(t.taxOneTime)} muted />}
      <Line label="One-time total" value={formatINR(t.oneTimeTotal)} strong />

      <p className="eyebrow mb-1 mt-4">Recurring</p>
      <Line label="Monthly subtotal" value={`${formatINR(t.monthlySubtotal)}/mo`} />
      {t.discountMonthly > 0 && <Line label="Discount" value={`−${formatINR(t.discountMonthly)}/mo`} negative />}
      {t.taxRatePercent > 0 && <Line label={`${taxLabel} ${t.taxRatePercent}%`} value={`${formatINR(t.taxMonthly)}/mo`} muted />}
      <Line label="Monthly total" value={`${formatINR(t.monthlyTotal)}/mo`} strong />
      {t.annualSubtotal > 0 && (
        <>
          <Line label="Annual subscriptions" value={`${formatINR(t.annualSubtotal)}/yr`} />
          {t.discountAnnual > 0 && <Line label="Discount" value={`−${formatINR(t.discountAnnual)}/yr`} negative />}
          <Line label="Annual total" value={`${formatINR(t.annualTotal)}/yr`} strong />
        </>
      )}

      {(t.adSpendMonthly > 0 || t.thirdPartyOneTime + t.thirdPartyMonthly > 0 || t.optionalOneTime + t.optionalMonthly + t.optionalAnnual > 0) && (
        <>
          <p className="eyebrow mb-1 mt-4">Outside our fees</p>
          {t.adSpendMonthly > 0 && <Line label="Ad spend (paid to platforms)" value={`${formatINR(t.adSpendMonthly)}/mo`} muted />}
          {t.thirdPartyOneTime > 0 && <Line label="Third-party one-time" value={formatINR(t.thirdPartyOneTime)} muted />}
          {t.thirdPartyMonthly > 0 && <Line label="Third-party monthly" value={`${formatINR(t.thirdPartyMonthly)}/mo`} muted />}
          {t.optionalOneTime + t.optionalMonthly + t.optionalAnnual > 0 && (
            <Line label="Optional items" value={[t.optionalOneTime && formatINR(t.optionalOneTime), t.optionalMonthly && `${formatINR(t.optionalMonthly)}/mo`, t.optionalAnnual && `${formatINR(t.optionalAnnual)}/yr`].filter(Boolean).join(" + ")} muted />
          )}
        </>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <Line label="Initial payment due" value={formatINR(t.initialPaymentDue)} strong />
        {contractMonths ? (
          <>
            <Line label={`Contract value · ${contractMonths} mo (excl. tax)`} value={formatINR(t.estimatedContractValue ?? 0)} />
            <Line label="First 12 months (excl. tax)" value={formatINR(t.estimatedFirst12Months ?? 0)} muted />
          </>
        ) : (
          <p className="py-1 text-[12px] text-ink-3">Set a contract duration to see contract value.</p>
        )}
        {discount > 0 && <p className="py-1 text-[12px] text-ink-3">Effective discount {t.effectiveDiscountPercent.toFixed(1)}%</p>}
      </div>

      {showInternal && (
        <div className="mt-4 rounded-[10px] bg-surface-2 p-3">
          <p className="eyebrow mb-1">Internal — margin</p>
          {t.internal.costsConfigured ? (
            <>
              <Line label="Delivery cost one-time" value={formatINR(t.internal.deliveryCostOneTime)} muted />
              <Line label="Delivery cost monthly" value={`${formatINR(t.internal.deliveryCostMonthly)}/mo`} muted />
              <Line label="Gross profit one-time" value={`${formatINR(t.internal.grossProfitOneTime)}${t.internal.marginOneTimePercent != null ? ` · ${t.internal.marginOneTimePercent.toFixed(0)}%` : ""}`} />
              <Line label="Gross profit monthly" value={`${formatINR(t.internal.grossProfitMonthly)}/mo${t.internal.marginMonthlyPercent != null ? ` · ${t.internal.marginMonthlyPercent.toFixed(0)}%` : ""}`} />
            </>
          ) : (
            <p className="text-[12px] text-ink-3">No delivery costs configured for these items. Set them in Settings → Services / Offers.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Sticky mobile total bar that expands into the full breakdown. */
export function MobileTotalsBar({ t, taxLabel, contractMonths, showInternal }: { t: QuoteTotals; taxLabel: string; contractMonths: number | null; showInternal: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="no-print fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.06)] lg:hidden">
      {open && <div className="max-h-[60dvh] overflow-y-auto border-b border-border px-4 py-3"><TotalsBreakdown t={t} showInternal={showInternal} taxLabel={taxLabel} contractMonths={contractMonths} /></div>}
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="grid w-full grid-cols-3 gap-2 px-4 py-2.5 text-left">
        <span><span className="block text-[11px] text-ink-3">One-time</span><span className="num text-[15px] font-semibold">{formatINR(t.oneTimeTotal)}</span></span>
        <span><span className="block text-[11px] text-ink-3">Monthly</span><span className="num text-[15px] font-semibold">{formatINR(t.monthlyTotal)}</span></span>
        <span className="text-right"><span className="block text-[11px] text-ink-3">Initial {open ? "▾" : "▴"}</span><span className="num text-[15px] font-semibold">{formatINR(t.initialPaymentDue)}</span></span>
      </button>
    </div>
  );
}
