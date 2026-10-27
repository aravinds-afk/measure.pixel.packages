"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Notice } from "@/components/ui";

type Job = { id: string; entity: string; entityId: string; status: string; attempts: number; error: string | null; at: string };

export function SheetsAdmin({ configured, serviceAccount, spreadsheetUrl, tabs, open, recent }: { configured: boolean; serviceAccount: string | null; spreadsheetUrl: string | null; tabs: { name: string; headers: string[] }[]; open: Job[]; recent: Job[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (action: "setup" | "retry") => {
    setBusy(action);
    try {
      const r = await api<{ ok?: boolean; catalogue?: { status: string; error?: string }; results?: Record<string, { status: string }> }>("/api/admin/sheets", { body: { action } });
      if (action === "setup") toast(r.ok ? "ok" : "warn", r.ok ? "Connected. Tabs and headers are in place; catalogue written." : `Tabs ready, catalogue write ${r.catalogue?.status}: ${r.catalogue?.error ?? ""}`);
      else {
        const vals = Object.values(r.results ?? {});
        toast("ok", `${vals.filter((x) => x.status === "synced").length} of ${vals.length} queued writes confirmed by Google.`);
      }
      router.refresh();
    } catch (e) {
      toast("danger", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold">Connection</p>
            {configured ? (
              <p className="mt-1 text-[14px] text-ink-2">Service account <span className="num">{serviceAccount}</span> · <a className="underline" href={spreadsheetUrl!} target="_blank" rel="noopener noreferrer">open spreadsheet</a></p>
            ) : (
              <p className="mt-1 text-[14px] text-ink-2">Not configured.</p>
            )}
          </div>
          <Badge tone={configured ? "ok" : "warn"}>{configured ? "Credentials present" : "Setup required"}</Badge>
        </div>
        {!configured && (
          <div className="mt-4">
            <Notice tone="warn" title="Finish setup on the server">
              Set <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>, <code>GOOGLE_PRIVATE_KEY</code> and <code>GOOGLE_SHEETS_SPREADSHEET_ID</code> as server environment variables, share the spreadsheet with the service account as Editor, then redeploy. See docs/SETUP.md. Records are saved in the database meanwhile and queued for Sheets.
            </Notice>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => run("setup")} loading={busy === "setup"} disabled={!configured}>Test connection & create tabs</Button>
          <Button variant="secondary" onClick={() => run("retry")} loading={busy === "retry"} disabled={!configured || open.length === 0}>Retry queued writes ({open.length})</Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[16px] font-semibold">Queue</p>
        {open.length === 0 ? <p className="text-[14px] text-ink-3">Nothing waiting. Every saved record has been confirmed by Google.</p> : <JobList jobs={open} />}
        <p className="mb-2 mt-5 text-[13px] font-semibold text-ink-2">Recent activity</p>
        <JobList jobs={recent} />
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[16px] font-semibold">Tabs written</p>
        <ul className="flex flex-col gap-2 text-[13px]">
          {tabs.map((t) => <li key={t.name}><span className="font-medium">{t.name}</span> <span className="text-ink-3">— {t.headers.join(" · ")}</span></li>)}
        </ul>
      </Card>
    </div>
  );
}

function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border text-[13px]">
      {jobs.map((j) => (
        <li key={j.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span><Badge tone={j.status === "done" ? "ok" : j.status === "failed" ? "danger" : "neutral"}>{j.status}</Badge> {j.entity} <span className="num text-ink-3">{j.entityId}</span></span>
          <span className="text-ink-3">{j.error ? `${j.error} · ` : ""}{j.attempts} attempt{j.attempts === 1 ? "" : "s"} · {new Date(j.at).toLocaleString("en-IN")}</span>
        </li>
      ))}
    </ul>
  );
}
