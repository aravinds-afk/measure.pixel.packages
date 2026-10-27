"use client";

import { useState, type ReactNode } from "react";
import { useAdminSave } from "@/components/admin";
import { MoneyInput } from "@/components/money-input";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { Settings } from "@/server/settings";

function Block({ title, sub, children, onSave, busy }: { title: string; sub?: string; children: ReactNode; onSave: () => void; busy: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-[16px] font-semibold">{title}</p>
      {sub && <p className="mb-4 text-[13px] text-ink-3">{sub}</p>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
      <Button className="mt-4" onClick={onSave} loading={busy}>Save {title.toLowerCase()}</Button>
    </Card>
  );
}

export function GeneralSettings({ settings }: { settings: Settings }) {
  const { save, busy } = useAdminSave("settings");
  const [rev, setRev] = useState(settings.revenue);
  const [tax, setTax] = useState(settings.tax);
  const [pricing, setPricing] = useState(settings.pricing);
  const [quote, setQuote] = useState(settings.quote);
  const [company, setCompany] = useState(settings.company);
  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

  return (
    <div className="flex flex-col gap-4">
      <Block title="Revenue targets" sub="From the Opportunity Board: ₹3,00,000/month by 23 Jan 2027, starting from ₹25,000 signed. Editable." busy={busy} onSave={() => save({ key: "revenue", value: rev })}>
        <Field label="Target monthly recurring revenue" htmlFor="r-t"><MoneyInput id="r-t" value={rev.targetMonthly} onChange={(v) => setRev({ ...rev, targetMonthly: v })} /></Field>
        <Field label="Target date" htmlFor="r-d"><Input id="r-d" type="date" value={rev.targetDate} onChange={(e) => setRev({ ...rev, targetDate: e.target.value })} /></Field>
        <Field label="Starting signed recurring (before this app)" htmlFor="r-s" hint="Counted as signed revenue on the dashboard"><MoneyInput id="r-s" value={rev.startingSigned} onChange={(v) => setRev({ ...rev, startingSigned: v })} /></Field>
        <Field label="Clients behind the starting figure" htmlFor="r-c"><Input id="r-c" inputMode="numeric" value={rev.startingSignedClients} onChange={(e) => setRev({ ...rev, startingSignedClients: num(e.target.value) })} /></Field>
        <Field label="Window start" htmlFor="r-w"><Input id="r-w" type="date" value={rev.windowStart} onChange={(e) => setRev({ ...rev, windowStart: e.target.value })} /></Field>
        <Field label="Profit floor per client (monthly)" htmlFor="r-p"><MoneyInput id="r-p" value={rev.profitFloorMonthly} onChange={(v) => setRev({ ...rev, profitFloorMonthly: v })} /></Field>
      </Block>

      <Block title="Tax" sub="Default for new quotations. Not on the board — confirm with your accountant." busy={busy} onSave={() => save({ key: "tax", value: tax })}>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={tax.enabled} onChange={(e) => setTax({ ...tax, enabled: e.target.checked })} /> Apply tax by default</label>
        <div />
        <Field label="Label" htmlFor="t-l"><Input id="t-l" value={tax.label} onChange={(e) => setTax({ ...tax, label: e.target.value })} /></Field>
        <Field label="Rate %" htmlFor="t-r"><Input id="t-r" inputMode="decimal" value={tax.ratePercent} onChange={(e) => setTax({ ...tax, ratePercent: Math.min(50, num(e.target.value)) })} /></Field>
      </Block>

      <Block title="Pricing permissions" sub="Consultants can price offers inside board bands. Outside the band, changing configured prices, or larger discounts need admin or the override permission." busy={busy} onSave={() => save({ key: "pricing", value: pricing })}>
        <Field label="Max consultant discount %" htmlFor="p-d"><Input id="p-d" inputMode="decimal" value={pricing.consultantMaxDiscountPercent} onChange={(e) => setPricing({ ...pricing, consultantMaxDiscountPercent: Math.min(100, num(e.target.value)) })} /></Field>
      </Block>

      <Block title="Quotation terms" sub="Defaults copied into each new quotation, where they can be edited." busy={busy} onSave={() => save({ key: "quote", value: quote })}>
        <Field label="Validity (days)" htmlFor="q-v"><Input id="q-v" inputMode="numeric" value={quote.validityDays} onChange={(e) => setQuote({ ...quote, validityDays: Math.max(1, num(e.target.value)) })} /></Field>
        <Field label="Number prefix" htmlFor="q-p"><Input id="q-p" value={quote.numberPrefix} onChange={(e) => setQuote({ ...quote, numberPrefix: e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6) })} /></Field>
        <Field label="Payment terms" htmlFor="q-pt" className="sm:col-span-2"><Textarea id="q-pt" rows={3} value={quote.paymentTerms} onChange={(e) => setQuote({ ...quote, paymentTerms: e.target.value })} /></Field>
        <Field label="Assumptions" htmlFor="q-a" className="sm:col-span-2"><Textarea id="q-a" rows={3} value={quote.assumptions} onChange={(e) => setQuote({ ...quote, assumptions: e.target.value })} /></Field>
        <Field label="Exclusions" htmlFor="q-e" className="sm:col-span-2"><Textarea id="q-e" rows={3} value={quote.exclusions} onChange={(e) => setQuote({ ...quote, exclusions: e.target.value })} /></Field>
        <Field label="Next steps" htmlFor="q-n" className="sm:col-span-2"><Textarea id="q-n" rows={3} value={quote.nextSteps} onChange={(e) => setQuote({ ...quote, nextSteps: e.target.value })} /></Field>
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[#121212]" checked={quote.firstRecurringDueUpfront} onChange={(e) => setQuote({ ...quote, firstRecurringDueUpfront: e.target.checked })} /> First recurring period due with the initial payment</label>
      </Block>

      <Block title="Company details" sub="Printed on quotations and PDFs." busy={busy} onSave={() => save({ key: "company", value: company })}>
        <Field label="Company name" htmlFor="c-n"><Input id="c-n" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></Field>
        <Field label="Email" htmlFor="c-e"><Input id="c-e" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="c-p"><Input id="c-p" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></Field>
        <Field label="Website" htmlFor="c-w"><Input id="c-w" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} /></Field>
        <Field label="Address" htmlFor="c-a"><Input id="c-a" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></Field>
        <Field label="GSTIN" htmlFor="c-g"><Input id="c-g" value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })} /></Field>
      </Block>
    </div>
  );
}
