import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ClientQuoteView } from "@/lib/client-view";
import { formatINR } from "@/lib/money";
import { itemPriceLines } from "@/components/quote/client-view";

/** Branded quotation PDF. Input is the sanitised client view only. */

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(dir, "Inter-Regular.otf"), fontWeight: 400 },
      { src: path.join(dir, "Inter-SemiBold.otf"), fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontsReady = true;
}

const C = { ink: "#121212", ink2: "#55554f", ink3: "#85857e", border: "#e3e3dc", surface2: "#f0f0eb", accent: "#d4f25c", panel: "#151515" };
const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9.5, color: C.ink, paddingTop: 36, paddingBottom: 54, paddingHorizontal: 40, lineHeight: 1.4 },
  header: { backgroundColor: C.panel, borderRadius: 10, padding: 22, color: "#fff", marginBottom: 18 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 9, height: 9, backgroundColor: C.accent, borderRadius: 2, marginRight: 7 },
  brandText: { fontSize: 8, letterSpacing: 2, fontWeight: 600, color: "#fff" },
  eyebrowDark: { fontSize: 7.5, letterSpacing: 1.4, color: C.accent, marginTop: 18, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 600, marginTop: 4, color: "#fff" },
  meta: { flexDirection: "row", marginTop: 14 },
  metaCell: { marginRight: 28 },
  metaLabel: { fontSize: 7.5, color: "#9a9a94" },
  metaValue: { fontSize: 9.5, color: "#fff" },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.4, color: C.ink3, textTransform: "uppercase", marginBottom: 5, fontWeight: 600 },
  section: { marginBottom: 14 },
  twoCol: { flexDirection: "row", gap: 18 },
  col: { flex: 1 },
  item: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 11, marginBottom: 7, flexDirection: "row", justifyContent: "space-between" },
  itemOptional: { borderStyle: "dashed" },
  itemName: { fontSize: 11, fontWeight: 600 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  chip: { backgroundColor: C.surface2, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6, marginRight: 4, marginBottom: 3, fontSize: 8 },
  priceCol: { width: 170, alignItems: "flex-end" },
  priceLabel: { fontSize: 7.5, color: C.ink3, textAlign: "right" },
  priceValue: { fontSize: 10, fontWeight: 600, textAlign: "right", marginBottom: 3 },
  totals: { borderWidth: 1, borderColor: C.border, borderRadius: 8, marginTop: 4 },
  totalsGrid: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.border },
  totalCell: { flex: 1, padding: 10, borderRightWidth: 1, borderColor: C.border },
  totalValue: { fontSize: 14, fontWeight: 600, marginTop: 2 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: C.border },
  due: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.accent, padding: 10, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  muted: { color: C.ink2 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.ink3 },
});

const fmtDate = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—");
const STATUS: Record<string, string> = { draft: "DRAFT — NOT ISSUED", presented: "PROPOSAL", sent: "PROPOSAL", accepted: "ACCEPTED", rejected: "DECLINED", expired: "EXPIRED" };

function QuotePdf({ v }: { v: ClientQuoteView }) {
  const t = v.totals;
  const included = v.items.filter((i) => !i.optional);
  const optional = v.items.filter((i) => i.optional);
  const discount = t.discountOneTime + t.discountMonthly + t.discountAnnual;
  return (
    <Document title={`${v.number} — ${v.client.businessName}`} author={v.company.name} creator="Measure Pixel Growth Advisor">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.row}>
            <View style={s.brand}><View style={s.mark} /><Text style={s.brandText}>MEASURE PIXEL</Text></View>
            <Text style={{ fontSize: 8, color: "#9a9a94" }}>{v.number}{v.version > 1 ? ` · v${v.version}` : ""} · {STATUS[v.status]}</Text>
          </View>
          <Text style={s.eyebrowDark}>Growth proposal for</Text>
          <Text style={s.title}>{v.client.businessName}</Text>
          <View style={s.meta}>
            <View style={s.metaCell}><Text style={s.metaLabel}>Issued</Text><Text style={s.metaValue}>{fmtDate(v.issueDate)}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>Valid until</Text><Text style={s.metaValue}>{fmtDate(v.validUntil)}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>Prepared for</Text><Text style={s.metaValue}>{v.client.contactPerson || v.client.businessName}</Text></View>
          </View>
        </View>

        {(v.summary.needs || v.summary.solution) && (
          <View style={[s.section, s.twoCol]}>
            {v.summary.needs ? <View style={s.col}><Text style={s.eyebrow}>What we heard</Text><Text style={s.muted}>{v.summary.needs}</Text></View> : null}
            {v.summary.solution ? <View style={s.col}><Text style={s.eyebrow}>Recommended solution</Text><Text>{v.summary.solution}</Text></View> : null}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.eyebrow}>Scope & investment</Text>
          {included.map((i) => <Item key={i.id} i={i} />)}
        </View>
        {optional.length > 0 && (
          <View style={s.section}>
            <Text style={s.eyebrow}>Optional add-ons — not included in totals</Text>
            {optional.map((i) => <Item key={i.id} i={i} optional />)}
          </View>
        )}

        <View style={s.section} wrap={false}>
          <View style={s.totals}>
            <View style={s.totalsGrid}>
              <View style={s.totalCell}><Text style={s.eyebrow}>One-time</Text><Text style={s.totalValue}>{t.oneTimeTotal ? formatINR(t.oneTimeTotal) : "—"}</Text></View>
              <View style={s.totalCell}><Text style={s.eyebrow}>Monthly</Text><Text style={s.totalValue}>{t.monthlyTotal ? `${formatINR(t.monthlyTotal)}/mo` : "—"}</Text></View>
              <View style={[s.totalCell, { borderRightWidth: 0 }]}><Text style={s.eyebrow}>Annual</Text><Text style={s.totalValue}>{t.annualTotal ? `${formatINR(t.annualTotal)}/yr` : "—"}</Text></View>
            </View>
            {discount > 0 && <Line label={`Discount${v.discount?.reason ? ` — ${v.discount.reason}` : ""}`} value={[t.discountOneTime && `−${formatINR(t.discountOneTime)} one-time`, t.discountMonthly && `−${formatINR(t.discountMonthly)}/mo`, t.discountAnnual && `−${formatINR(t.discountAnnual)}/yr`].filter(Boolean).join(" · ")} />}
            {v.tax.enabled && <Line label={`${v.tax.label} @ ${v.tax.ratePercent}% (included in totals above)`} value={[t.taxOneTime && `${formatINR(t.taxOneTime)} one-time`, t.taxMonthly && `${formatINR(t.taxMonthly)}/mo`, t.taxAnnual && `${formatINR(t.taxAnnual)}/yr`].filter(Boolean).join(" · ") || formatINR(0)} />}
            {t.adSpendMonthly > 0 && <Line label="Advertising budget — paid directly to platforms, not included" value={`${formatINR(t.adSpendMonthly)}/mo`} />}
            {t.thirdPartyOneTime + t.thirdPartyMonthly > 0 && <Line label="Third-party costs at actuals — not included" value={[t.thirdPartyOneTime && formatINR(t.thirdPartyOneTime), t.thirdPartyMonthly && `${formatINR(t.thirdPartyMonthly)}/mo`].filter(Boolean).join(" + ")} />}
            {v.billing.contractMonths ? <Line label={`Estimated contract value over ${v.billing.contractMonths} months (excl. tax)`} value={formatINR(t.estimatedContractValue ?? 0)} /> : null}
            <View style={s.due}><Text style={{ fontWeight: 600, fontSize: 10.5 }}>Initial payment to start</Text><Text style={{ fontWeight: 600, fontSize: 13 }}>{formatINR(t.initialPaymentDue)}</Text></View>
          </View>
          <Text style={{ fontSize: 7.5, color: C.ink3, marginTop: 5 }}>
            Recurring fees billed {v.billing.frequency}{v.billing.firstRecurringDueUpfront && t.monthlyNet > 0 ? "; the first period is included in the initial payment" : ""}.{v.billing.startDate ? ` Proposed start: ${fmtDate(v.billing.startDate)}.` : ""}
          </Text>
        </View>

        <View style={[s.section, s.twoCol]} wrap={false}>
          <View style={s.col}>
            <Terms title="Payment terms" body={v.terms.paymentTerms} />
            <Terms title="Assumptions" body={v.terms.assumptions} />
          </View>
          <View style={s.col}>
            <Terms title="Next steps" body={v.terms.nextSteps} />
            <Terms title="Exclusions" body={v.terms.exclusions} />
          </View>
        </View>
        {v.terms.custom ? <Terms title="Additional terms" body={v.terms.custom} /> : null}

        <View style={[s.section, { marginTop: 10 }]} wrap={false}>
          <Text style={s.eyebrow}>Acceptance</Text>
          <Text style={s.muted}>Status: {STATUS[v.status]}. To accept, sign below or confirm in writing.</Text>
          <View style={{ flexDirection: "row", marginTop: 22, gap: 30 }}>
            <View style={{ flex: 1, borderTopWidth: 1, borderColor: C.ink3, paddingTop: 4 }}><Text style={{ fontSize: 7.5, color: C.ink3 }}>Name & signature — {v.client.businessName}</Text></View>
            <View style={{ width: 120, borderTopWidth: 1, borderColor: C.ink3, paddingTop: 4 }}><Text style={{ fontSize: 7.5, color: C.ink3 }}>Date</Text></View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{[v.company.name, v.company.email, v.company.phone, v.company.website, v.company.gstin && `GSTIN ${v.company.gstin}`].filter(Boolean).join(" · ")}</Text>
          <Text render={({ pageNumber, totalPages }) => `${v.number} · ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Item({ i, optional }: { i: ClientQuoteView["items"][number]; optional?: boolean }) {
  return (
    <View style={optional ? [s.item, s.itemOptional] : s.item} wrap={false}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.itemName}>{i.name}</Text>
        {i.description ? <Text style={[s.muted, { marginTop: 2 }]}>{i.description}</Text> : null}
        {i.deliverables.length > 0 && <View style={s.chips}>{i.deliverables.map((d) => <Text key={d} style={s.chip}>{d}</Text>)}</View>}
        {i.notes ? <Text style={[s.muted, { marginTop: 4, fontSize: 8.5 }]}>{i.notes}</Text> : null}
      </View>
      <View style={s.priceCol}>
        {itemPriceLines(i).map((l, k) => (
          <View key={k}><Text style={s.priceLabel}>{l.label}</Text><Text style={s.priceValue}>{l.value}</Text></View>
        ))}
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <View style={s.line}><Text style={[s.muted, { flex: 1, paddingRight: 10 }]}>{label}</Text><Text>{value}</Text></View>;
}

function Terms({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return <View style={{ marginBottom: 10 }}><Text style={s.eyebrow}>{title}</Text><Text style={s.muted}>{body}</Text></View>;
}

export async function renderQuotePdf(v: ClientQuoteView): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<QuotePdf v={v} />);
}

export function pdfFilename(v: ClientQuoteView) {
  const name = v.client.businessName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "client";
  return `${v.number}${v.version > 1 ? `-v${v.version}` : ""}-${name}.pdf`;
}
