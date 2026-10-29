"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { cx } from "@/components/ui";
import type { DiscoveryResult } from "@/server/discovery/analyze";
import { BusinessStep } from "./business-step";
import { ChecklistStep } from "./checklist-step";
import { RecommendStep } from "./recommend-step";
import type { AuditState, ClientState, Ref, Response } from "./types";

export type AuditWorkspaceProps = Ref & {
  audit: AuditState;
  client: ClientState;
  autoDiscover: boolean;
  initialStep: "business" | "audit" | "recommend";
};

type SaveState = { kind: "idle" | "saving" | "saved" | "error"; message?: string; sheets?: string };

const STEPS = [
  { id: "business", label: "Business" },
  { id: "audit", label: "Audit" },
  { id: "recommend", label: "Recommend" },
] as const;

export function AuditWorkspace(props: AuditWorkspaceProps) {
  const toast = useToast();
  const [audit, setAudit] = useState<AuditState>(props.audit);
  const [client, setClient] = useState<ClientState>(props.client);
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>(props.initialStep);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [discovering, setDiscovering] = useState(false);

  // ---- Autosave: one request in flight, latest state wins, rev guards against lost updates.
  const latest = useRef({ audit, client });
  latest.current = { audit, client };
  const rev = useRef(props.audit.rev);
  const dirty = useRef(false);
  const inflight = useRef(false);
  const touched = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    async (opts: { complete?: boolean; sync?: boolean } = {}) => {
      if (inflight.current) {
        dirty.current = true;
        return null;
      }
      inflight.current = true;
      dirty.current = false;
      setSave({ kind: "saving" });
      const { audit: a, client: c } = latest.current;
      try {
        const res = await api<{ rev: number; status: "draft" | "completed"; sync: { status: string; error?: string } }>(`/api/audits/${a.id}${opts.sync ? "?sync=1" : ""}`, {
          method: "PATCH",
          body: {
            rev: rev.current,
            industryId: a.industryId,
            goals: a.goals,
            goalNotes: a.goalNotes,
            painOfferIds: a.painOfferIds,
            budgetMonthly: a.budgetMonthly,
            readiness: a.readiness,
            responses: a.responses,
            customItems: a.customItems,
            consultantNotes: a.consultantNotes,
            status: opts.complete ? "completed" : undefined,
            client: { businessName: c.businessName.trim() || "Untitled business", website: c.website, contactPerson: c.contactPerson, phone: c.phone, email: c.email, instagram: c.instagram, linkedin: c.linkedin, youtube: c.youtube },
          },
        });
        rev.current = res.rev;
        touched.current.clear();
        if (opts.complete) setAudit((x) => ({ ...x, status: res.status }));
        setSave({ kind: "saved", sheets: res.sync.status === "synced" ? "Google Sheets updated" : res.sync.status === "failed" ? `Google Sheets: ${res.sync.error ?? "failed"} (will retry)` : res.sync.status === "not_configured" ? "Google Sheets not configured" : undefined });
        return res;
      } catch (e) {
        setSave({ kind: "error", message: (e as Error).message });
        if (e instanceof ApiError && e.status === 409) toast("danger", e.message);
        return null;
      } finally {
        inflight.current = false;
        if (dirty.current) schedule(300);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const schedule = useCallback(
    (ms = 900) => {
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), ms);
    },
    [flush],
  );

  const updateAudit = useCallback(
    (patch: Partial<AuditState>) => {
      setAudit((a) => ({ ...a, ...patch }));
      Object.keys(patch).forEach((k) => touched.current.add(`field:${k}`));
      schedule();
    },
    [schedule],
  );

  const updateResponse = useCallback(
    (itemId: string, patch: Partial<Response>) => {
      setAudit((a) => {
        const cur = a.responses[itemId] ?? { status: "not_assessed" as const };
        return { ...a, responses: { ...a.responses, [itemId]: { ...cur, ...patch, source: "consultant" } } };
      });
      touched.current.add(`resp:${itemId}`);
      schedule();
    },
    [schedule],
  );

  const updateClient = useCallback(
    (patch: Partial<ClientState>) => {
      setClient((c) => ({ ...c, ...patch }));
      schedule();
    },
    [schedule],
  );

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const runDiscovery = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      await flush();
    }
    setDiscovering(true);
    try {
      const res = await api<{ discovery: DiscoveryResult; responses: Record<string, Response>; rev: number; businessName: string }>(`/api/audits/${props.audit.id}/discover`, { method: "POST", body: {} });
      rev.current = res.rev;
      setAudit((a) => {
        // Keep anything the consultant changed while discovery was running.
        const merged = { ...res.responses };
        for (const key of touched.current) if (key.startsWith("resp:")) merged[key.slice(5)] = a.responses[key.slice(5)];
        return { ...a, discovery: res.discovery, responses: merged };
      });
      setClient((c) => ({ ...c, businessName: res.businessName }));
      if (touched.current.size) schedule(200);
      if (res.discovery.error) toast("warn", res.discovery.error);
      else toast("ok", `Inspected ${res.discovery.pages.filter((p) => p.ok).length} page(s). Verified findings were added to the audit.`);
    } catch (e) {
      toast("danger", (e as Error).message);
    } finally {
      setDiscovering(false);
    }
  }, [flush, props.audit.id, schedule, toast]);

  const started = useRef(false);
  useEffect(() => {
    if (props.autoDiscover && !started.current) {
      started.current = true;
      void runDiscovery();
    }
  }, [props.autoDiscover, runDiscovery]);

  const goto = (s: typeof step) => {
    setStep(s);
    const url = new URL(window.location.href);
    url.searchParams.set("step", s);
    url.searchParams.delete("discover");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  const ref: Ref = { categories: props.categories, items: props.items, industries: props.industries, clusters: props.clusters, offers: props.offers, services: props.services, links: props.links, goals: props.goals };

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Brand audit · {audit.status === "completed" ? "Completed" : "Draft"}</p>
          <h1 className="truncate text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]">{client.businessName || "Untitled business"}</h1>
          <SaveIndicator state={save} />
        </div>
        <nav aria-label="Audit steps" className="grid grid-cols-3 gap-1 rounded-[12px] bg-surface-2 p-1 sm:w-[360px]">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => goto(s.id)} aria-current={step === s.id ? "step" : undefined}
              className={cx("min-h-[40px] rounded-[9px] text-[14px] font-medium", step === s.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-ink-2")}>
              <span className="num mr-1 text-ink-3">{i + 1}</span> {s.label}
            </button>
          ))}
        </nav>
      </div>

      {step === "business" && (
        <BusinessStep audit={audit} client={client} ref_={ref} discovering={discovering} onDiscover={runDiscovery} updateAudit={updateAudit} updateClient={updateClient} onNext={() => goto("audit")} />
      )}
      {step === "audit" && (
        <ChecklistStep
          audit={audit}
          ref_={ref}
          updateResponse={updateResponse}
          updateAudit={updateAudit}
          onComplete={async () => {
            const res = await flush({ complete: true });
            if (res) {
              toast(res.sync.status === "synced" ? "ok" : "warn", res.sync.status === "synced" ? "Audit saved and recorded in Google Sheets." : `Audit saved. ${res.sync.status === "not_configured" ? "Google Sheets is not configured." : `Google Sheets: ${res.sync.error ?? "queued"} — will retry.`}`);
              goto("recommend");
            }
          }}
          onNext={async () => {
            await flush();
            goto("recommend");
          }}
        />
      )}
      {step === "recommend" && <RecommendStep auditId={audit.id} ref_={ref} beforeLoad={flush} />}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text =
    state.kind === "saving" ? "Saving…" : state.kind === "saved" ? `Saved${state.sheets ? ` · ${state.sheets}` : ""}` : state.kind === "error" ? `Not saved — ${state.message}` : "All changes save automatically";
  return (
    <p aria-live="polite" className={cx("mt-1 text-[13px]", state.kind === "error" ? "text-danger" : "text-ink-3")}>
      {text}
    </p>
  );
}
