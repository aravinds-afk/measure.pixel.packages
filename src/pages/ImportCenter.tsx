import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileUp, Link2, RefreshCw, Upload } from "lucide-react";
import { COLUMN_ALIASES, suggestMapping, type ImportPlan, type PlanAction } from "@engine/index.ts";
import { useApp, useAsync } from "../lib/app.tsx";
import { IS_ARTIFACT } from "../lib/env.ts";
import { parseMemberFile, SAMPLE_CSV, type ParsedFile } from "../lib/parseFile.ts";
import type { ImportCommitResult } from "../lib/backend/index.ts";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorNote, fmtDate, Notice, PageHeader, Select, Spinner } from "../components/ui.tsx";

const FIELD_LABELS: Record<string, string> = {
  externalId: "Member ID", fullName: "Full name", firstName: "First name", lastName: "Last name", company: "Company", categoryLabel: "Professional category",
  chapterName: "Chapter", region: "Region", email: "Email", phone: "Phone", website: "Website", photoUrl: "Photo URL", businessDescription: "Business description",
  services: "Products & services", customerSegments: "Ideal customers (ICP)", companySizes: "Target company size", industries: "Industries served",
  serviceAreas: "Service area", problemsSolved: "Problems solved", keywords: "Keywords", icpDescription: "ICP description", idealReferral: "Ideal referral",
  avgTransactionValue: "Average transaction value (confidential)",
};

const ACTION_BADGE: Record<PlanAction, [string, "green" | "blue" | "amber" | "red" | "slate"]> = {
  create: ["New member", "green"], update: ["Update existing", "blue"], possible_duplicate: ["Possible duplicate", "amber"], duplicate_in_file: ["Duplicate in file", "slate"], skip: ["Error — skipped", "red"],
};

export default function ImportCenter() {
  const { backend, session, refreshMembers, toast } = useApp();
  const jobs = useAsync(() => backend.listImportJobs(), []);
  const [file, setFile] = useState<{ name: string; parsed: ParsedFile } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [decisions, setDecisions] = useState<Record<number, "merge" | "create" | "skip">>({});
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mappedFields = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const nameMapped = mappedFields.has("fullName") || (mappedFields.has("firstName") && mappedFields.has("lastName")) || mappedFields.has("firstName");

  async function onFile(f: File) {
    setErr(null); setPlan(null); setResult(null); setDecisions({});
    try {
      const parsed = await parseMemberFile(f);
      if (!parsed.rows.length) throw new Error("No data rows found.");
      setFile({ name: f.name, parsed });
      setMapping(suggestMapping(parsed.headers));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function preview() {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      setPlan(await backend.importPreview(file.parsed.rows, mapping));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function commit() {
    if (!file || !plan) return;
    setBusy(true); setErr(null);
    try {
      const r = await backend.importCommit(file.parsed.rows, mapping, file.name, { duplicateDecisions: decisions, overwriteMemberSubmitted: overwrite, source: file.parsed.kind === "excel" ? "excel_import" : "csv_import" });
      setResult(r);
      await refreshMembers();
      jobs.reload();
      toast(`Import complete: ${r.totals.created ?? 0} created, ${r.totals.updated ?? 0} updated`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const reset = () => { setFile(null); setPlan(null); setResult(null); setMapping({}); setDecisions({}); };

  return (
    <div>
      <PageHeader title="Import & synchronisation centre" subtitle="Load authorised member data from official CSV or Excel exports. Every import is validated, de-duplicated, previewed before anything is written, and logged."
        actions={<>
          <Button variant="secondary" onClick={() => onFile(new File([SAMPLE_CSV], "sample-members.csv", { type: "text/csv" }))}><FileUp className="h-4 w-4" /> Try the sample file</Button>
          {!IS_ARTIFACT && <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`} download="connectsphere-sample-members.csv"><Button variant="secondary"><Download className="h-4 w-4" /> Sample CSV (fictional)</Button></a>}
        </>} />
      {session?.isDemo && <div className="mb-5"><Notice tone="warn">Demo mode: imported rows stay in this browser only and join the fictional demo chapter. Use the sample file or other non-real data. In a live deployment, imports into the demo chapter are refused.</Notice></div>}
      {err && <div className="mb-5"><ErrorNote message={err} /></div>}

      {!file && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-6 py-14 text-center hover:border-blue-400 hover:bg-blue-50/30">
              <FileUp className="h-8 w-8 text-navy-700" />
              <span className="font-semibold text-navy-950">Upload a member export</span>
              <span className="text-sm text-slate-500">CSV or Excel (.xlsx), up to 5 MB. The file is read in your browser; nothing is saved until you confirm.</span>
              <input type="file" accept=".csv,.xlsx,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
          </Card>
          <Card>
            <CardHeader icon={<Link2 className="h-4 w-4" />} title="Data sources" />
            <ol className="space-y-3 p-5 text-sm">
              <li><div className="font-medium text-navy-950">1. Authorised API integration</div><div className="text-xs text-slate-500">Not configured. Direct synchronisation is enabled only after the supported integration and your chapter's permissions are confirmed.</div><Badge className="mt-1">Not connected</Badge></li>
              <li><div className="font-medium text-navy-950">2. Official CSV / Excel export</div><div className="text-xs text-slate-500">Recommended. Re-import any time — matching is by member ID, then email.</div><Badge tone="green" className="mt-1">Available</Badge></li>
              <li><div className="font-medium text-navy-950">3. Manual entry</div><div className="text-xs text-slate-500">Add individual members from Member management.</div><Badge tone="green" className="mt-1">Available</Badge></li>
            </ol>
          </Card>
        </div>
      )}

      {file && !result && (
        <div className="space-y-6">
          <Card>
            <CardHeader title={`Map columns — ${file.name}`} subtitle={`${file.parsed.rows.length} rows · ${file.parsed.headers.length} columns. Columns were matched automatically; adjust any that are wrong.`} action={<Button size="sm" variant="ghost" onClick={reset}>Choose another file</Button>} />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {file.parsed.headers.map((h) => (
                <label key={h} className="block">
                  <span className="mb-1 block truncate text-xs font-medium text-slate-700" title={h}>{h} <span className="font-normal text-slate-400">e.g. {String(file.parsed.rows[0]?.[h] ?? "").slice(0, 28)}</span></span>
                  <Select value={mapping[h] ?? ""} onChange={(e) => { setMapping({ ...mapping, [h]: e.target.value || null }); setPlan(null); }}>
                    <option value="">Ignore this column</option>
                    {Object.keys(COLUMN_ALIASES).map((f) => <option key={f} value={f}>{FIELD_LABELS[f] ?? f}</option>)}
                  </Select>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <span className="text-xs text-slate-500">{nameMapped ? "Required name column mapped." : "Map a name column to continue."}</span>
              <Button loading={busy} disabled={!nameMapped} onClick={preview}><RefreshCw className="h-4 w-4" /> Validate & preview</Button>
            </div>
          </Card>

          {plan && (
            <Card>
              <CardHeader title="Validation results" subtitle="Nothing has been saved yet." />
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
                {([["Rows", plan.totals.rows], ["New", plan.totals.create], ["Updates", plan.totals.update], ["Possible duplicates", plan.totals.possibleDuplicates], ["Duplicates in file", plan.totals.duplicates], ["Errors", plan.totals.errors]] as [string, number][]).map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{l}</div><div className="font-display text-xl font-bold text-navy-950">{v}</div></div>
                ))}
              </div>
              {Object.keys(plan.missingFields).length > 0 && (
                <div className="px-5 pb-4 text-xs text-slate-600"><b>Missing fields:</b> {Object.entries(plan.missingFields).map(([k, n]) => `${FIELD_LABELS[k] ?? k} (${n})`).join(" · ")}. Missing data lowers confidence but never counts against a member.</div>
              )}
              <div className="max-h-[480px] overflow-auto border-t border-slate-100">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Row</th><th className="px-3 py-2 font-medium">Member</th><th className="px-3 py-2 font-medium">Category</th><th className="px-3 py-2 font-medium">Action</th><th className="px-5 py-2 font-medium">Issues</th></tr></thead>
                  <tbody>
                    {plan.rows.map((r) => (
                      <tr key={r.record.rowNumber} className="border-b border-slate-50 align-top">
                        <td className="px-5 py-2 text-xs text-slate-500">{r.record.rowNumber}</td>
                        <td className="px-3 py-2"><div className="font-medium text-navy-950">{r.record.fullName || <span className="text-red-600">—</span>}</div><div className="text-xs text-slate-500">{r.record.company}</div></td>
                        <td className="px-3 py-2 text-xs">{r.record.categoryLabel ?? "—"}{r.record.categoryLabel && !r.record.categoryId && <Badge tone="amber" className="ml-1">Custom</Badge>}</td>
                        <td className="px-3 py-2">
                          <Badge tone={ACTION_BADGE[r.action][1]}>{ACTION_BADGE[r.action][0]}</Badge>
                          {r.matchedOn && <div className="mt-0.5 text-[11px] text-slate-500">matched on {r.matchedOn.replace("_", " ")}</div>}
                          {r.action === "possible_duplicate" && (
                            <Select aria-label="Duplicate decision" className="mt-1 py-1 text-xs" value={decisions[r.record.rowNumber] ?? "skip"} onChange={(e) => setDecisions({ ...decisions, [r.record.rowNumber]: e.target.value as "merge" | "create" | "skip" })}>
                              <option value="skip">Skip</option><option value="merge">Merge into existing</option><option value="create">Create as new member</option>
                            </Select>
                          )}
                        </td>
                        <td className="px-5 py-2 text-xs">{r.issues.length ? r.issues.map((i, k) => <div key={k} className={i.severity === "error" ? "text-red-700" : "text-amber-800"}>{i.message}</div>) : <span className="text-emerald-700">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Overwrite fields members have edited themselves</label>
                <Button loading={busy} disabled={!plan.totals.create && !plan.totals.update && !Object.values(decisions).some((d) => d !== "skip")} onClick={commit}><Upload className="h-4 w-4" /> Import {plan.totals.create + plan.totals.update + Object.values(decisions).filter((d) => d !== "skip").length} members</Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {result && (
        <Card className="mb-6">
          <CardHeader icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} title="Import complete" action={<Button size="sm" onClick={reset}>Import another file</Button>} />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {([["Created", result.totals.created], ["Updated", result.totals.updated], ["Skipped", result.totals.skipped], ["Failed", result.totals.failed]] as [string, number][]).map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{l}</div><div className="font-display text-xl font-bold">{v ?? 0}</div></div>)}
          </div>
          {(result.failures.length > 0 || result.skipped.length > 0) && (
            <ul className="space-y-1 px-5 pb-5 text-xs">
              {result.failures.map((f) => <li key={`f${f.rowNumber}`} className="text-red-700">Row {f.rowNumber}: {f.message}</li>)}
              {result.skipped.map((f) => <li key={`s${f.rowNumber}`} className="text-slate-600">Row {f.rowNumber}: {f.reason}</li>)}
            </ul>
          )}
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Import history" />
        {jobs.loading ? <Spinner /> : jobs.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {jobs.data.map((j) => (
              <li key={j.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div><div className="font-medium text-navy-950">{j.filename ?? "Upload"}</div><div className="text-xs text-slate-500">{fmtDate(j.createdAt)} · {j.issues.length} issues</div></div>
                <div className="text-xs text-slate-600">{j.totals.created ?? 0} created · {j.totals.updated ?? 0} updated · {j.totals.skipped ?? 0} skipped · {j.totals.failed ?? 0} failed</div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No imports yet" />}
      </Card>
    </div>
  );
}
