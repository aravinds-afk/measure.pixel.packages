"use client";

import type { ReactNode } from "react";
import type { QuoteDoc } from "@/lib/quote-schema";
import { MoneyInput } from "@/components/money-input";
import { Field, Input, Select, Textarea } from "@/components/ui";

function Section({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="card group" open={defaultOpen}>
      <summary className="flex min-h-[56px] items-center justify-between px-5 text-[16px] font-semibold">
        {title}
        <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}

export function QuoteSettings({ doc, update, isAdmin, maxDiscountPercent }: { doc: QuoteDoc; update: (p: Partial<QuoteDoc>) => void; isAdmin: boolean; maxDiscountPercent: number }) {
  const d = doc.discount;
  return (
    <div className="flex flex-col gap-3">
      <Section title="Client & summary">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="q-bn"><Input id="q-bn" value={doc.client.businessName} onChange={(e) => update({ client: { ...doc.client, businessName: e.target.value } })} /></Field>
          <Field label="Contact person" htmlFor="q-cp"><Input id="q-cp" value={doc.client.contactPerson} onChange={(e) => update({ client: { ...doc.client, contactPerson: e.target.value } })} /></Field>
          <Field label="Email" htmlFor="q-em"><Input id="q-em" inputMode="email" value={doc.client.email} onChange={(e) => update({ client: { ...doc.client, email: e.target.value } })} /></Field>
          <Field label="Phone" htmlFor="q-ph"><Input id="q-ph" inputMode="tel" value={doc.client.phone} onChange={(e) => update({ client: { ...doc.client, phone: e.target.value } })} /></Field>
        </div>
        <Field label="Summary of business needs" htmlFor="q-needs" hint="Client-facing."><Textarea id="q-needs" rows={4} value={doc.summary.needs} onChange={(e) => update({ summary: { ...doc.summary, needs: e.target.value } })} /></Field>
        <Field label="Recommended solution" htmlFor="q-sol" hint="Client-facing."><Textarea id="q-sol" rows={3} value={doc.summary.solution} onChange={(e) => update({ summary: { ...doc.summary, solution: e.target.value } })} /></Field>
      </Section>

      <Section title="Commercials" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Billing frequency (recurring)" htmlFor="q-freq">
            <Select id="q-freq" value={doc.billing.frequency} onChange={(e) => update({ billing: { ...doc.billing, frequency: e.target.value as QuoteDoc["billing"]["frequency"] } })}>
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option>
            </Select>
          </Field>
          <Field label="Contract duration (months)" htmlFor="q-cm" hint="Blank = not agreed. No 12-month assumption.">
            <Input id="q-cm" inputMode="numeric" className="num" value={doc.billing.contractMonths ?? ""} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); update({ billing: { ...doc.billing, contractMonths: n ? Math.min(120, n) : null } }); }} />
          </Field>
          <Field label="Proposed start date" htmlFor="q-sd"><Input id="q-sd" type="date" value={doc.billing.startDate ?? ""} onChange={(e) => update({ billing: { ...doc.billing, startDate: e.target.value || null } })} /></Field>
          <Field label="Valid for (days)" htmlFor="q-vd"><Input id="q-vd" inputMode="numeric" className="num" value={doc.validityDays} onChange={(e) => update({ validityDays: Math.min(365, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })} /></Field>
        </div>
        <label className="flex min-h-[36px] items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={doc.billing.firstRecurringDueUpfront} onChange={(e) => update({ billing: { ...doc.billing, firstRecurringDueUpfront: e.target.checked } })} />
          First recurring period is due with the initial payment
        </label>

        <div className="rounded-[12px] bg-surface-2 p-4">
          <p className="mb-3 text-[14px] font-semibold">Discount</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type" htmlFor="q-dt">
              <Select id="q-dt" value={d ? d.type : "none"} onChange={(e) => {
                const v = e.target.value;
                update({ discount: v === "none" ? null : { type: v as "percent" | "amount", value: 0, appliesTo: v === "amount" ? "one_time" : (d?.appliesTo ?? "both"), reason: d?.reason ?? "" } });
              }}>
                <option value="none">No discount</option><option value="percent">Percent</option><option value="amount">Fixed amount</option>
              </Select>
            </Field>
            {d && (
              <>
                <Field label={d.type === "percent" ? "Percent" : "Amount"} htmlFor="q-dv" hint={!isAdmin ? `Up to ${maxDiscountPercent}% without admin` : undefined}>
                  {d.type === "percent" ? (
                    <Input id="q-dv" inputMode="decimal" className="num" value={d.value || ""} onChange={(e) => update({ discount: { ...d, value: Math.min(100, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) } })} />
                  ) : (
                    <MoneyInput id="q-dv" value={d.value} onChange={(v) => update({ discount: { ...d, value: v } })} />
                  )}
                </Field>
                <Field label="Applies to" htmlFor="q-da">
                  <Select id="q-da" value={d.appliesTo} onChange={(e) => update({ discount: { ...d, appliesTo: e.target.value as "one_time" | "recurring" | "both" } })}>
                    <option value="one_time">One-time fees</option>
                    <option value="recurring">{d.type === "amount" ? "Monthly fee (per month)" : "Recurring fees"}</option>
                    {d.type === "percent" && <option value="both">Both</option>}
                  </Select>
                </Field>
                <Field label="Reason (shown to client)" htmlFor="q-dr" className="sm:col-span-3"><Input id="q-dr" value={d.reason} onChange={(e) => update({ discount: { ...d, reason: e.target.value } })} placeholder="e.g. BNI member rate" /></Field>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex min-h-[44px] items-center gap-2 text-[14px] sm:col-span-1">
            <input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={doc.tax.enabled} onChange={(e) => update({ tax: { ...doc.tax, enabled: e.target.checked } })} />
            Apply tax
          </label>
          {doc.tax.enabled && (
            <>
              <Field label="Tax label" htmlFor="q-tl"><Input id="q-tl" value={doc.tax.label} disabled={!isAdmin} onChange={(e) => update({ tax: { ...doc.tax, label: e.target.value } })} /></Field>
              <Field label="Rate %" htmlFor="q-tr"><Input id="q-tr" className="num" inputMode="decimal" value={doc.tax.ratePercent} disabled={!isAdmin} onChange={(e) => update({ tax: { ...doc.tax, ratePercent: Math.min(50, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) } })} /></Field>
            </>
          )}
        </div>
      </Section>

      <Section title="Terms & next steps">
        <Field label="Payment terms" htmlFor="q-pt"><Textarea id="q-pt" rows={3} value={doc.terms.paymentTerms} onChange={(e) => update({ terms: { ...doc.terms, paymentTerms: e.target.value } })} /></Field>
        <Field label="Scope assumptions" htmlFor="q-as"><Textarea id="q-as" rows={3} value={doc.terms.assumptions} onChange={(e) => update({ terms: { ...doc.terms, assumptions: e.target.value } })} /></Field>
        <Field label="Exclusions" htmlFor="q-ex"><Textarea id="q-ex" rows={3} value={doc.terms.exclusions} onChange={(e) => update({ terms: { ...doc.terms, exclusions: e.target.value } })} /></Field>
        <Field label="Next steps" htmlFor="q-ns"><Textarea id="q-ns" rows={3} value={doc.terms.nextSteps} onChange={(e) => update({ terms: { ...doc.terms, nextSteps: e.target.value } })} /></Field>
        <Field label="Custom commercial terms" htmlFor="q-ct"><Textarea id="q-ct" rows={2} value={doc.terms.custom} onChange={(e) => update({ terms: { ...doc.terms, custom: e.target.value } })} /></Field>
      </Section>

      <Section title="Internal notes">
        <Field label="Notes for the team" htmlFor="q-in" hint="Never shown in client mode, PDFs or shared links."><Textarea id="q-in" rows={3} value={doc.internalNotes} onChange={(e) => update({ internalNotes: e.target.value })} /></Field>
      </Section>
    </div>
  );
}
